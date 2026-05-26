import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildGpsEraseRangeEdits,
  collectGpsRouteSegments,
  degreesToSemicircles,
} from "../../src/editor";
import {
  parseFitDocument,
  writeFitDocument,
} from "../../src/fit";
import { attachScreenshot } from "./helpers";

test.use({ locale: "en-US", timezoneId: "Europe/Kyiv" });

const fixturePath = path.join(process.cwd(), "tests/fixtures/Activity.fit");

async function buildActivityWithBoundedGpsGap() {
  const originalFile = await readFile(fixturePath);
  const originalDocument = parseFitDocument(
    originalFile.buffer.slice(
      originalFile.byteOffset,
      originalFile.byteOffset + originalFile.byteLength,
    ),
    "Activity.fit",
  );
  const segment = collectGpsRouteSegments(originalDocument).find(
    (currentSegment) => currentSegment.length >= 14,
  );
  if (!segment) {
    throw new Error("Activity fixture does not have enough GPS points for a bounded gap.");
  }

  const normalizedRouteEdits = segment.flatMap((point, index) => {
    const record = originalDocument.messages.find(
      (message) => message.id === point.recordId,
    );
    const latitude = record?.fields.find((field) => field.name === "position_lat");
    const longitude = record?.fields.find((field) => field.name === "position_long");
    if (!latitude || !longitude) {
      return [];
    }

    const nextLatitude = degreesToSemicircles(50 + index * 0.0001);
    const nextLongitude = degreesToSemicircles(30 + index * 0.0001);
    return [
      {
        messageId: record.id,
        fieldId: latitude.id,
        fieldNumber: latitude.number,
        value: nextLatitude,
      },
      {
        messageId: record.id,
        fieldId: longitude.id,
        fieldNumber: longitude.number,
        value: nextLongitude,
      },
    ];
  });

  const start = segment[1200];
  const end = segment[1600];
  if (!start || !end) {
    throw new Error("Activity fixture GPS segment is too short for the bounded gap scenario.");
  }

  const eraseEdits = buildGpsEraseRangeEdits(
    originalDocument,
    start.recordId,
    end.recordId,
  );
  if (eraseEdits.length === 0) {
    throw new Error("Could not build bounded GPS gap fixture edits.");
  }

  return Buffer.from(
    new Uint8Array(
      writeFitDocument(originalDocument, {
        fieldEdits: [...normalizedRouteEdits, ...eraseEdits],
      }),
    ),
  );
}

test("map is primary and the stripped GPS chrome stays absent", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(fixturePath);

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await expect(page.getByRole("button", { name: "View", exact: true })).toHaveCount(0);
  await expect(page.getByText("GPS repair")).toHaveCount(0);

  const workspace = page.getByRole("region", { name: "GPS repair workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace.locator("canvas")).toHaveCount(1);
  await attachScreenshot(page, testInfo, "gps-map-loaded");

  await expect(page.getByRole("button", { name: "Erase GPS" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add GPS" })).toHaveCount(0);
  const editGpsButton = page.getByRole("button", { name: "Edit GPS" });
  await expect(editGpsButton).toBeVisible();
  await expect(editGpsButton).toHaveAttribute("aria-pressed", "false");
  await editGpsButton.click();
  await expect(page.getByRole("button", { name: "View GPS" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Drag GPS points to edit the route")).toBeVisible();
  await attachScreenshot(page, testInfo, "gps-edit-mode");

  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: "Edit GPS" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await expect(page.getByRole("dialog", { name: "Messages" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Message list" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add message" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select" })).toHaveCount(0);

  const fitMessages = page.getByRole("region", { name: "FIT messages" });
  await expect(fitMessages).toBeVisible();
  await expect(fitMessages.getByRole("heading", { name: "Messages" })).toBeVisible();
  await fitMessages.getByRole("button", { name: "Show messages" }).click();
  await expect(fitMessages.getByText("Session", { exact: true }).first()).toBeVisible();
  await expect(fitMessages.getByText("Record", { exact: true }).first()).toBeVisible();
  await attachScreenshot(page, testInfo, "fit-message-groups");

  const legend = page.getByRole("list", { name: "Map legend" });
  await expect(legend).toBeVisible();
  const legendItems = legend.getByRole("listitem");
  await expect(legendItems).toHaveCount(1);
  await expect(legendItems.nth(0)).toContainText("GPS route");

  await expect(page.getByRole("region", { name: "GPS gaps" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "GPS gaps" })).toHaveCount(0);

  await expect(page.getByText("known points")).toHaveCount(0);
  await expect(page.getByText("preview points")).toHaveCount(0);

  const attributionControl = workspace.locator(".maplibregl-ctrl-attrib");
  await expect(attributionControl).toBeVisible();
  await expect(attributionControl).toHaveAttribute("open", "");

  await expect(page.getByRole("button", { name: /^Spans/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Preview repair$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Cancel preview$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Apply preview$/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Repair span list" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Selected span records" })).toHaveCount(0);
});

test("edit gps is available for bounded map gaps", async ({
  page,
}, testInfo) => {
  const boundedGapFixture = await buildActivityWithBoundedGpsGap();

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "Activity-bounded-gap.fit",
    mimeType: "application/octet-stream",
    buffer: boundedGapFixture,
  });

  await expect(page.getByText("Activity-bounded-gap.fit")).toBeVisible();
  const workspace = page.getByRole("region", { name: "GPS repair workspace" });
  await expect(workspace).toBeVisible();
  await attachScreenshot(page, testInfo, "gps-bounded-gap-loaded");

  const editGpsButton = page.getByRole("button", { name: "Edit GPS" });
  await expect(editGpsButton).toBeEnabled();
  await editGpsButton.click();
  await expect(page.getByRole("button", { name: "View GPS" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Drag GPS points to edit the route")).toBeVisible();
  await expect(page.getByTestId("map-gap-line")).toHaveCount(0);
  await attachScreenshot(page, testInfo, "gps-edit-bounded-gap");
});

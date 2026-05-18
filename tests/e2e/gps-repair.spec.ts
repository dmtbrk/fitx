import { expect, test } from "@playwright/test";
import path from "node:path";
import { closeMessages, openMessages } from "./helpers";

test("map is primary and messages open only from the activity menu", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  const workspace = page.getByRole("region", { name: "GPS repair workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Message list" })).toHaveCount(0);
  const legend = page.getByRole("list", { name: "Map legend" });
  await expect(legend).toBeVisible();
  const legendItems = legend.getByRole("listitem");
  await expect(legendItems).toHaveCount(3);
  await expect(legendItems.nth(0)).toContainText("Known");
  await expect(legendItems.nth(1)).toContainText("Gap");
  await expect(legendItems.nth(2)).toContainText("Preview");
  const attributionControl = workspace.locator(".maplibregl-ctrl-attrib");
  await expect(attributionControl).toBeVisible();
  await expect(attributionControl).toHaveAttribute("open", "");

  const repairDisclosure = page.getByRole("button", { name: /^Spans/ });
  await expect(repairDisclosure).toHaveAttribute("aria-expanded", "false");
  await repairDisclosure.click();
  await expect(page.getByRole("region", { name: "Repair span list" })).toBeVisible();

  const selectedRecordsSection = page.getByRole("region", {
    name: "Selected span records",
  });
  const selectedRecordsDisclosure = selectedRecordsSection.getByRole("button", {
    name: /^Records/,
  });
  await expect(selectedRecordsDisclosure).toHaveAttribute("aria-expanded", "false");
  await selectedRecordsDisclosure.click();
  await expect(selectedRecordsDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(
    selectedRecordsSection.getByText("Select a repairable span to inspect its records."),
  ).toBeVisible();

  await openMessages(page);

  const messageList = page.getByRole("region", { name: "Message list" });
  await expect(messageList).toBeVisible();
  await closeMessages(page);
  await expect(workspace).toBeVisible();
});

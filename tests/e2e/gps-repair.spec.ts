import { expect, test } from "@playwright/test";
import path from "node:path";

test("map is primary and the stripped GPS chrome stays absent", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await expect(page.getByRole("button", { name: "View", exact: true })).toHaveCount(0);
  await expect(page.getByText("GPS repair")).toHaveCount(0);

  const workspace = page.getByRole("region", { name: "GPS repair workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace.locator("canvas")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Messages" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Message list" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add message" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select" })).toHaveCount(0);

  const legend = page.getByRole("list", { name: "Map legend" });
  await expect(legend).toBeVisible();
  const legendItems = legend.getByRole("listitem");
  await expect(legendItems).toHaveCount(3);
  await expect(legendItems.nth(0)).toContainText("Known");
  await expect(legendItems.nth(1)).toContainText("Gap");
  await expect(legendItems.nth(2)).toContainText("Preview");

  await expect(page.getByText("known points")).toHaveCount(0);
  await expect(page.getByText("gaps")).toHaveCount(0);
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

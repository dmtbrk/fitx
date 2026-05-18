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
  const repairDisclosure = page.getByRole("button", { name: /Repair spans/ });
  await expect(repairDisclosure).toHaveAttribute("aria-expanded", "false");
  await repairDisclosure.click();
  await expect(page.getByRole("region", { name: "Repair span list" })).toBeVisible();

  await openMessages(page);

  const messageList = page.getByRole("region", { name: "Message list" });
  await expect(messageList).toBeVisible();
  await closeMessages(page);
  await expect(workspace).toBeVisible();
});

import { expect, test } from "@playwright/test";
import path from "node:path";

test("map repair workspace opens outside the virtualized message list", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  const messageList = page.getByRole("region", { name: "Message list" });
  await expect(messageList).toBeVisible();

  await page.getByRole("button", { name: "Map repair" }).click();

  const workspace = page.getByRole("region", { name: "GPS repair workspace" });
  await expect(workspace).toBeVisible();
  await expect(workspace.locator("canvas")).toHaveCount(1);
  await expect(messageList).toBeVisible();
  await expect(
    workspace.evaluate((element) =>
      element.contains(document.querySelector('[aria-label="Message list"]')),
    ),
  ).resolves.toBe(false);
});

import { expect, test } from "@playwright/test";
import path from "node:path";
import { closeMessages, openMessages } from "./helpers";

test("selection mode focuses the first checkbox and returns focus to Select when cleared", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await openMessages(page);
  await page.getByRole("button", { name: "Select" }).click();

  const firstCheckbox = page.getByRole("checkbox").first();
  await expect(firstCheckbox).toBeFocused();

  await page.getByRole("button", { name: "Clear selection" }).click();

  await expect(page.getByRole("button", { name: "Select" })).toBeFocused();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("selection is unavailable when the active filter has no visible messages", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await openMessages(page);
  await page.getByRole("button", { name: /^Issues\s*0$/ }).click();

  await expect(page.getByText("No messages match this filter.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select" })).toBeDisabled();
});

test("bulk delete confirms cancel and accept paths", async ({ page }) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await openMessages(page);
  const cards = page.getByTestId("message-card");
  const firstCard = cards.nth(0);
  const secondCard = cards.nth(1);
  const firstCardId = await firstCard.getAttribute("data-message-id");
  const secondCardId = await secondCard.getAttribute("data-message-id");

  await page.getByRole("button", { name: "Select" }).click();
  await firstCard.getByRole("checkbox").check();
  await secondCard.getByRole("checkbox").check();
  await expect(page.getByText("2 selected")).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete 2 selected messages");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Delete selected" }).click();

  await expect(page.getByText("2 selected")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear selection" })).toBeVisible();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(2);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete 2 selected messages");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Delete selected" }).click();

  await expect(page.getByRole("button", { name: "Select" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Clear selection" })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);

  if (firstCardId) {
    await expect(
      page.locator(`[data-testid="message-card"][data-message-id="${firstCardId}"]`),
    ).toHaveCount(0);
  }
  if (secondCardId) {
    await expect(
      page.locator(`[data-testid="message-card"][data-message-id="${secondCardId}"]`),
    ).toHaveCount(0);
  }
});

test("show issues exits selection mode before switching to the Issues filter", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await openMessages(page);
  await page.getByRole("button", { name: /^record\d+$/ }).first().click();

  const editButton = page.getByRole("button", { name: "Edit record" }).first();
  await editButton.click();
  await page.getByLabel("heart_rate value 1").fill("300");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("1 issue")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Issues\s*1$/ })).toBeVisible();
  await page.getByRole("button", { name: "Select" }).click();
  await expect(page.getByRole("checkbox").first()).toBeFocused();

  await closeMessages(page);
  await page.getByText("1 issue").click();
  const issuesDialog = page.getByRole("dialog", { name: "Issues" });
  await expect(issuesDialog).toBeVisible();
  await issuesDialog.getByRole("button", { name: "Show" }).click();

  await expect(page.getByRole("button", { name: "Select" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Issues\s*1$/ })).toBeVisible();
});

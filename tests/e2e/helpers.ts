import type { Page } from "@playwright/test";

export async function openMessages(page: Page) {
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("menuitem", { name: "Messages" }).click();
}

export async function closeMessages(page: Page) {
  const messagesDialog = page.getByRole("dialog", { name: "Messages" });
  await messagesDialog.getByRole("button", { name: "Close" }).click();
}

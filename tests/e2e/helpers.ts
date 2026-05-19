import type { Page } from "@playwright/test";

export async function openMessages(page: Page) {
  throw new Error("Messages launcher is removed in the current UI.");
}

export async function closeMessages(page: Page) {
  throw new Error("Messages dialog is unreachable without the launcher.");
}

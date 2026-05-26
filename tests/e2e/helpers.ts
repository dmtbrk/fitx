import type { Page, TestInfo } from "@playwright/test";

export async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, {
    path,
    contentType: "image/png",
  });
}

export async function openMessages(page: Page) {
  throw new Error("Messages launcher is removed in the current UI.");
}

export async function closeMessages(page: Page) {
  throw new Error("Messages dialog is unreachable without the launcher.");
}

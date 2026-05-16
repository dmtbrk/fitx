import { expect, test } from "@playwright/test";
import path from "node:path";

test("record filter does not overlap virtualized message cards", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: /^record\d+$/ }).click();

  const cards = page.getByTestId("message-card");
  await expect(cards.first()).toHaveAttribute("data-message-name", "record");
  const firstCard = cards.first();
  const firstLabel = firstCard.locator("dt").first();
  const firstValue = firstCard.locator("dd").first();

  await expect.poll(async () => {
    const [labelBox, valueBox] = await Promise.all([
      firstLabel.boundingBox(),
      firstValue.boundingBox(),
    ]);

    if (!labelBox || !valueBox) {
      return Number.NaN;
    }

    return Math.abs(labelBox.x - valueBox.x);
  }, {
    message: "field labels and values should share the same left edge",
    timeout: 5000,
  }).toBeLessThanOrEqual(2);

  await expect.poll(async () => {
    return page.getByTestId("message-card").evaluateAll((elements) => {
      const rects = elements.slice(0, 8).map((element) => element.getBoundingClientRect());
      return rects.every((rect, index) => index === 0 || rect.top >= rects[index - 1].bottom - 0.5);
    });
  }, {
    message: "visible virtualized message cards should not overlap after filtering",
    timeout: 5000
  }).toBe(true);
});

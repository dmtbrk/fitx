import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseFitDocument } from "../../src/fit";

test("message toolbar is collapsed by default and header stays file-focused", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: "Add message" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^record\s*\d+$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Issues\s*\d+$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Edited\s*\d+$/ })).toHaveCount(0);
});

test("collapsed filter summary remains visible after add mode ends", async ({
  page,
}) => {
  const fixturePath = path.join(process.cwd(), "tests/fixtures/Activity.fit");
  const originalFile = await readFile(fixturePath);
  const originalDocument = parseFitDocument(
    originalFile.buffer.slice(
      originalFile.byteOffset,
      originalFile.byteOffset + originalFile.byteLength,
    ),
  );

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: /^record\d+$/ }).click();
  await page.getByRole("button", { name: "Filters" }).click();

  const recordSummary = page.getByRole("button", { name: /^record\s*\d+$/ });
  await expect(recordSummary).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters" })).toHaveAttribute(
    "data-active",
    "true",
  );

  const insertTargetName = `Insert message between ${originalDocument.messages[0].messageName} and ${originalDocument.messages[1].messageName}`;
  await page.getByRole("button", { name: "Add message" }).click();
  await expect(page.getByRole("button", { name: "Cancel add message" })).toBeVisible();
  await expect(recordSummary).toHaveCount(0);
  await page.getByRole("button", { name: insertTargetName }).click();

  const insertDialog = page.getByRole("dialog", { name: new RegExp(insertTargetName) });
  await expect(insertDialog).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(recordSummary).toBeVisible();
  await expect(page.getByRole("button", { name: "Add message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters" })).toHaveAttribute(
    "data-active",
    "true",
  );
});

test("collapsed filter summary restores focus to the disclosure button", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: /^record\d+$/ }).click();
  await page.getByRole("button", { name: "Filters" }).click();

  const recordSummary = page.getByRole("button", { name: /^record\s*\d+$/ });
  await expect(recordSummary).toBeVisible();

  await recordSummary.click();

  const filtersButton = page.getByRole("button", { name: "Filters" });
  await expect(filtersButton).toBeFocused();
  await expect(filtersButton).toHaveAttribute("aria-expanded", "true");
});

test("expanded filters stay open and disable chips during add mode", async ({ page }) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: "Filters" }).click();

  const recordFilter = page.getByRole("button", { name: /^record\d+$/ }).first();
  const issuesFilter = page.getByRole("button", { name: /^Issues\s*\d+$/ });
  const editedFilter = page.getByRole("button", { name: /^Edited\s*\d+$/ });

  await recordFilter.click();
  await expect(page.getByRole("button", { name: "Filters" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(recordFilter).toBeVisible();

  await page.getByRole("button", { name: "Add message" }).click();

  await expect(page.getByRole("button", { name: "Cancel add message" })).toBeVisible();
  await expect(recordFilter).toBeDisabled();
  await expect(issuesFilter).toBeDisabled();
  await expect(editedFilter).toBeDisabled();
});

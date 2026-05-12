import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseFitDocument } from "../../src/fit";

test("message editor stages cancel and apply behavior", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: /^record\d+$/ }).click();

  const editButton = page.getByRole("button", { name: "Edit record" }).first();
  const firstEditorInput = page.getByTestId("message-editor-input").first();
  await editButton.click();
  await expect(page.getByRole("dialog", { name: /record ·/ })).toBeVisible();
  await expect(firstEditorInput).toBeFocused();
  await firstEditorInput.fill("127");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(editButton).toBeFocused();

  await expect(page.getByText("1 edit")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Edited0$/ })).toBeVisible();

  await editButton.click();
  await page.getByLabel("heart_rate value 1").fill("127");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("1 edit")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edited1$/ })).toBeVisible();

  await page.getByRole("button", { name: /^Edited1$/ }).click();
  await expect(page.getByTestId("message-card").first()).toHaveAttribute("data-edited", "true");

  await editButton.click();
  await expect(page.getByLabel("heart_rate value 1")).toHaveValue("127");
  await page.getByLabel("speed value 1").fill("1001");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("2 edits")).toBeVisible();
  await editButton.click();
  await expect(page.getByLabel("heart_rate value 1")).toHaveValue("127");
  await expect(page.getByLabel("speed value 1")).toHaveValue("1001");
  await page.getByLabel("heart_rate value 1").fill("126");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("1 edit")).toBeVisible();
  await editButton.click();
  await page.getByLabel("heart_rate value 1").fill("300");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("1 issue")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Issues1$/ })).toBeVisible();

  await page.getByRole("button", { name: "Download" }).click();
  const issuesDialog = page.getByRole("dialog", { name: "Issues" });
  await expect(issuesDialog).toBeVisible();
  await expect(issuesDialog.locator("article")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Download anyway" })).toHaveCount(0);
});

test("duplicate message opens the editor, cancels without committing, and exports after apply", async ({ page }) => {
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

  const sourceCard = page.getByTestId("message-card").first();
  const actionButton = sourceCard.getByRole("button", { name: /actions$/ });
  const duplicateTrigger = page.getByRole("menuitem", { name: "Duplicate message" });

  await actionButton.click();
  await duplicateTrigger.click();

  const sourceMessageName = await sourceCard.getAttribute("data-message-name");
  expect(sourceMessageName).toBeTruthy();
  const duplicateDialog = page.getByRole("dialog", { name: new RegExp(sourceMessageName ?? "") });
  await expect(duplicateDialog).toBeVisible();
  await expect(duplicateDialog.getByText("Add raw field")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("message-card").filter({ hasText: sourceMessageName ?? "" })).toHaveCount(1);

  await actionButton.click();
  await duplicateTrigger.click();
  await expect(duplicateDialog).toBeVisible();
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("1 edit")).toBeVisible();
  const duplicatedCards = page.getByTestId("message-card").filter({ hasText: sourceMessageName ?? "" });
  await expect(duplicatedCards).toHaveCount(2);

  const duplicatedEditButton = duplicatedCards.nth(1).getByRole("button", { name: /^Edit / });
  await duplicatedEditButton.click();
  await expect(duplicateDialog).toBeVisible();
  await expect(duplicateDialog.getByText("Add raw field")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();

  const exportedFile = await readFile(downloadedPath!);
  const exportedDocument = parseFitDocument(
    exportedFile.buffer.slice(
      exportedFile.byteOffset,
      exportedFile.byteOffset + exportedFile.byteLength,
    ),
  );

  expect(exportedDocument.messages).toHaveLength(originalDocument.messages.length + 1);
  expect(exportedDocument.messages[0]?.messageName).toBe(sourceMessageName);
  expect(exportedDocument.messages[1]?.messageName).toBe(sourceMessageName);
  expect(
    exportedDocument.messages.slice(2).map((message) => message.messageName),
  ).toEqual(originalDocument.messages.slice(1).map((message) => message.messageName));
});

test("raw add message cancels without committing and then inserts between messages", async ({ page }) => {
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
  const insertTargetName = `Insert message between ${originalDocument.messages[0].messageName} and ${originalDocument.messages[1].messageName}`;
  await page.getByRole("button", { name: "Add message" }).click();
  const scroll = page.getByTestId("message-scroll");
  await scroll.evaluate((element) => {
    element.scrollTo({ top: 320 });
  });
  await page
    .getByRole("button", {
      name: insertTargetName,
    })
    .click();

  const insertDialog = page.getByRole("dialog", { name: new RegExp(insertTargetName) });
  await expect(insertDialog).toBeVisible();
  await page.getByLabel("Message number").fill("901");
  await page.getByLabel("Message label").fill("raw_label");
  await page.getByLabel("Field 1 number").fill("7");
  await page.getByLabel("Field 1 name").fill("raw_value");
  await page.getByLabel("Field 1 base type").selectOption("uint8");
  await page.getByLabel("Field 1 size").fill("1");
  await page.getByLabel("Field 1 values").fill("42");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByText("1 edit")).toHaveCount(0);
  await expect(page.getByTestId("message-card").filter({ hasText: "raw_label" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add message" }).click();
  await page.getByRole("button", { name: insertTargetName }).click();
  await expect(insertDialog).toBeVisible();
  await page.getByLabel("Message number").fill("901");
  await page.getByLabel("Message label").fill("raw_label");
  await page.getByLabel("Field 1 number").fill("7");
  await page.getByLabel("Field 1 name").fill("raw_value");
  await page.getByLabel("Field 1 base type").selectOption("uint8");
  await page.getByLabel("Field 1 size").fill("1");
  await page.getByLabel("Field 1 values").fill("42");
  await page.getByRole("button", { name: "Add message" }).click();

  await expect(page.getByText("1 edit")).toBeVisible();
  const rawCards = page.getByTestId("message-card");
  await page.getByTestId("message-scroll").evaluate((element) => {
    element.scrollTo({ top: 0 });
  });
  await expect.poll(async () => {
    return rawCards.evaluateAll((elements) =>
      elements
        .slice(0, 3)
        .map((element) => element.getAttribute("data-message-name")),
    );
  }, {
    message: "raw insert should appear between the first two messages",
    timeout: 5000,
  }).toEqual([
    originalDocument.messages[0].messageName,
    "raw_label",
    originalDocument.messages[1].messageName,
  ]);

  const secondInsertTargetName = `Insert message between ${originalDocument.messages[0].messageName} and raw_label`;
  await page.getByRole("button", { name: "Add message" }).click();
  await page.getByRole("button", { name: secondInsertTargetName }).click();
  const secondInsertDialog = page.getByRole("dialog", { name: new RegExp(secondInsertTargetName) });
  await expect(secondInsertDialog).toBeVisible();
  await page.getByLabel("Message number").fill("900");
  await page.getByLabel("Message label").fill("raw_label_0");
  await page.getByLabel("Field 1 number").fill("6");
  await page.getByLabel("Field 1 name").fill("raw_value_0");
  await page.getByLabel("Field 1 base type").selectOption("uint8");
  await page.getByLabel("Field 1 size").fill("1");
  await page.getByLabel("Field 1 values").fill("41");
  await page.getByRole("button", { name: "Add message" }).click();

  await expect(page.getByText("2 edits")).toBeVisible();
  await page.getByTestId("message-scroll").evaluate((element) => {
    element.scrollTo({ top: 0 });
  });
  await expect.poll(async () => {
    return rawCards.evaluateAll((elements) =>
      elements
        .slice(0, 4)
        .map((element) => element.getAttribute("data-message-name")),
    );
  }, {
    message: "second raw insert should stay anchored between original messages",
    timeout: 5000,
  }).toEqual([
    originalDocument.messages[0].messageName,
    "raw_label_0",
    "raw_label",
    originalDocument.messages[1].messageName,
  ]);

  const thirdInsertTargetName = "Insert message between raw_label_0 and raw_label";
  await page.getByRole("button", { name: "Add message" }).click();
  await page.getByRole("button", { name: thirdInsertTargetName }).click();
  const thirdInsertDialog = page.getByRole("dialog", { name: new RegExp(thirdInsertTargetName) });
  await expect(thirdInsertDialog).toBeVisible();
  await page.getByLabel("Message number").fill("902");
  await page.getByLabel("Message label").fill("raw_label_mid");
  await page.getByLabel("Field 1 number").fill("8");
  await page.getByLabel("Field 1 name").fill("raw_value_mid");
  await page.getByLabel("Field 1 base type").selectOption("uint8");
  await page.getByLabel("Field 1 size").fill("1");
  await page.getByLabel("Field 1 values").fill("43");
  await page.getByRole("button", { name: "Add message" }).click();

  await expect(page.getByText("3 edits")).toBeVisible();
  await page.getByTestId("message-scroll").evaluate((element) => {
    element.scrollTo({ top: 0 });
  });
  await expect.poll(async () => {
    return rawCards.evaluateAll((elements) =>
      elements
        .slice(0, 5)
        .map((element) => element.getAttribute("data-message-name")),
    );
  }, {
    message: "third raw insert should preserve order between staged messages",
    timeout: 5000,
  }).toEqual([
    originalDocument.messages[0].messageName,
    "raw_label_0",
    "raw_label_mid",
    "raw_label",
    originalDocument.messages[1].messageName,
  ]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();

  const exportedFile = await readFile(downloadedPath!);
  const exportedDocument = parseFitDocument(
    exportedFile.buffer.slice(
      exportedFile.byteOffset,
      exportedFile.byteOffset + exportedFile.byteLength,
    ),
  );

  expect(exportedDocument.messages.map((message) => message.messageName)).toEqual([
    originalDocument.messages[0].messageName,
    "unknown_message_900",
    "unknown_message_902",
    "unknown_message_901",
    ...originalDocument.messages.slice(1).map((message) => message.messageName),
  ]);
  expect(exportedDocument.header.headerCrcValid).toBe(true);
  expect(exportedDocument.checksum.fileCrcValid).toBe(true);
});

test("raw add message validation issues block commit", async ({ page }) => {
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
  const insertTargetName = `Insert message between ${originalDocument.messages[0].messageName} and ${originalDocument.messages[1].messageName}`;
  await page.getByRole("button", { name: "Add message" }).click();
  const scroll = page.getByTestId("message-scroll");
  await scroll.evaluate((element) => {
    element.scrollTo({ top: 320 });
  });
  await page
    .getByRole("button", {
      name: insertTargetName,
    })
    .click();

  const insertDialog = page.getByRole("dialog", { name: new RegExp(insertTargetName) });
  await expect(insertDialog).toBeVisible();
  await page.getByLabel("Message number").fill("70000");
  await page.getByLabel("Message label").fill("raw_label");
  await page.getByLabel("Field 1 number").fill("7");
  await page.getByLabel("Field 1 name").fill("raw_value");
  await page.getByLabel("Field 1 base type").selectOption("uint8");
  await page.getByLabel("Field 1 size").fill("1");
  await page.getByLabel("Field 1 values").fill("42");
  await page.getByRole("button", { name: "Add message" }).click();

  await expect(page.getByText("Message number must be between 0 and 65534.")).toBeVisible();
  await expect(page.getByText("1 edit")).toHaveCount(0);
  await expect(page.getByTestId("message-card").filter({ hasText: "raw_label" })).toHaveCount(0);
});

test("message deletion confirms, updates counts, restores focus, and exports without the deleted message", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();

  const deletedCard = page.getByTestId("message-card").first();
  const deletedMessageName = await deletedCard.getAttribute("data-message-name");
  expect(deletedMessageName).toBeTruthy();
  const actionButton = page.getByRole("button", { name: /actions$/ }).first();
  const deleteTrigger = page.getByRole("menuitem", { name: "Delete message" });
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete ");
    await dialog.accept();
  });
  await actionButton.click();
  await deleteTrigger.click();

  await expect(page.getByTestId("message-card").filter({ hasText: deletedMessageName ?? "" })).toHaveCount(0);
  await expect(page.getByLabel("Message list")).toBeFocused();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();

  const exportedFile = await readFile(downloadedPath!);
  const exportedDocument = parseFitDocument(
    exportedFile.buffer.slice(
      exportedFile.byteOffset,
      exportedFile.byteOffset + exportedFile.byteLength,
    ),
  );

  expect(
    exportedDocument.messages.map((message) => message.messageName),
  ).not.toContain(deletedMessageName);
  await expect(page.getByRole("dialog", { name: "Issues" })).toHaveCount(0);
});

test("message editor preserves scroll and keeps focus within the loaded view", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "tests/fixtures/Activity.fit"));

  await expect(page.getByText("Activity.fit")).toBeVisible();
  await page.getByRole("button", { name: /^record\d+$/ }).click();

  const scroll = page.getByTestId("message-scroll");
  await scroll.evaluate((element) => {
    element.scrollTo({ top: element.scrollHeight / 2 });
  });
  await expect.poll(async () => {
    return scroll.evaluate((element) => element.scrollTop);
  }, {
    message: "message scroll should move before editing",
    timeout: 5000,
  }).toBeGreaterThan(0);

  const editButton = page.getByRole("button", { name: "Edit record" }).first();
  const firstEditorInput = page.getByTestId("message-editor-input").first();

  await editButton.click();
  await expect(page.getByRole("dialog", { name: /record ·/ })).toBeVisible();
  const originalValue = await firstEditorInput.inputValue();
  const nextValue = originalValue === "127" ? "126" : "127";
  await firstEditorInput.fill(nextValue);
  await page.getByRole("button", { name: "Apply" }).click();

  await expect.poll(async () => {
    return scroll.evaluate((element) => element.scrollTop);
  }, {
    message: "scroll position should stay away from the top after applying an edit",
    timeout: 5000,
  }).toBeGreaterThan(0);
  await expect.poll(async () => {
    return page.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    );
  }, {
    message: "focus should remain inside the loaded view after applying an edit",
    timeout: 5000,
  }).toMatch(/^(Edit record|Message list)$/);
  await expect(page.getByRole("button", { name: "Upload" })).not.toBeFocused();

  await page.getByRole("button", { name: "Edited" }).click();
  await expect.poll(async () => {
    return scroll.evaluate((element) => element.scrollTop);
  }, {
    message: "changing the filter should reset the message list scroll",
    timeout: 5000,
  }).toBe(0);

  const editedEditButton = page.getByRole("button", { name: "Edit record" }).first();
  const revertedInput = page.getByTestId("message-editor-input").first();
  await editedEditButton.click();
  await expect(page.getByRole("dialog", { name: /record ·/ })).toBeVisible();
  await revertedInput.fill(originalValue);
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByLabel("Message list")).toBeFocused();
  await expect(page.getByRole("button", { name: "Upload" })).not.toBeFocused();
});

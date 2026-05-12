import { describe, expect, it } from "vitest";
import {
  buildEditOverlay,
  collectEditedMessageIdsFromOverlay,
  collectDeletedMessageIds,
  collectInsertedMessages,
  countEditOverlayEdits,
  countEditedMessagesFromOverlay,
  flattenEditOverlay,
  getEditsForMessage,
  insertDuplicateMessage,
  insertInsertedMessage,
  insertInsertedMessageBefore,
  isMessageDeleted,
  markMessageDeleted,
  replaceMessageEdits,
} from "./editOverlay";
import type { FitDataRecord, FitField, FitFieldValueEdit } from "../fit";

describe("fit editor overlay", () => {
  it("round-trips flat edits in stable message-local order", () => {
    const edits: FitFieldValueEdit[] = [
      {
        messageId: "message-1",
        fieldId: "field-a",
        fieldNumber: 1,
        value: 10,
      },
      {
        messageId: "message-1",
        fieldNumber: 2,
        developer: true,
        developerDataIndex: 7,
        value: [1, 2],
      },
      {
        messageId: "message-1",
        fieldNumber: 20,
        added: true,
        fieldName: "added_alpha",
        baseType: 0x02,
        baseTypeName: "uint8",
        size: 1,
        value: 9,
      },
    ];

    const overlay = buildEditOverlay(edits);

    expect(flattenEditOverlay(overlay)).toEqual(edits);
    expect(getEditsForMessage(overlay, "message-1")).toEqual(edits);
    expect(collectEditedMessageIdsFromOverlay(overlay)).toEqual(
      new Set(["message-1"]),
    );
    expect(countEditOverlayEdits(overlay)).toBe(3);
  });

  it("replaces all edits for a message without disturbing other messages", () => {
    const original = buildEditOverlay([
      {
        messageId: "message-1",
        fieldId: "field-a",
        fieldNumber: 1,
        value: 10,
      },
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 2,
        value: 20,
      },
    ]);

    const next = replaceMessageEdits(original, "message-1", [
      {
        messageId: "message-1",
        fieldId: "field-c",
        fieldNumber: 3,
        value: 30,
      },
    ]);

    expect(getEditsForMessage(next, "message-1")).toEqual([
      {
        messageId: "message-1",
        fieldId: "field-c",
        fieldNumber: 3,
        value: 30,
      },
    ]);
    expect(getEditsForMessage(next, "message-2")).toEqual([
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 2,
        value: 20,
      },
    ]);
    expect(flattenEditOverlay(next)).toEqual([
      {
        messageId: "message-1",
        fieldId: "field-c",
        fieldNumber: 3,
        value: 30,
      },
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 2,
        value: 20,
      },
    ]);
    expect(collectEditedMessageIdsFromOverlay(next)).toEqual(
      new Set(["message-1", "message-2"]),
    );
    expect(countEditOverlayEdits(next)).toBe(2);
  });

  it("counts inserted duplicates as one edit and marks the inserted message as edited", () => {
    const overlay = insertDuplicateMessage(
      buildEditOverlay([
        {
          messageId: "message-1",
          fieldId: "field-a",
          fieldNumber: 1,
          value: 10,
        },
      ]),
      {
        id: "duplicate-message-1",
        origin: "duplicate",
        position: {
          afterMessageId: "message-1",
          beforeMessageId: null,
        },
        sourceMessageId: "message-1",
        message: makeMessage("duplicate-message-1"),
      },
    );

    expect(countEditOverlayEdits(overlay)).toBe(2);
    expect(countEditedMessagesFromOverlay(overlay)).toBe(2);
    expect(collectEditedMessageIdsFromOverlay(overlay)).toEqual(
      new Set(["message-1", "duplicate-message-1"]),
    );
    expect(collectInsertedMessages(overlay).has("duplicate-message-1")).toBe(true);
  });

  it("removes an inserted duplicate without creating a phantom deletion marker", () => {
    const original = insertDuplicateMessage(createEmptyEditOverlayForTest(), {
      id: "duplicate-message-1",
      origin: "duplicate",
      position: {
        afterMessageId: "message-1",
        beforeMessageId: null,
      },
      sourceMessageId: "message-1",
      message: makeMessage("duplicate-message-1"),
    });

    const deleted = markMessageDeleted(original, "duplicate-message-1");

    expect(collectInsertedMessages(deleted).has("duplicate-message-1")).toBe(false);
    expect(collectDeletedMessageIds(deleted)).toEqual(new Set());
    expect(countEditOverlayEdits(deleted)).toBe(0);
    expect(collectEditedMessageIdsFromOverlay(deleted)).toEqual(new Set());
  });

  it("removes inserted duplicates when their source message is deleted", () => {
    const original = insertDuplicateMessage(createEmptyEditOverlayForTest(), {
      id: "duplicate-message-1",
      origin: "duplicate",
      position: {
        afterMessageId: "message-1",
        beforeMessageId: null,
      },
      sourceMessageId: "message-1",
      message: makeMessage("duplicate-message-1"),
    });

    const deleted = markMessageDeleted(original, "message-1");

    expect(collectInsertedMessages(deleted).has("duplicate-message-1")).toBe(false);
    expect(collectDeletedMessageIds(deleted)).toEqual(new Set(["message-1"]));
    expect(countEditOverlayEdits(deleted)).toBe(1);
    expect(collectEditedMessageIdsFromOverlay(deleted)).toEqual(
      new Set(["message-1"]),
    );
  });

  it("counts raw inserts as one edit and removes them when their anchor is deleted", () => {
    const original = insertInsertedMessage(createEmptyEditOverlayForTest(), {
      id: "raw-message-1",
      origin: "raw",
      position: {
        afterMessageId: "message-1",
        beforeMessageId: null,
      },
      message: makeMessage("raw-message-1"),
    });

    expect(countEditOverlayEdits(original)).toBe(1);
    expect(collectEditedMessageIdsFromOverlay(original)).toEqual(
      new Set(["raw-message-1"]),
    );

    const deleted = markMessageDeleted(original, "message-1");

    expect(collectInsertedMessages(deleted).has("raw-message-1")).toBe(false);
    expect(countEditOverlayEdits(deleted)).toBe(1);
  });

  it("can insert a staged message before another staged message", () => {
    const withFirstInsert = insertInsertedMessage(createEmptyEditOverlayForTest(), {
      id: "raw-message-1",
      origin: "raw",
      position: {
        afterMessageId: "message-1",
        beforeMessageId: "message-2",
      },
      message: makeMessage("raw-message-1"),
    });
    const withSecondInsert = insertInsertedMessageBefore(
      withFirstInsert,
      {
        id: "raw-message-0",
        origin: "raw",
        position: {
          afterMessageId: "message-1",
          beforeMessageId: "message-2",
        },
        message: makeMessage("raw-message-0"),
      },
      "raw-message-1",
    );

    expect([...collectInsertedMessages(withSecondInsert).keys()]).toEqual([
      "raw-message-0",
      "raw-message-1",
    ]);
  });

  it("removes staged field edits when a message is deleted and counts the deletion once", () => {
    const original = buildEditOverlay([
      {
        messageId: "message-1",
        fieldId: "field-a",
        fieldNumber: 1,
        value: 10,
      },
      {
        messageId: "message-1",
        fieldNumber: 2,
        developer: true,
        developerDataIndex: 7,
        value: [1, 2],
      },
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 3,
        value: 30,
      },
    ]);

    const deleted = markMessageDeleted(original, "message-1");

    expect(getEditsForMessage(deleted, "message-1")).toEqual([]);
    expect(isMessageDeleted(deleted, "message-1")).toBe(true);
    expect(collectDeletedMessageIds(deleted)).toEqual(new Set(["message-1"]));
    expect(flattenEditOverlay(deleted)).toEqual([
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 3,
        value: 30,
      },
    ]);
    expect(collectEditedMessageIdsFromOverlay(deleted)).toEqual(
      new Set(["message-2", "message-1"]),
    );
    expect(countEditOverlayEdits(deleted)).toBe(2);
    expect(countEditedMessagesFromOverlay(deleted)).toBe(2);
  });

  it("keeps developer fields with the same field number distinct", () => {
    const overlay = buildEditOverlay([
      {
        messageId: "message-1",
        fieldNumber: 5,
        developer: true,
        developerDataIndex: 1,
        value: [1],
      },
      {
        messageId: "message-1",
        fieldNumber: 5,
        developer: true,
        developerDataIndex: 2,
        value: [2],
      },
    ]);

    expect(flattenEditOverlay(overlay)).toEqual([
      {
        messageId: "message-1",
        fieldNumber: 5,
        developer: true,
        developerDataIndex: 1,
        value: [1],
      },
      {
        messageId: "message-1",
        fieldNumber: 5,
        developer: true,
        developerDataIndex: 2,
        value: [2],
      },
    ]);
  });

  it("preserves added field order without collapsing entries", () => {
    const overlay = buildEditOverlay([
      {
        messageId: "message-1",
        fieldNumber: 20,
        added: true,
        fieldName: "added_beta",
        baseType: 0x02,
        baseTypeName: "uint8",
        size: 1,
        value: 2,
      },
      {
        messageId: "message-1",
        fieldNumber: 10,
        added: true,
        fieldName: "added_alpha",
        baseType: 0x02,
        baseTypeName: "uint8",
        size: 1,
        value: 1,
      },
    ]);

    expect(getEditsForMessage(overlay, "message-1").map((edit) => edit.fieldNumber)).toEqual([20, 10]);
    expect(flattenEditOverlay(overlay).map((edit) => edit.fieldNumber)).toEqual([20, 10]);
  });
});

function createEmptyEditOverlayForTest() {
  return buildEditOverlay([]);
}

function makeMessage(id: string, fields: readonly FitField[] = []): FitDataRecord {
  return {
    kind: "data",
    id,
    order: 0,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: 20,
    messageName: "record",
    definitionId: "definition-1",
    fields: [...fields],
    span: { start: 0, end: 0 },
  };
}

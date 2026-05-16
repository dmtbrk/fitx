import { describe, expect, it } from "vitest";
import {
  buildEditIssues,
  buildInsertedMessageIssues,
} from "./validation";
import {
  clearDeletedMessageEditor,
  deleteMessageSessionState,
  deleteSelectedMessagesSessionState,
  describeInsertPosition,
  normalizeInsertPosition,
  shouldDownloadImmediately,
} from "./useFitEditorSession";
import {
  buildEditOverlay,
  createEmptyEditOverlay,
  getEditsForMessage,
  insertDuplicateMessage,
  isMessageDeleted,
} from "./editOverlay";
import type { FitDataRecord, FitDocument, FitField, FitFieldValueEdit } from "../fit";

describe("fit editor session issue mapping", () => {
  it("propagates draft export-blocking classification to editor issues", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-percent",
        number: 1,
        name: "percent_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 50,
        rawValue: 50,
        units: "%"
      }),
      makeDataField({
        id: "field-uint8",
        number: 2,
        name: "uint8_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 10,
        rawValue: 10
      })
    ]);

    const edits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldId: "field-percent",
        fieldNumber: 1,
        value: 101
      },
      {
        messageId: message.id,
        fieldId: "field-uint8",
        fieldNumber: 2,
        value: 300
      }
    ];

    const issues = buildEditIssues(makeDocument([message]), edits);

    expect(issues).toEqual([
      expect.objectContaining({
        messageId: message.id,
        title: "percent_field has invalid data",
        exportBlocking: false,
        description: "percent_field must be between 0 and 100."
      }),
      expect.objectContaining({
        messageId: message.id,
        title: "uint8_field has invalid data",
        exportBlocking: true,
        description: "uint8_field must be between 0 and 255."
      })
    ]);
  });

  it("propagates inserted duplicate validation issues to editor issues", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-uint8",
        number: 2,
        name: "uint8_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 300,
        rawValue: 300
      })
    ]);

    const issues = buildInsertedMessageIssues([
      {
        id: message.id,
        origin: "duplicate",
        position: {
          afterMessageId: "source-message",
          beforeMessageId: null,
        },
        sourceMessageId: "source-message",
        message,
      },
    ]);

    expect(issues).toEqual([
      expect.objectContaining({
        messageId: message.id,
        title: "uint8_field has invalid data",
        exportBlocking: true,
        description: "uint8_field must be between 0 and 255."
      })
    ]);
  });

  it("deletes the selected message, clears the editor, and removes staged edits", () => {
    const messageId = "message-1";
    const overlay = buildEditOverlay([
      {
        messageId,
        fieldId: "field-a",
        fieldNumber: 1,
        value: 10,
      },
      {
        messageId,
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

    const next = deleteMessageSessionState(overlay, messageId, messageId);

    expect(clearDeletedMessageEditor(messageId, messageId)).toBeNull();
    expect(clearDeletedMessageEditor("message-2", messageId)).toBe("message-2");
    expect(isMessageDeleted(next.editOverlay, messageId)).toBe(true);
    expect(getEditsForMessage(next.editOverlay, messageId)).toEqual([]);
    expect(getEditsForMessage(next.editOverlay, "message-2")).toEqual([
      {
        messageId: "message-2",
        fieldId: "field-b",
        fieldNumber: 3,
        value: 30,
      },
    ]);
    expect(next.editingMessageId).toBeNull();
  });

  it("bulk deletes selected messages without re-deleting dependent inserts", () => {
    const sourceMessage = makeMessage("message-1", "record", []);
    const duplicateMessage = makeMessage("duplicate-message-1", "record", []);
    const overlay = insertDuplicateMessage(createEmptyEditOverlay(), {
      id: duplicateMessage.id,
      origin: "duplicate",
      position: {
        afterMessageId: sourceMessage.id,
        beforeMessageId: null,
      },
      sourceMessageId: sourceMessage.id,
      message: duplicateMessage,
    });

    const next = deleteSelectedMessagesSessionState(overlay, null, [
      sourceMessage.id,
      duplicateMessage.id,
    ]);

    expect(next.editOverlay.deletedMessageIds).toEqual(
      new Set([sourceMessage.id]),
    );
    expect(next.editOverlay.insertedMessages).toEqual(new Map());
    expect(next.editingMessageId).toBeNull();
  });

  it("describes raw insert positions before, between, and after loaded messages", () => {
    const document = makeDocument([
      makeMessage("message-1", "file_id"),
      makeMessage("message-2", "record"),
      makeMessage("message-3", "session"),
    ]);

    expect(
      describeInsertPosition(document, {
        afterMessageId: null,
        beforeMessageId: document.messages[0].id,
      }),
    ).toBe("before file_id");
    expect(
      describeInsertPosition(document, {
        afterMessageId: document.messages[1].id,
        beforeMessageId: document.messages[2].id,
      }),
    ).toBe("between record and session");
    expect(
      describeInsertPosition(document, {
        afterMessageId: document.messages[2].id,
        beforeMessageId: null,
      }),
    ).toBe("after session");
  });

  it("normalizes visible insert positions around staged messages to original document anchors", () => {
    const document = makeDocument([
      makeMessage("message-1", "file_id"),
      makeMessage("message-2", "record"),
      makeMessage("message-3", "session"),
    ]);
    const visibleMessages = [
      document.messages[0],
      makeMessage("raw-901", "raw_label"),
      document.messages[1],
      makeMessage("raw-902", "raw_label_2"),
      document.messages[2],
    ];

    expect(
      normalizeInsertPosition(document, visibleMessages, {
        afterMessageId: document.messages[0].id,
        beforeMessageId: "raw-901",
      }),
    ).toEqual({
      afterMessageId: document.messages[0].id,
      beforeMessageId: document.messages[1].id,
    });
    expect(
      normalizeInsertPosition(document, visibleMessages, {
        afterMessageId: "raw-901",
        beforeMessageId: document.messages[1].id,
      }),
    ).toEqual({
      afterMessageId: document.messages[0].id,
      beforeMessageId: document.messages[1].id,
    });
    expect(
      normalizeInsertPosition(document, visibleMessages, {
        afterMessageId: "raw-902",
        beforeMessageId: document.messages[2].id,
      }),
    ).toEqual({
      afterMessageId: document.messages[1].id,
      beforeMessageId: document.messages[2].id,
    });
  });

  it("downloads immediately only when validation has no issues", () => {
    expect(
      shouldDownloadImmediately({
        issues: [],
        hasExportBlockingIssues: false,
      }),
    ).toBe(true);
    expect(
      shouldDownloadImmediately({
        issues: [
          {
            id: "warning-1",
            code: "warning",
            severity: "warning",
            scope: "file",
            exportBlocking: false,
            title: "Warning",
          },
        ],
        hasExportBlockingIssues: false,
      }),
    ).toBe(false);
    expect(
      shouldDownloadImmediately({
        issues: [
          {
            id: "blocking-1",
            code: "blocking",
            severity: "export-blocking",
            scope: "message",
            exportBlocking: true,
            title: "Blocking",
          },
        ],
        hasExportBlockingIssues: true,
      }),
    ).toBe(false);
  });
});

function makeDocument(messages: readonly FitDataRecord[]): FitDocument {
  return {
    source: new ArrayBuffer(0),
    fileName: "test.fit",
    fileSize: 0,
    header: {
      headerSize: 12,
      protocolVersionRaw: 0,
      profileVersionRaw: 0,
      protocolVersion: "0.0",
      profileVersion: "0.0",
      dataSize: 0,
      dataType: ".FIT"
    },
    checksum: {
      fileCrc: 0,
      fileCrcValid: true
    },
    records: [],
    definitions: [],
    messages: [...messages],
    issues: []
  };
}

function makeMessage(fields: readonly FitField[]): FitDataRecord;
function makeMessage(
  id: string,
  messageName: string,
  fields?: readonly FitField[],
): FitDataRecord;
function makeMessage(
  idOrFields: string | readonly FitField[],
  messageName = "record",
  fields: readonly FitField[] = [],
): FitDataRecord {
  const id: string = typeof idOrFields === "string" ? idOrFields : "message-1";
  const nextFields: readonly FitField[] =
    typeof idOrFields === "string" ? fields : idOrFields;
  return {
    kind: "data",
    id,
    order: 0,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: 20,
    messageName,
    definitionId: `definition-${id}`,
    fields: [...nextFields],
    span: { start: 0, end: 0 }
  };
}

function makeDataField(overrides: {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly baseTypeName: string;
  readonly baseType: number;
  readonly size: number;
  readonly value: FitField["value"];
  readonly rawValue: FitField["rawValue"];
  readonly units?: string;
}): FitField {
  return {
    id: overrides.id,
    number: overrides.number,
    name: overrides.name,
    baseType: overrides.baseType,
    baseTypeName: overrides.baseTypeName,
    size: overrides.size,
    value: overrides.value,
    rawValue: overrides.rawValue,
    units: overrides.units,
    known: true,
    profile: {
      known: true,
      number: 20,
      name: "record",
      baseType: "record",
      size: 0,
      values: [],
      messageNumber: 20,
      messageName: "record"
    },
    span: { start: 0, end: 0 },
    developer: false
  };
}

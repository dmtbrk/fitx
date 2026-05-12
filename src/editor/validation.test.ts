import { describe, expect, it } from "vitest";
import { buildEditOverlay, createEmptyEditOverlay, insertInsertedMessage } from "./editOverlay";
import { validateFitEditorDocument } from "./validation";
import type { FitEditOverlay } from "./editOverlay";
import type { FitDataRecord, FitDocument, FitField, FitInsertedMessage } from "../fit";

describe("fit editor validation", () => {
  it("keeps checksum issues as warnings", () => {
    const document = makeDocument([], [
      {
        scope: "file",
        code: "invalid-header-crc",
        message: "Original FIT header checksum is invalid.",
      },
      {
        scope: "file",
        code: "invalid-file-crc",
        message: "Original FIT file checksum is invalid.",
      },
    ]);

    const result = validateFitEditorDocument(document, createEmptyEditOverlay());

    expect(result.hasExportBlockingIssues).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "invalid-header-crc",
        severity: "warning",
        exportBlocking: false,
        title: "Original FIT header checksum is invalid.",
      }),
      expect.objectContaining({
        code: "invalid-file-crc",
        severity: "warning",
        exportBlocking: false,
        title: "Original FIT file checksum is invalid.",
      }),
    ]);
  });

  it("keeps representable invalid edits as warnings and writer-impossible edits as export-blocking", () => {
    const message = makeMessage("message-1", "record", [
      makeDataField({
        id: "field-percent",
        number: 1,
        name: "percent_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 50,
        rawValue: 50,
        units: "%",
      }),
      makeDataField({
        id: "field-uint8",
        number: 2,
        name: "uint8_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 10,
        rawValue: 10,
      }),
    ]);

    const result = validateFitEditorDocument(
      makeDocument([message], []),
      buildEditOverlay([
        {
          messageId: message.id,
          fieldId: "field-percent",
          fieldNumber: 1,
          value: 101,
        },
        {
          messageId: message.id,
          fieldId: "field-uint8",
          fieldNumber: 2,
          value: 300,
        },
      ]),
    );

    expect(result.hasExportBlockingIssues).toBe(true);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "field-validation",
        severity: "warning",
        exportBlocking: false,
        messageId: message.id,
        fieldId: "field-percent",
        title: "percent_field has invalid data",
        description: "percent_field must be between 0 and 100.",
      }),
      expect.objectContaining({
        code: "field-validation",
        severity: "export-blocking",
        exportBlocking: true,
        messageId: message.id,
        fieldId: "field-uint8",
        title: "uint8_field has invalid data",
        description: "uint8_field must be between 0 and 255.",
      }),
    ]);
  });

  it("blocks raw inserts without a valid original-document anchor", () => {
    const document = makeDocument([
      makeMessage("message-1", "record", [
        makeDataField({
          id: "field-a",
          number: 1,
          name: "field_a",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          value: 1,
          rawValue: 1,
        }),
      ]),
    ]);

    const insertedMessage: FitInsertedMessage = {
      id: "raw-1",
      origin: "raw",
      position: {
        afterMessageId: "missing-anchor",
        beforeMessageId: null,
      },
      message: makeMessage("raw-1-message", "custom_message", [
        makeDataField({
          id: "field-b",
          number: 2,
          name: "field_b",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          value: 2,
          rawValue: 2,
        }),
      ]),
    };

    const result = validateFitEditorDocument(
      document,
      insertInsertedMessage(createEmptyEditOverlay(), insertedMessage),
    );

    expect(result.hasExportBlockingIssues).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "inserted-message-position",
        severity: "export-blocking",
        exportBlocking: true,
        messageId: "raw-1",
        title: "custom_message has invalid insert position",
      }),
    );
  });

  it("blocks raw inserts anchored to messages deleted in the same overlay", () => {
    const message = makeMessage("message-1", "record", [
      makeDataField({
        id: "field-a",
        number: 1,
        name: "field_a",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 1,
        rawValue: 1,
      }),
    ]);
    const insertedMessage: FitInsertedMessage = {
      id: "raw-1",
      origin: "raw",
      position: {
        afterMessageId: message.id,
        beforeMessageId: null,
      },
      message: makeMessage("raw-1-message", "custom_message", [
        makeDataField({
          id: "field-b",
          number: 2,
          name: "field_b",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          value: 2,
          rawValue: 2,
        }),
      ]),
    };
    const overlay: FitEditOverlay = {
      messages: new Map(),
      deletedMessageIds: new Set([message.id]),
      insertedMessages: new Map([[insertedMessage.id, insertedMessage]]),
    };

    const result = validateFitEditorDocument(makeDocument([message]), overlay);

    expect(result.hasExportBlockingIssues).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "inserted-message-position",
        severity: "export-blocking",
        exportBlocking: true,
        messageId: "raw-1",
        description:
          "Anchor message message-1 was not found in the exportable document.",
      }),
    );
  });

  it("blocks edits that would exceed FIT normal-field definition limits", () => {
    const message = makeMessage(
      "message-1",
      "record",
      Array.from({ length: 255 }, (_, index) =>
        makeDataField({
          id: `field-${index}`,
          number: index,
          name: `field_${index}`,
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          value: index,
          rawValue: index,
        }),
      ),
    );

    const result = validateFitEditorDocument(
      makeDocument([message]),
      buildEditOverlay([
        {
          messageId: message.id,
          fieldId: "added-field-255",
          fieldNumber: 255,
          fieldName: "added_field_255",
          baseType: 0x02,
          baseTypeName: "uint8",
          size: 1,
          added: true,
          value: 1,
        },
      ]),
    );

    expect(result.hasExportBlockingIssues).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "definition-field-count-exceeded",
        severity: "export-blocking",
        exportBlocking: true,
        messageId: message.id,
        title: "record has too many normal fields",
        description:
          "FIT definitions can contain at most 255 normal fields; this edit would write 256.",
      }),
    );
  });
});

function makeDocument(
  messages: readonly FitDataRecord[],
  issues: FitDocument["issues"] = [],
): FitDocument {
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
      dataType: ".FIT",
    },
    checksum: {
      fileCrc: 0,
      fileCrcValid: true,
    },
    records: [],
    definitions: [],
    messages: [...messages],
    issues: [...issues],
  };
}

function makeMessage(
  id: string,
  messageName: string,
  fields: readonly FitField[] = [],
): FitDataRecord {
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
    fields: [...fields],
    span: { start: 0, end: 0 },
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
      messageName: "record",
    },
    span: { start: 0, end: 0 },
    developer: false,
  };
}

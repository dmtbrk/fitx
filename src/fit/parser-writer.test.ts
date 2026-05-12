import { describe, expect, it } from "vitest";
import { calculateFitCrc, writeUint16Le } from "./crc";
import { parseFitDocument } from "./parser";
import { writeFitDocument } from "./writer";
import type { FitDataRecord, FitField } from "./types";

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

describe("FIT parser and writer", () => {
  it("parses an ordered export-capable document model with unknown and developer data preserved", () => {
    const file = makeRepresentativeFitFile();
    const document = parseFitDocument(file, "activity.fit");

    expect(document.fileName).toBe("activity.fit");
    expect(document.header.dataType).toBe(".FIT");
    expect(document.header.headerCrcValid).toBe(true);
    expect(document.checksum.fileCrcValid).toBe(true);
    expect(document.issues).toEqual([]);
    expect(document.records.map((record) => record.kind)).toEqual([
      "definition",
      "data",
      "definition",
      "data",
      "definition",
      "data",
      "definition",
      "data"
    ]);
    expect(document.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "record",
      "unknown_message_900",
      "record"
    ]);

    const unknown = document.messages[2];
    expect(unknown.fields[0]).toMatchObject({
      number: 7,
      name: "unknown_field_7",
      value: 99,
      known: false
    });

    const developerRecord = document.messages[3];
    expect(developerRecord.fields[1]).toMatchObject({
      developer: true,
      number: 1,
      developerDataIndex: 0,
      value: [0x34, 0x12]
    });
  });

  it("round-trips an unchanged document byte-for-byte with valid CRCs", () => {
    const file = makeRepresentativeFitFile();
    const document = parseFitDocument(file);
    const written = writeFitDocument(document);

    expect([...new Uint8Array(written)]).toEqual([...new Uint8Array(file)]);

    const reparsed = parseFitDocument(written);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
  });

  it("exports a scalar field edit and recalculates checksums", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(record).toBeDefined();
    const edited = writeFitDocument(document, {
      fieldEdits: [{ messageId: record!.id, fieldNumber: 3, value: 151 }]
    });
    const reparsed = parseFitDocument(edited);
    const editedRecord = reparsed.messages.find((message) => message.id === record!.id);

    expect(reparsed.header.dataSize).toBe(document.header.dataSize);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(editedRecord?.fields.find((field) => field.number === 3)?.value).toBe(151);
  });

  it("exports an added raw normal field with an extended definition for that message", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(record).toBeDefined();
    const edited = writeFitDocument(document, {
      fieldEdits: [
        {
          messageId: record!.id,
          fieldNumber: 200,
          fieldName: "custom_bytes",
          baseType: 0x02,
          baseTypeName: "uint8",
          size: 2,
          added: true,
          value: [7, 8]
        }
      ]
    });
    const reparsed = parseFitDocument(edited);
    const editedRecord = reparsed.messages.find((message) => message.fields.some((field) => field.number === 200));
    const untouchedRecord = reparsed.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.developer));

    expect(reparsed.messages).toHaveLength(document.messages.length);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(editedRecord?.fields.map((field) => field.number)).toEqual([253, 3, 6, 200]);
    expect(editedRecord?.fields.find((field) => field.number === 200)?.value).toEqual([7, 8]);
    expect(untouchedRecord?.fields.some((field) => field.number === 200)).toBe(false);
  });

  it("rejects overlong added string field values instead of truncating them", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(record).toBeDefined();
    expect(() => writeFitDocument(document, {
      fieldEdits: [
        {
          messageId: record!.id,
          fieldNumber: 201,
          fieldName: "custom_label",
          baseType: 0x07,
          baseTypeName: "string",
          size: 4,
          added: true,
          value: "hello"
        }
      ]
    })).toThrow("maximum length is 4 bytes");
  });

  it("exports array and developer field edits without changing definition order", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const firstRecord = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.number === 6));
    const developerRecord = document.messages.find((message) => message.fields.some((field) => field.developer));
    const developerField = developerRecord?.fields.find((field) => field.developer);

    const edited = writeFitDocument(document, {
      fieldEdits: [
        { messageId: firstRecord!.id, fieldNumber: 6, value: 3000 },
        { messageId: developerRecord!.id, fieldId: developerField!.id, fieldNumber: developerField!.number, developer: true, developerDataIndex: 0, value: [0xab, 0xcd] }
      ]
    });
    const reparsed = parseFitDocument(edited);
    const editedFirstRecord = reparsed.messages.find((message) => message.id === firstRecord!.id);
    const editedDeveloperRecord = reparsed.messages.find((message) => message.id === developerRecord!.id);

    expect(editedFirstRecord?.fields.map((field) => field.number)).toEqual([253, 3, 6]);
    expect(editedFirstRecord?.fields.find((field) => field.number === 6)?.value).toBe(3000);
    expect(editedDeveloperRecord?.fields.find((field) => field.developer)?.value).toEqual([0xab, 0xcd]);
  });

  it("exports inserted duplicates after their sources with valid CRCs", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const unknownSource = document.messages.find((message) => message.messageName === "unknown_message_900");
    const developerSource = document.messages.find((message) => message.fields.some((field) => field.developer));

    expect(unknownSource).toBeDefined();
    expect(developerSource).toBeDefined();

    const duplicateUnknown = {
      ...unknownSource!,
      id: "duplicate-unknown-message",
    };
    const duplicateDeveloper = {
      ...developerSource!,
      id: "duplicate-developer-message",
    };

    const edited = writeFitDocument(document, {
      insertedMessages: [
        {
          id: duplicateUnknown.id,
          origin: "duplicate",
          position: {
            afterMessageId: unknownSource!.id,
            beforeMessageId: null
          },
          sourceMessageId: unknownSource!.id,
          message: duplicateUnknown,
        },
        {
          id: duplicateDeveloper.id,
          origin: "duplicate",
          position: {
            afterMessageId: developerSource!.id,
            beforeMessageId: null
          },
          sourceMessageId: developerSource!.id,
          message: duplicateDeveloper,
        },
      ],
    });
    const reparsed = parseFitDocument(edited);

    expect(reparsed.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "record",
      "unknown_message_900",
      "unknown_message_900",
      "record",
      "record",
    ]);
    expect(reparsed.messages).toHaveLength(document.messages.length + 2);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(reparsed.messages.filter((message) => message.messageName === "unknown_message_900")[1]?.fields[0]?.value).toBe(99);
    const recordMessages = reparsed.messages.filter((message) => message.messageName === "record");
    expect(recordMessages[recordMessages.length - 1]?.fields.find((field) => field.developer)?.value).toEqual([0x34, 0x12]);
  });

  it("exports a duplicate of one message type at another position with staged added fields", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const unknownSource = document.messages.find((message) => message.messageName === "unknown_message_900");
    const placementRecord = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(unknownSource).toBeDefined();
    expect(placementRecord).toBeDefined();

    const addedField = {
      messageId: unknownSource!.id,
      fieldNumber: 200,
      fieldName: "source_added",
      baseType: 0x02,
      baseTypeName: "uint8",
      size: 1,
      added: true as const,
      value: 42
    };
    const duplicateUnknown: FitDataRecord = {
      ...unknownSource!,
      id: "duplicate-unknown-with-added-field",
      fields: [
        ...unknownSource!.fields,
        makeAddedField(unknownSource!, {
          fieldNumber: 200,
          fieldName: "source_added",
          baseType: 0x02,
          baseTypeName: "uint8",
          size: 1,
          value: 42
        })
      ]
    };

    const edited = writeFitDocument(document, {
      fieldEdits: [addedField],
      insertedMessages: [
        {
          id: duplicateUnknown.id,
          origin: "duplicate",
          position: {
            afterMessageId: placementRecord!.id,
            beforeMessageId: null
          },
          sourceMessageId: unknownSource!.id,
          message: duplicateUnknown,
        },
      ],
    });
    const reparsed = parseFitDocument(edited);
    const unknownMessages = reparsed.messages.filter((message) => message.messageName === "unknown_message_900");

    expect(reparsed.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "record",
      "unknown_message_900",
      "unknown_message_900",
      "record",
    ]);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(unknownMessages).toHaveLength(2);
    expect(unknownMessages[0]?.fields.find((field) => field.number === 200)?.value).toBe(42);
    expect(unknownMessages[1]?.fields.find((field) => field.number === 200)?.value).toBe(42);
  });

  it("exports a duplicate before an explicit placement anchor instead of falling back to its source", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const unknownSource = document.messages.find((message) => message.messageName === "unknown_message_900");
    const placementRecord = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(unknownSource).toBeDefined();
    expect(placementRecord).toBeDefined();

    const duplicateUnknown: FitDataRecord = {
      ...unknownSource!,
      id: "duplicate-unknown-before-record",
    };

    const edited = writeFitDocument(document, {
      insertedMessages: [
        {
          id: duplicateUnknown.id,
          origin: "duplicate",
          position: {
            afterMessageId: null,
            beforeMessageId: placementRecord!.id
          },
          sourceMessageId: unknownSource!.id,
          message: duplicateUnknown,
        },
      ],
    });
    const reparsed = parseFitDocument(edited);

    expect(reparsed.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "unknown_message_900",
      "record",
      "unknown_message_900",
      "record",
    ]);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(reparsed.messages[1]?.fields[0]?.value).toBe(99);
  });

  it("exports raw inserted messages before, between, and after records with valid CRCs", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const insertedBeforeFirst = makeRawInsertedMessage("raw-before-first", {
      globalMessageNumber: 901,
      fields: [
        {
          fieldNumber: 1,
          fieldName: "raw_before_value",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 2,
          textValues: ["7", "8"]
        }
      ]
    });
    const insertedBetween = makeRawInsertedMessage("raw-between", {
      globalMessageNumber: 902,
      fields: [
        {
          fieldNumber: 2,
          fieldName: "raw_between_text",
          baseTypeName: "string",
          baseType: 0x07,
          size: 5,
          textValues: ["abc"]
        }
      ]
    });
    const insertedAfterLast = makeRawInsertedMessage("raw-after-last", {
      globalMessageNumber: 903,
      fields: [
        {
          fieldNumber: 3,
          fieldName: "raw_after_value",
          baseTypeName: "uint16",
          baseType: 0x84,
          size: 2,
          textValues: ["300"]
        }
      ]
    });

    const edited = writeFitDocument(document, {
      insertedMessages: [
        {
          id: insertedBeforeFirst.id,
          origin: "raw",
          position: {
            afterMessageId: null,
            beforeMessageId: document.messages[0].id
          },
          message: insertedBeforeFirst
        },
        {
          id: insertedBetween.id,
          origin: "raw",
          position: {
            afterMessageId: document.messages[1].id,
            beforeMessageId: document.messages[2].id
          },
          message: insertedBetween
        },
        {
          id: insertedAfterLast.id,
          origin: "raw",
          position: {
            afterMessageId: document.messages[3].id,
            beforeMessageId: null
          },
          message: insertedAfterLast
        }
      ]
    });

    const reparsed = parseFitDocument(edited);
    expect(reparsed.messages.map((message) => message.messageName)).toEqual([
      "unknown_message_901",
      "file_id",
      "record",
      "unknown_message_902",
      "unknown_message_900",
      "record",
      "unknown_message_903"
    ]);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
    expect(reparsed.messages[0]?.fields[0]?.value).toEqual([7, 8]);
    expect(reparsed.messages[3]?.fields[0]?.value).toBe("abc");
    expect(reparsed.messages[6]?.fields[0]?.value).toBe(300);
  });

  it("skips deleted data records during export while keeping definitions and valid CRCs", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(record).toBeDefined();

    const edited = writeFitDocument(document, {
      fieldEdits: [
        {
          messageId: record!.id,
          fieldNumber: 3,
          value: 151
        }
      ],
      deletedMessageIds: [record!.id]
    });
    const reparsed = parseFitDocument(edited);

    expect(reparsed.messages).toHaveLength(3);
    expect(reparsed.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "unknown_message_900",
      "record"
    ]);
    expect(reparsed.messages.find((message) => message.messageName === "unknown_message_900")?.fields[0]?.value).toBe(99);
    expect(
      reparsed.messages
        .find((message) => message.messageName === "record" && message.fields.some((field) => field.developer))
        ?.fields.find((field) => field.developer)?.value
    ).toEqual([0x34, 0x12]);
    expect(reparsed.header.dataSize).toBeLessThan(document.header.dataSize);
    expect(reparsed.header.headerCrcValid).toBe(true);
    expect(reparsed.checksum.fileCrcValid).toBe(true);
  });

  it("rejects added fields that would exceed the one-byte definition field count", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(record).toBeDefined();

    const addedFieldNumbers = Array.from({ length: 256 }, (_, number) => number).filter((number) => ![3, 6, 253].includes(number));
    expect(addedFieldNumbers).toHaveLength(253);

    expect(() =>
      writeFitDocument(document, {
        fieldEdits: addedFieldNumbers.map((fieldNumber) => ({
          messageId: record!.id,
          fieldNumber,
          fieldName: `custom_${fieldNumber}`,
          baseType: 0x02,
          baseTypeName: "uint8",
          size: 1,
          added: true,
          value: 0
        }))
      })
    ).toThrow("field count 256 exceeds FIT's one-byte limit of 255");
  });

  it("rejects integer edits that would otherwise be coerced by DataView", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const record = document.messages.find((message) => message.messageName === "record" && message.fields.some((field) => field.name === "heart_rate"));

    expect(() => writeFitDocument(document, {
      fieldEdits: [{ messageId: record!.id, fieldNumber: 3, value: 300 }]
    })).toThrow("maximum is 255");

    expect(() => writeFitDocument(document, {
      fieldEdits: [{ messageId: record!.id, fieldNumber: 3, value: -1 }]
    })).toThrow("minimum is 0");

    expect(() => writeFitDocument(document, {
      fieldEdits: [{ messageId: record!.id, fieldNumber: 3, value: 1.5 }]
    })).toThrow("fractional value");
  });

  it("preserves FIT invalid float sentinels on unchanged export", () => {
    const file = makeFloatInvalidFitFile();
    const document = parseFitDocument(file);

    expect(document.messages[0].fields[0].value).toBeNull();
    expect([...new Uint8Array(writeFitDocument(document))]).toEqual([...new Uint8Array(file)]);
  });

  it("models broken original checksums as file-level issues while still parsing records", () => {
    const bytes = new Uint8Array(makeRepresentativeFitFile());
    bytes[12] ^= 0xff;
    bytes[bytes.byteLength - 1] ^= 0xff;

    const document = parseFitDocument(bytes.buffer);

    expect(document.messages).toHaveLength(4);
    expect(document.issues.map((issue) => issue.code)).toEqual(["invalid-header-crc", "invalid-file-crc"]);
  });

  it("rejects malformed records that exceed the declared FIT data size", () => {
    const data = [
      0x40, 0x00, 0x00, 0x14, 0x00, 0x01,
      0xfd, 0x04, 0x86,
      0x00,
      0x01
    ];

    expect(() => parseFitDocument(finalizeFitFile(data))).toThrow(
      "Malformed FIT data: data field exceeds declared data size."
    );
  });
});

function makeRepresentativeFitFile(): ArrayBuffer {
  const timestamp = fitTimestamp(Date.UTC(2024, 0, 1));
  const data: number[] = [
    // file_id definition, local 0.
    0x40, 0x00, 0x00, 0x00, 0x00, 0x02,
    0x01, 0x02, 0x84,
    0x04, 0x04, 0x86,
    // file_id data.
    0x00,
    0x01, 0x00,
    ...uint32Le(timestamp),

    // record definition, local 1.
    0x41, 0x00, 0x00, 0x14, 0x00, 0x03,
    0xfd, 0x04, 0x86,
    0x03, 0x01, 0x02,
    0x06, 0x02, 0x84,
    // record data.
    0x01,
    ...uint32Le(timestamp + 30),
    145,
    ...uint16Le(2500),

    // unknown message definition, local 2.
    0x42, 0x00, 0x00, 0x84, 0x03, 0x01,
    0x07, 0x01, 0x02,
    // unknown message data.
    0x02,
    99,

    // record definition with developer data, local 3.
    0x63, 0x00, 0x00, 0x14, 0x00, 0x01,
    0xfd, 0x04, 0x86,
    0x01,
    0x01, 0x02, 0x00,
    // record data with developer field bytes.
    0x03,
    ...uint32Le(timestamp + 60),
    0x34, 0x12
  ];

  return finalizeFitFile(data);
}

function makeFloatInvalidFitFile(): ArrayBuffer {
  const data = [
    0x40, 0x00, 0x00, 0x84, 0x03, 0x01,
    0x01, 0x04, 0x88,
    0x00,
    0xff, 0xff, 0xff, 0xff
  ];
  return finalizeFitFile(data);
}

function finalizeFitFile(data: readonly number[]): ArrayBuffer {
  const headerSize = 14;
  const bytes = new Uint8Array(headerSize + data.length + 2);
  const view = new DataView(bytes.buffer);

  bytes[0] = headerSize;
  bytes[1] = 0x10;
  view.setUint16(2, 100, true);
  view.setUint32(4, data.length, true);
  bytes[8] = 0x2e;
  bytes[9] = 0x46;
  bytes[10] = 0x49;
  bytes[11] = 0x54;
  writeUint16Le(bytes, 12, calculateFitCrc(bytes, 0, 12));
  bytes.set(data, headerSize);
  writeUint16Le(bytes, bytes.byteLength - 2, calculateFitCrc(bytes, 0, bytes.byteLength - 2));

  return bytes.buffer;
}

function uint16Le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32Le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function fitTimestamp(unixMs: number): number {
  return Math.floor((unixMs - FIT_EPOCH_MS) / 1000);
}

function makeRawInsertedMessage(
  id: string,
  input: {
    readonly globalMessageNumber: number;
    readonly messageName?: string;
    readonly fields: readonly {
      readonly fieldNumber: number;
      readonly fieldName: string;
      readonly baseType: number;
      readonly baseTypeName: string;
      readonly size: number;
      readonly textValues: readonly string[];
      readonly units?: string;
    }[];
  }
): FitDataRecord {
  const messageName = input.messageName ?? `unknown_message_${input.globalMessageNumber}`;
  const message: FitDataRecord = {
    kind: "data",
    id,
    order: 0,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: input.globalMessageNumber,
    messageName,
    definitionId: `raw-definition:${id}`,
    fields: [],
    span: { start: 0, end: 0 },
  };

  return {
    ...message,
    fields: input.fields.map((field) =>
      makeAddedField(message, {
        fieldNumber: field.fieldNumber,
        fieldName: field.fieldName,
        baseType: field.baseType,
        baseTypeName: field.baseTypeName,
        size: field.size,
        value: parseRawFieldValue(field.baseTypeName, field.textValues),
        units: field.units,
      })
    ),
  };
}

function makeAddedField(
  message: FitDataRecord,
  input: {
    readonly fieldNumber: number;
    readonly fieldName: string;
    readonly baseType: number;
    readonly baseTypeName: string;
    readonly size: number;
    readonly value: FitField["value"];
    readonly units?: string;
  }
): FitField {
  return {
    id: `added:${message.id}:${input.fieldNumber}:${input.fieldName}`,
    number: input.fieldNumber,
    name: input.fieldName,
    baseType: input.baseType,
    baseTypeName: input.baseTypeName,
    size: input.size,
    value: input.value,
    rawValue: input.value,
    units: input.units,
    known: false,
    profile: {
      known: false,
      number: input.fieldNumber,
      name: input.fieldName,
      baseType: input.baseTypeName,
      size: input.size,
      values: [],
      messageNumber: message.globalMessageNumber,
      messageName: message.messageName,
    },
    span: { start: 0, end: 0 },
    developer: false,
    added: true,
  };
}

function parseRawFieldValue(
  baseTypeName: string,
  textValues: readonly string[],
): FitField["value"] {
  if (baseTypeName === "string") {
    return textValues.join("");
  }

  const values = textValues.map((value) => Number(value));
  return values.length === 1 ? values[0] : values;
}

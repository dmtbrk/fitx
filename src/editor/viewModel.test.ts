import { describe, expect, it } from "vitest";
import { parseFitDocument } from "../fit/parser";
import type { FitDataRecord } from "../fit";
import {
  buildFitFilterOptions,
  buildFitViewModel,
  countEditedMessages,
  countIssueMessages,
  filterFitMessages,
  formatFitFieldDisplayValue,
  formatFitValue
} from "./viewModel";
import type { FitFilterOption, FitIssueLike } from "./viewModel";

describe("fit view model", () => {
  it("maps ordered quick-view messages and hides definition records", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const view = buildFitViewModel(document);

    expect(document.records).toHaveLength(8);
    expect(view.messages).toHaveLength(4);
    expect(view.messages.map((message) => message.messageName)).toEqual([
      "file_id",
      "record",
      "unknown_message_900",
      "record"
    ]);
    expect(view.messageTypeCounts).toEqual([
      { globalMessageNumber: 0, messageName: "file_id", count: 1 },
      { globalMessageNumber: 20, messageName: "record", count: 2 },
      { globalMessageNumber: 900, messageName: "unknown_message_900", count: 1 }
    ]);
    expect(view.messages[2].messageName).toBe("unknown_message_900");
  });

  it("filters deleted data messages out of quick-view lists and counts", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const deletedMessageId = document.messages[1].id;
    const visibleEditedMessageId = document.messages[0].id;
    const view = buildFitViewModel(document, {
      deletedMessageIds: [deletedMessageId],
      editedMessageIds: [deletedMessageId, visibleEditedMessageId],
    });

    expect(view.messages).toHaveLength(3);
    expect(view.messages.map((message) => message.id)).toEqual([
      document.messages[0].id,
      document.messages[2].id,
      document.messages[3].id,
    ]);
    expect(view.counts.messages).toBe(3);
    expect(view.messageTypeCounts).toEqual([
      { globalMessageNumber: 0, messageName: "file_id", count: 1 },
      { globalMessageNumber: 900, messageName: "unknown_message_900", count: 1 },
      { globalMessageNumber: 20, messageName: "record", count: 1 },
    ]);
    expect(view.filterOptions.find((option) => option.kind === "edited")).toEqual(
      expect.objectContaining({ count: 1 }),
    );
    expect(view.counts.edited).toBe(1);
  });

  it("projects applied field edits into quick-view message values", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const sourceMessage = document.messages[1];
    const sourceField = sourceMessage.fields.find(
      (field) =>
        !field.developer &&
        field.name !== "timestamp" &&
        field.name !== "time_created" &&
        field.name !== "start_time" &&
        (typeof field.value === "number" || typeof field.value === "bigint"),
    );

    expect(sourceField).toBeDefined();
    if (!sourceField) {
      throw new Error("Expected a numeric source field.");
    }

    const sourceFieldValue = sourceField.value;
    const editedValue =
      typeof sourceFieldValue === "bigint"
        ? sourceFieldValue + 1n
        : typeof sourceFieldValue === "number"
          ? sourceFieldValue + 1
          : (() => {
              throw new Error("Expected a numeric source field value.");
            })();

    const view = buildFitViewModel(document, {
      appliedEdits: [
        {
          messageId: sourceMessage.id,
          fieldId: sourceField!.id,
          fieldNumber: sourceField!.number,
          value: editedValue,
        },
      ],
      editedMessageIds: [sourceMessage.id],
    });

    const projectedMessage = view.messages.find(
      (message) => message.id === sourceMessage.id,
    );

    expect(projectedMessage).toBeDefined();
    expect(projectedMessage?.isEdited).toBe(true);
    expect(
      projectedMessage?.fields.find((field) => field.id === sourceField!.id)?.valueText,
    ).toBe(formatFitValue(editedValue));
    expect(projectedMessage?.timestampLabel).toBe(
      "2024-01-01T00:00:30.000Z",
    );
  });

  it("inserts duplicated messages immediately after their source", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const source = document.messages[1];
    const duplicate = {
      ...source,
      id: "duplicate-record-1",
    };

    const view = buildFitViewModel(document, {
      insertedMessages: [
        {
          id: duplicate.id,
          origin: "duplicate",
          position: {
            afterMessageId: source.id,
            beforeMessageId: null
          },
          sourceMessageId: source.id,
          message: duplicate,
        },
      ],
      editedMessageIds: [duplicate.id],
    });

    expect(view.messages.map((message) => message.id)).toEqual([
      document.messages[0].id,
      source.id,
      duplicate.id,
      document.messages[2].id,
      document.messages[3].id,
    ]);
    expect(view.counts.messages).toBe(5);
    expect(view.counts.edited).toBe(1);
    expect(view.messageTypeCounts.find((count) => count.messageName === "record")?.count).toBe(3);
  });

  it("places raw inserted messages before the first record, between records, and after the last record", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const insertedBeforeFirst = {
      ...document.messages[0],
      id: "raw-before-first"
    };
    const insertedBetween = {
      ...document.messages[1],
      id: "raw-between"
    };
    const insertedAfterLast = {
      ...document.messages[3],
      id: "raw-after-last"
    };

    const view = buildFitViewModel(document, {
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
      ],
      editedMessageIds: [insertedBeforeFirst.id, insertedBetween.id, insertedAfterLast.id]
    });

    expect(view.messages.map((message) => message.id)).toEqual([
      insertedBeforeFirst.id,
      document.messages[0].id,
      document.messages[1].id,
      insertedBetween.id,
      document.messages[2].id,
      document.messages[3].id,
      insertedAfterLast.id
    ]);
    expect(view.counts.messages).toBe(7);
    expect(view.counts.edited).toBe(3);
  });

  it("surfaces canonical inserted message snapshots regardless of insertion point", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const insertedBeforeFirst = makeEditedSnapshot(document.messages[0], "raw-before-first");
    const insertedBetween = makeEditedSnapshot(document.messages[1], "raw-between");
    const insertedAfterLast = makeEditedSnapshot(document.messages[3], "raw-after-last");

    const beforeField = findFirstNumericField(insertedBeforeFirst);
    const betweenField = findFirstNumericField(insertedBetween);
    const afterField = findFirstNumericField(insertedAfterLast);

    const view = buildFitViewModel(document, {
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
      ],
      editedMessageIds: [insertedBeforeFirst.id, insertedBetween.id, insertedAfterLast.id]
    });

    expect(
      view.messages.find((message) => message.id === insertedBeforeFirst.id)?.fields.find((field) => field.id === beforeField.id)?.valueText,
    ).toBe(formatFitValue(beforeField.value));
    expect(
      view.messages.find((message) => message.id === insertedBetween.id)?.fields.find((field) => field.id === betweenField.id)?.valueText,
    ).toBe(formatFitValue(betweenField.value));
    expect(
      view.messages.find((message) => message.id === insertedAfterLast.id)?.fields.find((field) => field.id === afterField.id)?.valueText,
    ).toBe(formatFitValue(afterField.value));
  });

  it("extracts timestamp labels from timestamp-like fields in UTC text", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const view = buildFitViewModel(document);

    expect(view.messages[0].timestampLabel).toBe("2024-01-01T00:00:00.000Z");
    expect(view.messages[1].timestampLabel).toBe("2024-01-01T00:00:30.000Z");
  });

  it("keeps units separate from display values", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const field = document.messages
      .flatMap((message) => message.fields)
      .find((candidate) => !candidate.developer && candidate.units);

    expect(field).toBeDefined();
    const display = formatFitFieldDisplayValue(field!);

    expect(display.units).toBe(!field!.developer ? field!.units?.trim() : undefined);
    expect(display.valueText).not.toContain(display.units ?? "");
  });

  it("orders filter options and suppresses message types with no visible messages", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const view = buildFitViewModel(document);

    const allOptions = buildFitFilterOptions(view.messages);
    expect(allOptions.map((option) => option.kind)).toEqual([
      "all",
      "issues",
      "edited",
      "message-type",
      "message-type",
      "message-type"
    ]);
    expect(messageTypeLabels(allOptions)).toEqual([
      "file_id",
      "record",
      "unknown_message_900"
    ]);

    const recordMessages = filterFitMessages(view.messages, { kind: "message-type", globalMessageNumber: 20 });
    const filteredOptions = buildFitFilterOptions(recordMessages);
    expect(filteredOptions.map((option) => option.kind)).toEqual(["all", "issues", "edited", "message-type"]);
    expect(messageTypeLabels(filteredOptions)).toEqual(["record"]);
  });

  it("filters messages by issues, edits, and type while preserving file order", () => {
    const document = parseFitDocument(makeRepresentativeFitFile());
    const view = buildFitViewModel(document);

    const issues: FitIssueLike[] = [
      ...document.issues.map(() => ({})),
      { messageId: view.messages[2].id },
      { messageId: view.messages[1].id }
    ];
    const editedMessageIds = [view.messages[3].id, view.messages[1].id, view.messages[1].id];
    const editedFieldKeys = [`${view.messages[2].id}:7`, `${view.messages[3].id}:1`];

    expect(countIssueMessages(issues)).toBe(2);
    expect(countEditedMessages({ messageIds: editedMessageIds, fieldKeys: editedFieldKeys })).toBe(3);

    const issueFilter = filterFitMessages(view.messages, "issues", { issues });
    expect(issueFilter.map((message) => message.id)).toEqual([view.messages[1].id, view.messages[2].id]);

    const editedFilter = filterFitMessages(view.messages, "edited", {
      editedMessageIds,
      editedFieldKeys
    });
    expect(editedFilter.map((message) => message.id)).toEqual([view.messages[1].id, view.messages[2].id, view.messages[3].id]);

    const typeFilter = filterFitMessages(view.messages, { kind: "message-type", globalMessageNumber: 20 });
    expect(typeFilter.map((message) => message.id)).toEqual([view.messages[1].id, view.messages[3].id]);
  });
});

function makeRepresentativeFitFile(): ArrayBuffer {
  const timestamp = fitTimestamp(Date.UTC(2024, 0, 1));
  const data: number[] = [
    0x40, 0x00, 0x00, 0x00, 0x00, 0x02,
    0x01, 0x02, 0x84,
    0x04, 0x04, 0x86,
    0x00,
    0x01, 0x00,
    ...uint32Le(timestamp),
    0x41, 0x00, 0x00, 0x14, 0x00, 0x03,
    0xfd, 0x04, 0x86,
    0x03, 0x01, 0x02,
    0x06, 0x02, 0x84,
    0x01,
    ...uint32Le(timestamp + 30),
    145,
    ...uint16Le(2500),
    0x42, 0x00, 0x00, 0x84, 0x03, 0x01,
    0x07, 0x01, 0x02,
    0x02,
    99,
    0x63, 0x00, 0x00, 0x14, 0x00, 0x01,
    0xfd, 0x04, 0x86,
    0x01,
    0x01, 0x02, 0x00,
    0x03,
    ...uint32Le(timestamp + 60),
    0x34, 0x12
  ];

  return finalizeFitFile(data);
}

function messageTypeLabels(options: readonly FitFilterOption[]): string[] {
  return options.flatMap((option) => option.kind === "message-type" ? [option.messageName] : []);
}

function findFirstNumericField(message: FitDataRecord): FitDataRecord["fields"][number] & {
  readonly value: number | bigint;
} {
  const field = message.fields.find(
    (candidate) =>
      !Array.isArray(candidate.value) &&
      candidate.value !== null &&
      (typeof candidate.value === "number" || typeof candidate.value === "bigint"),
  );

  if (!field) {
    throw new Error("Expected a numeric field.");
  }

  return field as FitDataRecord["fields"][number] & {
    readonly value: number | bigint;
  };
}

function makeEditedSnapshot(message: FitDataRecord, id: string): FitDataRecord {
  const numericField = findFirstNumericField(message);
  const nextValue = incrementNumericValue(numericField.value);

  return {
    ...message,
    id,
    fields: message.fields.map((field) =>
      field.id === numericField.id
        ? {
            ...field,
            value: nextValue,
            rawValue: nextValue,
          }
        : field,
    ),
  };
}

function incrementNumericValue(value: number | bigint) {
  if (typeof value === "bigint") {
    return value + 1n;
  }

  if (typeof value === "number") {
    return value + 1;
  }

  throw new Error("Expected a numeric field value.");
}

function fitTimestamp(value: number): number {
  return Math.trunc((value - Date.UTC(1989, 11, 31)) / 1000);
}

function uint16Le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32Le(value: number): number[] {
  return [
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  ];
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
  bytes.set(data, headerSize);

  const crc = calculateCrc(bytes, 0, bytes.length - 2);
  view.setUint16(bytes.length - 2, crc, true);

  return bytes.buffer;
}

function calculateCrc(bytes: Uint8Array, start: number, end: number): number {
  const table = createCrcTable();
  let crc = 0;
  for (let index = start; index < end; index += 1) {
    const byte = bytes[index] ?? 0;
    const lookup = table[(crc ^ byte) & 0xff] ?? 0;
    crc = ((crc >> 8) ^ lookup) & 0xffff;
  }
  return crc;
}

function createCrcTable(): number[] {
  const table: number[] = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? (value >> 1) ^ 0xa001 : value >> 1;
    }
    table[index] = value & 0xffff;
  }
  return table;
}

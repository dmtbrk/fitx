import { describe, expect, it } from "vitest";
import {
  buildMessageSnapshotFromAppliedEdits,
  buildFieldValueEditsFromDraft,
  countDraftChangedFields,
  createMessageEditDraft,
  createRawAddedFieldDraft,
  createRawInsertedMessage,
  getDraftFieldIssues,
  getDraftIssues,
  getRawAddedFieldDraftIssues,
  validateRawInsertedMessageInput,
  updateDraftFieldValue
} from "./editSession";
import type { FitDataRecord, FitField, FitFieldValueEdit } from "../fit/types";

describe("fit edit session", () => {
  it("creates a scalar numeric edit as one field edit with the field identity", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-power",
        number: 3,
        name: "power",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 250,
        rawValue: 250,
        units: "watts"
      })
    ]);

    const draft = updateDraftFieldValue(createMessageEditDraft(message), "field-power", 0, "255");
    const field = draft.fieldsById["field-power"];

    expect(countDraftChangedFields(draft)).toBe(1);
    expect(getDraftFieldIssues(field)).toEqual([]);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual<FitFieldValueEdit[]>([
      {
        messageId: message.id,
        fieldId: "field-power",
        fieldNumber: 3,
        value: 255
      }
    ]);
  });

  it("produces no edits when the draft is unchanged", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-heart-rate",
        number: 1,
        name: "heart_rate",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 145,
        rawValue: 145
      })
    ]);

    const draft = createMessageEditDraft(message);

    expect(countDraftChangedFields(draft)).toBe(0);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual([]);
  });

  it("emits seeded edits when another field changes", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-speed",
        number: 2,
        name: "speed",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 12,
        rawValue: 12,
        units: "m/s"
      }),
      makeDataField({
        id: "field-cadence",
        number: 3,
        name: "cadence",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 90,
        rawValue: 90,
        units: "rpm"
      })
    ]);

    const appliedEdits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      }
    ];
    const draft = updateDraftFieldValue(createMessageEditDraft(message, appliedEdits), "field-cadence", 0, "91");

    expect(countDraftChangedFields(draft)).toBe(1);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual<FitFieldValueEdit[]>([
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      },
      {
        messageId: message.id,
        fieldId: "field-cadence",
        fieldNumber: 3,
        value: 91
      }
    ]);
  });

  it("builds a duplicate snapshot from the current applied source values", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-speed",
        number: 2,
        name: "speed",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 12,
        rawValue: 12,
        units: "m/s"
      })
    ]);

    const appliedEdits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      },
      {
        messageId: message.id,
        fieldNumber: 20,
        fieldName: "duplicate_note",
        baseType: 0x07,
        baseTypeName: "string",
        size: 8,
        added: true,
        value: "copy"
      }
    ];

    const duplicate = buildMessageSnapshotFromAppliedEdits(
      message,
      appliedEdits,
      "duplicate-message-1",
    );

    expect(duplicate.id).toBe("duplicate-message-1");
    expect(duplicate.fields.find((field) => field.id === "field-speed")?.value).toBe(15);
    expect(duplicate.fields.find((field) => field.number === 20)).toMatchObject({
      added: true,
      value: "copy",
      rawValue: "copy"
    });
  });

  it("preserves developer identity and numeric array values when editing arrays", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-samples",
        number: 6,
        name: "samples",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 3,
        value: [10, 20, 30],
        rawValue: [10, 20, 30]
      }),
      makeDeveloperField({
        id: "field-dev-bytes",
        number: 1,
        name: "developer_bytes",
        size: 2,
        value: [4, 5],
        rawValue: [4, 5],
        developerDataIndex: 7
      })
    ]);

    const draft = updateDraftFieldValue(
      updateDraftFieldValue(
        updateDraftFieldValue(createMessageEditDraft(message), "field-samples", 1, "21"),
        "field-dev-bytes",
        0,
        "6"
      ),
      "field-dev-bytes",
      1,
      "7"
    );

    expect(buildFieldValueEditsFromDraft(draft)).toEqual<FitFieldValueEdit[]>([
      {
        messageId: message.id,
        fieldId: "field-samples",
        fieldNumber: 6,
        value: [10, 21, 30]
      },
      {
        messageId: message.id,
        fieldId: "field-dev-bytes",
        fieldNumber: 1,
        developer: true,
        developerDataIndex: 7,
        value: [6, 7]
      }
    ]);
  });

  it("catches invalid number edits while keeping percent and unit range issues as warnings", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-number",
        number: 1,
        name: "number_field",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 3,
        rawValue: 3
      }),
      makeDataField({
        id: "field-percent",
        number: 2,
        name: "percent_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 50,
        rawValue: 50,
        units: "%"
      }),
      makeDataField({
        id: "field-watts",
        number: 3,
        name: "watts_field",
        baseTypeName: "sint16",
        baseType: 0x83,
        size: 2,
        value: 10,
        rawValue: 10,
        units: "watts"
      })
    ]);

    const draft = updateDraftFieldValue(
      updateDraftFieldValue(
        updateDraftFieldValue(createMessageEditDraft(message), "field-number", 0, "abc"),
        "field-percent",
        0,
        "101"
      ),
      "field-watts",
      0,
      "-1"
    );

    expect(getDraftFieldIssues(draft.fieldsById["field-number"])).toContain("number_field must be a valid number.");
    expect(getDraftFieldIssues(draft.fieldsById["field-percent"])).toContain("percent_field must be between 0 and 100.");
    expect(getDraftFieldIssues(draft.fieldsById["field-watts"])).toContain("watts_field must be zero or greater.");

    expect(getDraftIssues(draft)).toEqual([
      {
        messageId: message.id,
        fieldId: "field-number",
        fieldNumber: 1,
        fieldName: "number_field",
        exportBlocking: true,
        messages: ["number_field must be a valid number."]
      },
      {
        messageId: message.id,
        fieldId: "field-percent",
        fieldNumber: 2,
        fieldName: "percent_field",
        exportBlocking: false,
        messages: ["percent_field must be between 0 and 100."]
      },
      {
        messageId: message.id,
        fieldId: "field-watts",
        fieldNumber: 3,
        fieldName: "watts_field",
        exportBlocking: false,
        messages: ["watts_field must be zero or greater."]
      }
    ]);
  });

  it("blocks integer overflow and fractional values", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-uint8",
        number: 1,
        name: "uint8_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 10,
        rawValue: 10
      }),
      makeDataField({
        id: "field-uint16",
        number: 2,
        name: "uint16_field",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 10,
        rawValue: 10
      }),
      makeDataField({
        id: "field-fractional",
        number: 3,
        name: "fractional_field",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 10,
        rawValue: 10
      })
    ]);

    const draft = updateDraftFieldValue(
      updateDraftFieldValue(
        updateDraftFieldValue(createMessageEditDraft(message), "field-uint8", 0, "300"),
        "field-uint16",
        0,
        "-1"
      ),
      "field-fractional",
      0,
      "1.5"
    );

    expect(getDraftFieldIssues(draft.fieldsById["field-uint8"])).toContain("uint8_field must be between 0 and 255.");
    expect(getDraftFieldIssues(draft.fieldsById["field-uint16"])).toContain("uint16_field must be between 0 and 65535.");
    expect(getDraftFieldIssues(draft.fieldsById["field-fractional"])).toContain("fractional_field must be a whole number.");
    expect(getDraftIssues(draft)).toEqual([
      {
        messageId: message.id,
        fieldId: "field-uint8",
        fieldNumber: 1,
        fieldName: "uint8_field",
        exportBlocking: true,
        messages: ["uint8_field must be between 0 and 255."]
      },
      {
        messageId: message.id,
        fieldId: "field-uint16",
        fieldNumber: 2,
        fieldName: "uint16_field",
        exportBlocking: true,
        messages: ["uint16_field must be between 0 and 65535."]
      },
      {
        messageId: message.id,
        fieldId: "field-fractional",
        fieldNumber: 3,
        fieldName: "fractional_field",
        exportBlocking: true,
        messages: ["fractional_field must be a whole number."]
      }
    ]);
  });

  it("seeds the draft with applied edits", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-speed",
        number: 2,
        name: "speed",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 12,
        rawValue: 12,
        units: "m/s"
      })
    ]);

    const appliedEdits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      }
    ];
    const draft = createMessageEditDraft(message, appliedEdits);

    expect(draft.fieldsById["field-speed"].textValues).toEqual(["15"]);
    expect(countDraftChangedFields(draft)).toBe(0);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual<FitFieldValueEdit[]>([
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      }
    ]);
  });

  it("omits a field when it is reverted to the original document value", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-speed",
        number: 2,
        name: "speed",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 12,
        rawValue: 12,
        units: "m/s"
      })
    ]);

    const appliedEdits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldId: "field-speed",
        fieldNumber: 2,
        value: 15
      }
    ];
    const draft = updateDraftFieldValue(createMessageEditDraft(message, appliedEdits), "field-speed", 0, "12");

    expect(countDraftChangedFields(draft)).toBe(1);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual([]);
  });

  it("seeds and emits a raw added field edit", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-heart-rate",
        number: 1,
        name: "heart_rate",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 145,
        rawValue: 145
      })
    ]);

    const appliedEdits: FitFieldValueEdit[] = [
      {
        messageId: message.id,
        fieldNumber: 200,
        fieldName: "custom_bytes",
        baseType: 0x02,
        baseTypeName: "uint8",
        size: 2,
        added: true,
        value: [7, 8]
      }
    ];

    const draft = createMessageEditDraft(message, appliedEdits);
    const addedField = draft.fieldsById[`added:${message.id}:200:custom_bytes`];

    expect(addedField).toMatchObject({
      added: true,
      fieldNumber: 200,
      fieldName: "custom_bytes",
      baseType: 0x02,
      baseTypeName: "uint8",
      size: 2,
      textValues: ["7", "8"]
    });
    expect(getRawAddedFieldDraftIssues(addedField, draft)).toEqual([]);
    expect(countDraftChangedFields(draft)).toBe(1);
    expect(buildFieldValueEditsFromDraft(draft)).toEqual<FitFieldValueEdit[]>([
      {
        messageId: message.id,
        fieldId: addedField.fieldId,
        fieldNumber: 200,
        fieldName: "custom_bytes",
        baseType: 0x02,
        baseTypeName: "uint8",
        size: 2,
        added: true,
        value: [7, 8]
      }
    ]);
  });

  it("rejects overlong raw added string fields", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-heart-rate",
        number: 1,
        name: "heart_rate",
        baseTypeName: "uint8",
        baseType: 0x02,
        size: 1,
        value: 145,
        rawValue: 145
      })
    ]);

    const draft = createMessageEditDraft(message);
    const addedField = createRawAddedFieldDraft(message.id, {
      fieldNumber: 200,
      fieldName: "custom_label",
      baseTypeName: "string",
      baseType: 0x07,
      size: 4,
      textValues: ["hello"]
    });

    expect(getRawAddedFieldDraftIssues(addedField, draft)).toContain(
      "custom_label string value must be at most 4 bytes."
    );
    expect(getDraftIssues({
      ...draft,
      fieldOrder: [...draft.fieldOrder, addedField.fieldId],
      fieldsById: {
        ...draft.fieldsById,
        [addedField.fieldId]: addedField
      }
    })).toEqual([
      {
        messageId: message.id,
        fieldId: addedField.fieldId,
        fieldNumber: 200,
        fieldName: "custom_label",
        exportBlocking: true,
        messages: ["custom_label string value must be at most 4 bytes."]
      }
    ]);
  });

  it("blocks raw added fields that reuse an existing normal field number", () => {
    const message = makeMessage([
      makeDataField({
        id: "field-power",
        number: 3,
        name: "power",
        baseTypeName: "uint16",
        baseType: 0x84,
        size: 2,
        value: 250,
        rawValue: 250,
        units: "watts"
      })
    ]);

    const draft = createMessageEditDraft(message);
    const addedField = createRawAddedFieldDraft(message.id, {
      fieldNumber: 3,
      fieldName: "custom_power",
      baseTypeName: "uint8",
      baseType: 0x02,
      size: 1,
      textValues: ["7"]
    });

    expect(getRawAddedFieldDraftIssues(addedField, draft)).toContain(
      "custom_power field number already exists in this message."
    );
    expect(getDraftIssues({
      ...draft,
      fieldOrder: [...draft.fieldOrder, addedField.fieldId],
      fieldsById: {
        ...draft.fieldsById,
        [addedField.fieldId]: addedField
      }
    })).toEqual([
      {
        messageId: message.id,
        fieldId: addedField.fieldId,
        fieldNumber: 3,
        fieldName: "custom_power",
        exportBlocking: true,
        messages: ["custom_power field number already exists in this message."]
      }
    ]);
  });

  it("validates raw inserted messages with invalid message and field inputs", () => {
    const issues = validateRawInsertedMessageInput({
      globalMessageNumber: 70000,
      fields: [
        {
          fieldNumber: 1,
          fieldName: "",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          textValues: ["7"]
        },
        {
          fieldNumber: 1,
          fieldName: "duplicate_field",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 1,
          textValues: ["8"]
        },
        {
          fieldNumber: 2,
          fieldName: "bad_base",
          baseTypeName: "not-a-base-type",
          baseType: 0xff as unknown as number,
          size: 1,
          textValues: ["1"]
        },
        {
          fieldNumber: 3,
          fieldName: "bad_string",
          baseTypeName: "string",
          baseType: 0x07,
          size: 4,
          textValues: ["hello"]
        }
      ]
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldName: "unknown_message_70000",
          exportBlocking: true,
          messages: ["Message number must be between 0 and 65534."]
        }),
        expect.objectContaining({
          fieldNumber: 1,
          fieldName: "duplicate_field",
          messages: ["Field number already exists in this message."]
        }),
        expect.objectContaining({
          fieldNumber: 2,
          fieldName: "bad_base",
          messages: ["Base type must be a valid FIT base type."]
        }),
        expect.objectContaining({
          fieldNumber: 3,
          fieldName: "bad_string",
          messages: ["bad_string string value must be at most 4 bytes."]
        })
      ])
    );
  });

  it("blocks raw inserted messages with more fields than a FIT definition can encode", () => {
    const fields = Array.from({ length: 256 }, (_, fieldNumber) => ({
      fieldNumber,
      fieldName: `field_${fieldNumber}`,
      baseTypeName: "uint8",
      baseType: 0x02,
      size: 1,
      textValues: ["1"]
    }));

    const issues = validateRawInsertedMessageInput({
      globalMessageNumber: 900,
      fields
    });

    expect(issues).toEqual([
      expect.objectContaining({
        fieldName: "unknown_message_900",
        exportBlocking: true,
        messages: ["A FIT definition can contain at most 255 normal fields."]
      })
    ]);
    expect(() =>
      createRawInsertedMessage("raw-too-many-fields", {
        globalMessageNumber: 900,
        fields
      })
    ).toThrow("A FIT definition can contain at most 255 normal fields.");
  });

  it("builds a synthetic raw inserted FIT record with normal fields only", () => {
    const record = createRawInsertedMessage("raw-message-1", {
      globalMessageNumber: 900,
      label: "raw_label",
      fields: [
        {
          fieldNumber: 7,
          fieldName: "custom_value",
          baseTypeName: "uint8",
          baseType: 0x02,
          size: 2,
          textValues: ["7", "8"]
        },
        {
          fieldNumber: 8,
          fieldName: "custom_label",
          baseTypeName: "string",
          baseType: 0x07,
          size: 5,
          textValues: ["abc"]
        }
      ]
    });

    expect(record).toMatchObject({
      id: "raw-message-1",
      globalMessageNumber: 900,
      messageName: "raw_label"
    });
    expect(record.fields).toHaveLength(2);
    expect(record.fields.every((field) => field.added)).toBe(true);
    expect(record.fields.map((field) => field.number)).toEqual([7, 8]);
    expect(record.fields[0]).toMatchObject({
      name: "custom_value",
      value: [7, 8],
      rawValue: [7, 8]
    });
    expect(record.fields[1]).toMatchObject({
      name: "custom_label",
      value: "abc",
      rawValue: "abc"
    });
  });
});

function makeMessage(fields: readonly FitField[]): FitDataRecord {
  return {
    kind: "data",
    id: "message-1",
    order: 0,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: 20,
    messageName: "record",
    definitionId: "definition-1",
    fields: [...fields],
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

function makeDeveloperField(overrides: {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly size: number;
  readonly value: FitField["value"];
  readonly rawValue: FitField["rawValue"];
  readonly developerDataIndex: number;
}): FitField {
  return {
    id: overrides.id,
    number: overrides.number,
    name: overrides.name,
    size: overrides.size,
    value: overrides.value,
    rawValue: overrides.rawValue,
    developerDataIndex: overrides.developerDataIndex,
    span: { start: 0, end: 0 },
    developer: true
  };
}

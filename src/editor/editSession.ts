import { parseNumericValue } from "../fit/validation";
import { FIT_BASE_TYPES } from "../fit/baseTypes";
import type { ResolvedProfileFieldMetadata } from "../fit/profile";
import type {
  FitDataRecord,
  FitField,
  FitFieldValueEdit,
  FitScalarValue,
  FitValue
} from "../fit/types";

export interface FitFieldEditDraft {
  readonly fieldId: string;
  readonly fieldNumber: number;
  readonly fieldName: string;
  readonly baseTypeName: string;
  readonly baseType?: number;
  readonly size?: number;
  readonly units?: string;
  readonly developer: boolean;
  readonly added?: true;
  readonly developerDataIndex?: number;
  readonly initialTextValues: readonly string[];
  readonly originalTextValues: readonly string[];
  readonly textValues: readonly string[];
}

export interface FitMessageEditDraft {
  readonly messageId: string;
  readonly messageName: string;
  readonly globalMessageNumber: number;
  readonly fieldOrder: readonly string[];
  readonly fieldsById: Readonly<Record<string, FitFieldEditDraft>>;
}

export interface FitDraftIssue {
  readonly messageId: string;
  readonly fieldId: string;
  readonly fieldNumber: number;
  readonly fieldName: string;
  readonly exportBlocking: boolean;
  readonly messages: readonly string[];
}

export interface FitRawAddedFieldDraftInput {
  readonly fieldNumber: number;
  readonly fieldName: string;
  readonly baseTypeName: string;
  readonly baseType?: number;
  readonly size: number;
  readonly units?: string;
  readonly textValues: readonly string[];
}

export interface FitRawInsertedMessageInput {
  readonly globalMessageNumber: number;
  readonly messageName?: string;
  readonly label?: string;
  readonly fields: readonly FitRawAddedFieldDraftInput[];
}

export interface FitRawInsertedMessageIssue {
  readonly fieldId?: string;
  readonly fieldNumber?: number;
  readonly fieldName: string;
  readonly exportBlocking: boolean;
  readonly messages: readonly string[];
}

const BIGINT_BASE_TYPES = new Set(["sint64", "uint64", "uint64z"]);
const INTEGER_BASE_TYPES = new Set([
  "enum",
  "sint8",
  "uint8",
  "sint16",
  "uint16",
  "sint32",
  "uint32",
  "uint8z",
  "uint16z",
  "uint32z",
  "sint64",
  "uint64",
  "uint64z",
  "byte"
]);
const FLOAT_BASE_TYPES = new Set(["float32", "float64"]);
const NON_NEGATIVE_UNITS = new Set(["watts", "cycles", "bpm", "rpm", "kcal", "m/s", "mm", "ms", "m", "s"]);
const PERCENT_UNITS = new Set(["%", "percent"]);
const INTEGER_BASE_TYPE_RANGES: Record<string, { readonly min: number; readonly max: number }> = {
  enum: { min: 0, max: 255 },
  sint8: { min: -128, max: 127 },
  uint8: { min: 0, max: 255 },
  sint16: { min: -32768, max: 32767 },
  uint16: { min: 0, max: 65535 },
  sint32: { min: -2147483648, max: 2147483647 },
  uint32: { min: 0, max: 4294967295 },
  uint8z: { min: 0, max: 255 },
  uint16z: { min: 0, max: 65535 },
  uint32z: { min: 0, max: 4294967295 }
};
const BIGINT_BASE_TYPE_RANGES: Record<string, { readonly min: bigint; readonly max: bigint }> = {
  sint64: { min: -0x8000000000000000n, max: 0x7fffffffffffffffn },
  uint64: { min: 0n, max: 0xffffffffffffffffn },
  uint64z: { min: 0n, max: 0xffffffffffffffffn }
};

export function createMessageEditDraft(
  message: FitDataRecord,
  appliedEdits: readonly FitFieldValueEdit[] = []
): FitMessageEditDraft {
  const fieldsById: Record<string, FitFieldEditDraft> = {};
  const fieldOrder: string[] = [];
  const addedFieldEdits = appliedEdits.filter((edit) => edit.messageId === message.id && edit.added);

  for (const field of message.fields) {
    const seededValue = getSeededFieldValue(message.id, field, appliedEdits);
    const initialTextValues = toDraftTextValues(field, seededValue);
    const originalTextValues = toDraftTextValues(field, field.rawValue);
    const fieldDraft: FitFieldEditDraft = {
      fieldId: field.id,
      fieldNumber: field.number,
      fieldName: field.name,
      baseTypeName: field.developer ? "developer" : field.baseTypeName,
      baseType: field.developer ? undefined : field.baseType,
      size: field.size,
      units: normalizeUnits(field.developer ? undefined : field.units),
      developer: Boolean(field.developer),
      added: field.added ? true : undefined,
      developerDataIndex: field.developer ? field.developerDataIndex : undefined,
      initialTextValues,
      originalTextValues,
      textValues: initialTextValues
    };

    fieldsById[field.id] = fieldDraft;
    fieldOrder.push(field.id);
  }

  for (const edit of addedFieldEdits) {
    const fieldDraft = createAddedFieldDraftFromEdit(message.id, edit);
    fieldsById[fieldDraft.fieldId] = fieldDraft;
    fieldOrder.push(fieldDraft.fieldId);
  }

  return {
    messageId: message.id,
    messageName: message.messageName,
    globalMessageNumber: message.globalMessageNumber,
    fieldOrder,
    fieldsById
  };
}

export function updateDraftFieldValue(
  draft: FitMessageEditDraft,
  fieldId: string,
  valueIndex: number,
  nextText: string
): FitMessageEditDraft {
  const field = draft.fieldsById[fieldId];
  if (!field || valueIndex < 0) {
    return draft;
  }

  const currentTextValues = [...field.textValues];
  if (valueIndex >= currentTextValues.length) {
    return draft;
  }

  currentTextValues[valueIndex] = nextText;

  return {
    ...draft,
    fieldsById: {
      ...draft.fieldsById,
      [fieldId]: {
        ...field,
        textValues: currentTextValues
      }
    }
  };
}

export function createRawAddedFieldDraft(messageId: string, input: FitRawAddedFieldDraftInput): FitFieldEditDraft {
  const baseType = resolveBaseType(input.baseType, input.baseTypeName);
  return {
    fieldId: makeAddedFieldDraftId(messageId, input.fieldNumber, input.fieldName),
    fieldNumber: input.fieldNumber,
    fieldName: input.fieldName,
    baseTypeName: baseType.name,
    baseType: baseType.id,
    size: input.size,
    units: normalizeUnits(input.units),
    developer: false,
    added: true,
    initialTextValues: [...input.textValues],
    originalTextValues: [],
    textValues: [...input.textValues]
  };
}

export function validateRawInsertedMessageInput(
  input: FitRawInsertedMessageInput,
): readonly FitRawInsertedMessageIssue[] {
  const messageName = normalizeRawInsertedMessageName(input);
  const issues: FitRawInsertedMessageIssue[] = [];
  const fieldNumbers = new Set<number>();
  const hasValidMessageNumber = Number.isInteger(input.globalMessageNumber) && input.globalMessageNumber >= 0 && input.globalMessageNumber <= 0xffff - 1;

  if (!hasValidMessageNumber) {
    issues.push({
      fieldName: messageName,
      exportBlocking: true,
      messages: ["Message number must be between 0 and 65534."]
    });
  }

  if (input.fields.length === 0) {
    issues.push({
      fieldName: messageName,
      exportBlocking: true,
      messages: ["At least one normal field is required."]
    });
  }

  if (input.fields.length > 255) {
    issues.push({
      fieldName: messageName,
      exportBlocking: true,
      messages: ["A FIT definition can contain at most 255 normal fields."]
    });
  }

  for (const fieldInput of input.fields) {
    const fieldName = normalizeRawFieldName(fieldInput.fieldName, fieldInput.fieldNumber);
    if (fieldNumbers.has(fieldInput.fieldNumber)) {
      issues.push({
        fieldNumber: fieldInput.fieldNumber,
        fieldName,
        exportBlocking: true,
        messages: ["Field number already exists in this message."]
      });
      continue;
    }
    fieldNumbers.add(fieldInput.fieldNumber);

    const fieldIssues = validateRawInsertedFieldInput(fieldInput);
    for (const fieldIssue of fieldIssues) {
      issues.push({
        fieldNumber: fieldInput.fieldNumber,
        fieldName,
        exportBlocking: fieldIssue.exportBlocking,
        messages: fieldIssue.messages
      });
    }
  }

  return issues;
}

export function createRawInsertedMessage(
  messageId: string,
  input: FitRawInsertedMessageInput,
): FitDataRecord {
  const issues = validateRawInsertedMessageInput(input);
  if (issues.length > 0) {
    throw new Error(formatRawInsertedMessageIssues(issues));
  }

  const messageName = normalizeRawInsertedMessageName(input);
  const message: FitDataRecord = {
    kind: "data",
    id: messageId,
    order: 0,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: input.globalMessageNumber,
    messageName,
    definitionId: `raw-definition:${messageId}`,
    fields: [],
    span: { start: 0, end: 0 }
  };

  return {
    ...message,
    fields: input.fields.map((fieldInput) => createRawInsertedField(message, fieldInput))
  };
}

export function appendRawAddedFieldDraft(draft: FitMessageEditDraft, fieldDraft: FitFieldEditDraft): FitMessageEditDraft {
  if (!fieldDraft.added) {
    return draft;
  }

  const nextFieldsById = {
    ...draft.fieldsById,
    [fieldDraft.fieldId]: fieldDraft
  };
  const nextFieldOrder = draft.fieldOrder.filter((fieldId) => fieldId !== fieldDraft.fieldId);
  nextFieldOrder.push(fieldDraft.fieldId);

  return {
    ...draft,
    fieldOrder: nextFieldOrder,
    fieldsById: nextFieldsById
  };
}

export function getRawAddedFieldDraftIssues(fieldDraft: FitFieldEditDraft, draft: FitMessageEditDraft): readonly string[] {
  return validateRawAddedFieldDraft(fieldDraft, draft).messages;
}

export function getDraftFieldIssues(fieldDraft: FitFieldEditDraft, draft?: FitMessageEditDraft): readonly string[] {
  const messages = [...validateDraftField(fieldDraft).messages];
  if (fieldDraft.added && draft) {
    messages.push(...validateRawAddedFieldDraft(fieldDraft, draft).messages);
  }
  return messages;
}

export function getDraftIssues(draft: FitMessageEditDraft): FitDraftIssue[] {
  const issues: FitDraftIssue[] = [];

  for (const fieldId of draft.fieldOrder) {
    const field = draft.fieldsById[fieldId];
    if (!field) {
      continue;
    }

    const validation = validateDraftField(field);
    const rawValidation = field.added ? validateRawAddedFieldDraft(field, draft) : null;
    const messages = [...validation.messages, ...(rawValidation?.messages ?? [])];
    if (messages.length === 0) {
      continue;
    }

    issues.push({
      messageId: draft.messageId,
      fieldId: field.fieldId,
      fieldNumber: field.fieldNumber,
      fieldName: field.fieldName,
      exportBlocking: validation.exportBlocking || (rawValidation?.exportBlocking ?? false),
      messages
    });
  }

  return issues;
}

export function buildFieldValueEditsFromDraft(draft: FitMessageEditDraft): FitFieldValueEdit[] {
  const edits: FitFieldValueEdit[] = [];

  for (const fieldId of draft.fieldOrder) {
    const field = draft.fieldsById[fieldId];
    if (!field || !hasFieldChangedFromBaseline(field, field.originalTextValues)) {
      continue;
    }

    const value = normalizeDraftFieldValue(field);
    const edit: FitFieldValueEdit = field.added
      ? {
          messageId: draft.messageId,
          fieldId: field.fieldId,
          fieldNumber: field.fieldNumber,
          fieldName: field.fieldName,
          baseType: field.baseType,
          baseTypeName: field.baseTypeName,
          size: field.size,
          units: field.units,
          added: true,
          value
        }
      : {
          messageId: draft.messageId,
          fieldId: field.fieldId,
          fieldNumber: field.fieldNumber,
          value,
          ...(field.developer
            ? {
                developer: true,
                developerDataIndex: field.developerDataIndex
              }
            : {})
        };

    edits.push(edit);
  }

  return edits;
}

export function countDraftChangedFields(draft: FitMessageEditDraft): number {
  let count = 0;
  for (const fieldId of draft.fieldOrder) {
    const field = draft.fieldsById[fieldId];
    if (field && (field.added || hasFieldChangedFromBaseline(field, field.initialTextValues))) {
      count += 1;
    }
  }
  return count;
}

export function buildMessageSnapshotFromAppliedEdits(
  message: FitDataRecord,
  appliedEdits: readonly FitFieldValueEdit[] = [],
  messageId = message.id,
): FitDataRecord {
  const draft = createMessageEditDraft(message, appliedEdits);
  return buildMessageSnapshotFromDraft(message, draft, messageId);
}

function createAddedFieldDraftFromEdit(messageId: string, edit: FitFieldValueEdit): FitFieldEditDraft {
  const baseType = resolveBaseType(edit.baseType, edit.baseTypeName);
  const baseTypeName = baseType.name;
  const size = edit.size ?? inferAddedFieldSize(baseTypeName, edit.value);
  const textValues = toDraftTextValuesFromValue(baseTypeName, edit.value);

  return {
    fieldId: edit.fieldId ?? makeAddedFieldDraftId(messageId, edit.fieldNumber, edit.fieldName ?? `added_field_${edit.fieldNumber}`),
    fieldNumber: edit.fieldNumber,
    fieldName: edit.fieldName ?? `added_field_${edit.fieldNumber}`,
    baseTypeName,
    baseType: baseType.id,
    size,
    units: normalizeUnits(edit.units),
    developer: false,
    added: true,
    initialTextValues: textValues,
    originalTextValues: [],
    textValues
  };
}

function buildMessageSnapshotFromDraft(
  message: FitDataRecord,
  draft: FitMessageEditDraft,
  messageId: string,
): FitDataRecord {
  const fields: FitField[] = [];

  for (const fieldId of draft.fieldOrder) {
    const fieldDraft = draft.fieldsById[fieldId];
    if (!fieldDraft) {
      continue;
    }

    const value = normalizeDraftFieldValue(fieldDraft);
    if (fieldDraft.added) {
      fields.push(createSyntheticAddedField(message, fieldDraft, value));
      continue;
    }

    const sourceField = message.fields.find((candidate) => candidate.id === fieldDraft.fieldId);
    if (!sourceField) {
      continue;
    }

    fields.push({
      ...sourceField,
      value,
      rawValue: value,
      added: sourceField.added
    });
  }

  return {
    ...message,
    id: messageId,
    fields
  };
}

function createSyntheticAddedField(
  message: FitDataRecord,
  fieldDraft: FitFieldEditDraft,
  value: FitValue,
): FitField {
  return {
    id: fieldDraft.fieldId,
    number: fieldDraft.fieldNumber,
    name: fieldDraft.fieldName,
    baseType: fieldDraft.baseType ?? 0x0d,
    baseTypeName: fieldDraft.baseTypeName,
    size: fieldDraft.size ?? 0,
    value,
    rawValue: value,
    units: fieldDraft.units,
    known: false,
    profile: createSyntheticFieldProfile(message, fieldDraft),
    span: { start: 0, end: 0 },
    developer: false,
    added: true
  };
}

function createSyntheticFieldProfile(
  message: FitDataRecord,
  fieldDraft: FitFieldEditDraft,
): ResolvedProfileFieldMetadata {
  return {
    known: false,
    messageNumber: message.globalMessageNumber,
    messageName: message.messageName,
    number: fieldDraft.fieldNumber,
    name: fieldDraft.fieldName,
    baseType: fieldDraft.baseTypeName,
    size: fieldDraft.size ?? 0,
    values: [],
    units: fieldDraft.units,
    comment: "Synthetic FIT field created for export."
  };
}

function createRawInsertedField(
  message: FitDataRecord,
  fieldInput: FitRawAddedFieldDraftInput,
): FitField {
  const normalizedFieldInput = {
    ...fieldInput,
    fieldName: normalizeRawFieldName(fieldInput.fieldName, fieldInput.fieldNumber)
  };
  const fieldDraft = createRawAddedFieldDraft(message.id, normalizedFieldInput);
  const value = normalizeDraftFieldValue(fieldDraft);
  return createSyntheticAddedField(message, fieldDraft, value);
}

function inferAddedFieldSize(baseTypeName: string, value: FitValue): number {
  if (baseTypeName === "string") {
    return Array.isArray(value)
      ? value.reduce<number>((total, item) => total + scalarToText(item).length, 0)
      : scalarToText(value).length;
  }

  return countFitValueItems(value) * getFitBaseTypeSizeByName(baseTypeName);
}

function countFitValueItems(value: FitValue): number {
  return Array.isArray(value) ? value.length : 1;
}

function getFitBaseTypeSizeByName(baseTypeName: string): number {
  const baseType = Object.values(FIT_BASE_TYPES).find((candidate) => candidate.name === baseTypeName);
  return baseType?.size ?? 1;
}

function toDraftTextValuesFromValue(baseTypeName: string, value: FitValue): string[] {
  if (baseTypeName === "string") {
    if (Array.isArray(value)) {
      return [value.map((item) => scalarToText(item)).join("")];
    }

    return [scalarToText(value)];
  }

  if (Array.isArray(value)) {
    return value.map((item) => scalarToText(item));
  }

  return [scalarToText(value)];
}

function makeAddedFieldDraftId(messageId: string, fieldNumber: number, fieldName: string): string {
  return `added:${messageId}:${fieldNumber}:${fieldName}`;
}

function resolveBaseType(baseType: number | undefined, baseTypeName: string | undefined): { readonly id: number; readonly name: string } {
  if (typeof baseType === "number" && FIT_BASE_TYPES[baseType]) {
    return FIT_BASE_TYPES[baseType];
  }

  if (baseTypeName) {
    const resolved = Object.values(FIT_BASE_TYPES).find((candidate) => candidate.name === baseTypeName);
    if (resolved) {
      return resolved;
    }
  }

  return FIT_BASE_TYPES[0x0d];
}

function validateRawInsertedFieldInput(
  fieldInput: FitRawAddedFieldDraftInput,
): { readonly messages: readonly string[]; readonly exportBlocking: boolean }[] {
  const issues: { readonly messages: readonly string[]; readonly exportBlocking: boolean }[] = [];
  const resolvedBaseType = resolveStrictBaseType(fieldInput.baseType, fieldInput.baseTypeName);
  if (!resolvedBaseType) {
    return [{
      exportBlocking: true,
      messages: ["Base type must be a valid FIT base type."]
    }];
  }

  const fieldDraft = createRawAddedFieldDraft("raw-message", {
    ...fieldInput,
    fieldName: normalizeRawFieldName(fieldInput.fieldName, fieldInput.fieldNumber),
    baseType: resolvedBaseType.id,
    baseTypeName: resolvedBaseType.name
  });

  const validation = getRawAddedFieldDraftIssues(fieldDraft, {
    messageId: "raw-message",
    messageName: "raw_message",
    globalMessageNumber: 0,
    fieldOrder: [fieldDraft.fieldId],
    fieldsById: {
      [fieldDraft.fieldId]: fieldDraft
    }
  });

  if (validation.length === 0) {
    return issues;
  }

  return [
    {
      exportBlocking: true,
      messages: validation
    }
  ];
}

function resolveStrictBaseType(
  baseType: number | undefined,
  baseTypeName: string | undefined,
): { readonly id: number; readonly name: string } | null {
  if (typeof baseType === "number" && FIT_BASE_TYPES[baseType]) {
    return FIT_BASE_TYPES[baseType];
  }

  if (baseTypeName) {
    const resolved = Object.values(FIT_BASE_TYPES).find((candidate) => candidate.name === baseTypeName);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function normalizeRawInsertedMessageName(input: FitRawInsertedMessageInput): string {
  const preferredName = input.messageName ?? input.label;
  if (typeof preferredName === "string" && preferredName.trim().length > 0) {
    return preferredName.trim();
  }

  return Number.isInteger(input.globalMessageNumber)
    ? `unknown_message_${input.globalMessageNumber}`
    : "unknown_message";
}

function normalizeRawFieldName(fieldName: string, fieldNumber: number): string {
  const trimmed = fieldName.trim();
  return trimmed.length > 0 ? trimmed : `unknown_field_${fieldNumber}`;
}

function formatRawInsertedMessageIssues(issues: readonly FitRawInsertedMessageIssue[]): string {
  return `Raw inserted message validation failed: ${issues.flatMap((issue) => issue.messages).join(" ")}`;
}

function validateRawAddedFieldDraft(
  fieldDraft: FitFieldEditDraft,
  draft: FitMessageEditDraft
): { readonly messages: readonly string[]; readonly exportBlocking: boolean } {
  const messages: string[] = [];
  let exportBlocking = false;
  const fieldLabel = fieldDraft.fieldName;

  const addBlockingIssue = (message: string) => {
    messages.push(message);
    exportBlocking = true;
  };

  if (!Number.isInteger(fieldDraft.fieldNumber) || fieldDraft.fieldNumber < 0 || fieldDraft.fieldNumber > 255) {
    addBlockingIssue(`${fieldLabel} field number must be between 0 and 255.`);
  }

  if (fieldLabel.trim().length === 0) {
    addBlockingIssue("Field name is required.");
  }

  if (typeof fieldDraft.baseType !== "number" || !FIT_BASE_TYPES[fieldDraft.baseType]) {
    addBlockingIssue(`${fieldLabel} base type must be a valid FIT base type.`);
  }

  if (!Number.isInteger(fieldDraft.size) || fieldDraft.size === undefined || fieldDraft.size < 1 || fieldDraft.size > 255) {
    addBlockingIssue(`${fieldLabel} size must be between 1 and 255.`);
  }

  const duplicateField = draft.fieldOrder
    .map((fieldId) => draft.fieldsById[fieldId])
    .find((candidate) => Boolean(candidate) && candidate.fieldId !== fieldDraft.fieldId && !candidate.developer && candidate.fieldNumber === fieldDraft.fieldNumber);
  if (duplicateField) {
    addBlockingIssue(`${fieldLabel} field number already exists in this message.`);
  }

  const expectedValueCount = getExpectedAddedFieldValueCount(fieldDraft);
  if (expectedValueCount === null) {
    addBlockingIssue(`${fieldLabel} value count cannot be derived from the selected base type and size.`);
  } else if (fieldDraft.textValues.length !== expectedValueCount) {
    addBlockingIssue(`${fieldLabel} requires ${expectedValueCount} value${expectedValueCount === 1 ? "" : "s"}.`);
  }

  const fieldSize = fieldDraft.size;
  if (
    fieldDraft.baseTypeName === "string" &&
    Number.isInteger(fieldSize) &&
    fieldSize !== undefined &&
    fieldSize > 0 &&
    fieldDraft.textValues.join("").length > fieldSize
  ) {
    addBlockingIssue(`${fieldLabel} string value must be at most ${fieldSize} byte${fieldSize === 1 ? "" : "s"}.`);
  }

  return { messages, exportBlocking };
}

function getExpectedAddedFieldValueCount(fieldDraft: FitFieldEditDraft): number | null {
  const baseTypeName = fieldDraft.baseTypeName;
  if (!baseTypeName || typeof fieldDraft.size !== "number") {
    return null;
  }

  if (baseTypeName === "string") {
    return 1;
  }

  const baseTypeSize = getFitBaseTypeSizeByName(baseTypeName);
  if (baseTypeSize <= 0 || fieldDraft.size % baseTypeSize !== 0) {
    return null;
  }

  return fieldDraft.size / baseTypeSize;
}

function getSeededFieldValue(messageId: string, field: FitField, appliedEdits: readonly FitFieldValueEdit[]): FitValue {
  let seededValue: FitValue = field.rawValue;

  for (const edit of appliedEdits) {
    if (!doesAppliedEditMatchField(messageId, field, edit)) {
      continue;
    }

    seededValue = edit.value;
  }

  return seededValue;
}

function doesAppliedEditMatchField(messageId: string, field: FitField, edit: FitFieldValueEdit): boolean {
  if (edit.fieldId && edit.fieldId === field.id) {
    return true;
  }

  if (edit.messageId !== messageId || edit.fieldNumber !== field.number) {
    return false;
  }

  if (Boolean(edit.developer) !== Boolean(field.developer)) {
    return false;
  }

  if (field.developer) {
    return edit.developerDataIndex === field.developerDataIndex;
  }

  return true;
}

function hasFieldChangedFromBaseline(field: FitFieldEditDraft, baselineTextValues: readonly string[]): boolean {
  return !valuesAreEqual(normalizeDraftFieldValue(field, baselineTextValues), normalizeDraftFieldValue(field));
}

function validateDraftField(fieldDraft: FitFieldEditDraft): { readonly messages: readonly string[]; readonly exportBlocking: boolean } {
  const messages: string[] = [];
  let exportBlocking = false;
  const fieldLabel = fieldDraft.fieldName;
  const values = fieldDraft.textValues;

  const addBlockingIssue = (message: string) => {
    messages.push(message);
    exportBlocking = true;
  };

  const addWarningIssue = (message: string) => {
    messages.push(message);
  };

  if (fieldDraft.baseTypeName === "string") {
    return { messages, exportBlocking };
  }

  if (fieldDraft.developer || fieldDraft.baseTypeName === "byte") {
    for (let index = 0; index < values.length; index += 1) {
      const parsed = parseNumericValue(values[index]);
      if (parsed === null || !Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
        addBlockingIssue(buildValueIssue(fieldLabel, index, "must be an integer byte between 0 and 255."));
      }
    }
    return { messages, exportBlocking };
  }

  if (BIGINT_BASE_TYPES.has(fieldDraft.baseTypeName)) {
    for (let index = 0; index < values.length; index += 1) {
      const parsed = parseBigIntText(values[index]);
      if (parsed === undefined) {
        addBlockingIssue(buildValueIssue(fieldLabel, index, "must be a whole number."));
        continue;
      }

      const range = BIGINT_BASE_TYPE_RANGES[fieldDraft.baseTypeName];
      if (range && (parsed < range.min || parsed > range.max)) {
        addBlockingIssue(buildValueIssue(fieldLabel, index, buildRangeSuffix(range.min, range.max)));
        continue;
      }

      if (PERCENT_UNITS.has(normalizeUnits(fieldDraft.units) ?? "")) {
        if (parsed < 0n || parsed > 100n) {
          addWarningIssue(buildValueIssue(fieldLabel, index, "must be between 0 and 100."));
          continue;
        }
      }

      if (isNonNegativeUnit(fieldDraft.units) && parsed < 0n) {
        addWarningIssue(buildValueIssue(fieldLabel, index, "must be zero or greater."));
      }
    }

    return { messages, exportBlocking };
  }

  if (FLOAT_BASE_TYPES.has(fieldDraft.baseTypeName) || INTEGER_BASE_TYPES.has(fieldDraft.baseTypeName)) {
    for (let index = 0; index < values.length; index += 1) {
      const parsed = parseNumericValue(values[index]);
      if (parsed === null) {
        addBlockingIssue(buildValueIssue(fieldLabel, index, "must be a valid number."));
        continue;
      }

      if (INTEGER_BASE_TYPES.has(fieldDraft.baseTypeName) && !Number.isInteger(parsed)) {
        addBlockingIssue(buildValueIssue(fieldLabel, index, "must be a whole number."));
        continue;
      }

      if (INTEGER_BASE_TYPES.has(fieldDraft.baseTypeName)) {
        const range = INTEGER_BASE_TYPE_RANGES[fieldDraft.baseTypeName];
        if (range && (parsed < range.min || parsed > range.max)) {
          addBlockingIssue(buildValueIssue(fieldLabel, index, buildRangeSuffix(range.min, range.max)));
          continue;
        }
      }

      if (PERCENT_UNITS.has(normalizeUnits(fieldDraft.units) ?? "") && (parsed < 0 || parsed > 100)) {
        addWarningIssue(buildValueIssue(fieldLabel, index, "must be between 0 and 100."));
        continue;
      }

      if (isNonNegativeUnit(fieldDraft.units) && parsed < 0) {
        addWarningIssue(buildValueIssue(fieldLabel, index, "must be zero or greater."));
      }
    }
  }

  return { messages, exportBlocking };
}

function buildValueIssue(label: string, index: number, suffix: string): string {
  return index === 0 ? `${label} ${suffix}` : `${label} value ${index + 1} ${suffix}`;
}

function buildRangeSuffix(min: number | bigint, max: number | bigint): string {
  return `must be between ${min.toString()} and ${max.toString()}.`;
}

function normalizeDraftFieldValue(field: FitFieldEditDraft, textValues: readonly string[] = field.textValues): FitValue {
  if (!field.developer && "baseTypeName" in field && field.baseTypeName === "string") {
    return textValues.join("");
  }

  if (field.developer || field.baseTypeName === "byte") {
    return textValues.map((text) => normalizeByteValue(text));
  }

  const parsedValues = textValues.map((text) => normalizeScalarValue(field.baseTypeName, text));
  return parsedValues.length === 1 ? parsedValues[0] : parsedValues;
}

function normalizeScalarValue(baseTypeName: string, text: string): FitScalarValue {
  if (text.trim().length === 0) {
    return null;
  }

  if (BIGINT_BASE_TYPES.has(baseTypeName)) {
    const parsed = parseBigIntText(text);
    return parsed === undefined ? text : parsed;
  }

  const parsed = parseNumericValue(text);
  return parsed === null ? text : parsed;
}

function normalizeByteValue(text: string): number | string | null {
  if (text.trim().length === 0) {
    return null;
  }

  const parsed = parseNumericValue(text);
  if (parsed === null || !Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
    return text;
  }
  return parsed;
}

function toDraftTextValues(field: FitField, value: FitValue): string[] {
  const shouldUseArrayShape = field.developer || Array.isArray(field.rawValue) || Array.isArray(value);

  if (!field.developer && "baseTypeName" in field && field.baseTypeName === "string") {
    if (Array.isArray(value)) {
      return [value.map((item) => scalarToText(item)).join("")];
    }

    return [scalarToText(value)];
  }

  if (shouldUseArrayShape) {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => scalarToText(item));
  }

  if (Array.isArray(value)) {
    return [scalarToText(value[0] ?? null)];
  }

  return [scalarToText(value)];
}

function scalarToText(value: FitScalarValue): string {
  if (value === null) {
    return "";
  }

  return String(value);
}

function valuesAreEqual(left: FitValue, right: FitValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      if (!scalarValuesAreEqual(left[index], right[index])) {
        return false;
      }
    }

    return true;
  }

  return scalarValuesAreEqual(left, right);
}

function scalarValuesAreEqual(left: FitScalarValue, right: FitScalarValue): boolean {
  if (typeof left !== typeof right) {
    return false;
  }

  if (typeof left === "number" && typeof right === "number") {
    return Object.is(left, right);
  }

  return left === right;
}

function isNonNegativeUnit(units: string | undefined): boolean {
  const normalized = normalizeUnits(units);
  return normalized !== undefined && NON_NEGATIVE_UNITS.has(normalized);
}

function normalizeUnits(units: string | undefined): string | undefined {
  if (units === undefined) {
    return undefined;
  }

  const trimmed = units.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBigIntText(text: string): bigint | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    return BigInt(trimmed);
  } catch {
    return undefined;
  }
}

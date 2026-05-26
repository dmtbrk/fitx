import { fitValueToArray, getFitBaseType, writeInvalidFitValue, FIT_BASE_TYPES } from "./baseTypes";
import { calculateFitCrc, writeUint16Le } from "./crc";
import type { ResolvedProfileMessageMetadata } from "./profile";
import type {
  FitDataRecord,
  FitDefinitionRecord,
  FitDefinitionField,
  FitDocument,
  FitField,
  FitFieldValueEdit,
  FitInsertedMessage,
  FitRecord,
  FitValue
} from "./types";

export interface WriteFitDocumentOptions {
  readonly fieldEdits?: readonly FitFieldValueEdit[];
  readonly deletedMessageIds?: Iterable<string>;
  readonly insertedMessages?: readonly FitInsertedMessage[];
}

interface PreparedFieldEdits {
  readonly byFieldId: ReadonlyMap<string, FitValue>;
  readonly byMessageFieldKey: ReadonlyMap<string, FitValue>;
  readonly addedByMessageId: ReadonlyMap<string, readonly FitFieldValueEdit[]>;
}

interface PreparedInsertedMessages {
  readonly byAfterMessageId: ReadonlyMap<string, readonly FitInsertedMessage[]>;
  readonly byBeforeMessageId: ReadonlyMap<string, readonly FitInsertedMessage[]>;
}

const EMPTY_FIELD_EDITS: PreparedFieldEdits = {
  byFieldId: new Map(),
  byMessageFieldKey: new Map(),
  addedByMessageId: new Map(),
};

export function writeFitDocument(document: FitDocument, options: WriteFitDocumentOptions = {}): ArrayBuffer {
  const edits = prepareFieldEdits(options.fieldEdits ?? []);
  const deletedMessageIds = new Set(options.deletedMessageIds ?? []);
  const recordsById = new Map(
    document.records
      .filter((record): record is FitDataRecord => record.kind === "data")
      .map((record) => [record.id, record] as const),
  );
  const insertedMessages = prepareInsertedMessages(options.insertedMessages ?? [], recordsById, deletedMessageIds);

  const dataRecords = serializeRecords(
    document.records,
    document.definitions,
    edits,
    deletedMessageIds,
    insertedMessages,
    recordsById,
  );
  const output = new Uint8Array(document.header.headerSize + dataRecords.byteLength + 2);
  const view = new DataView(output.buffer);

  view.setUint8(0, document.header.headerSize);
  view.setUint8(1, document.header.protocolVersionRaw);
  view.setUint16(2, document.header.profileVersionRaw, true);
  view.setUint32(4, dataRecords.byteLength, true);
  output[8] = 0x2e;
  output[9] = 0x46;
  output[10] = 0x49;
  output[11] = 0x54;

  if (document.header.headerSize === 14) {
    writeUint16Le(output, 12, calculateFitCrc(output, 0, 12));
  }

  output.set(dataRecords, document.header.headerSize);
  writeUint16Le(output, output.byteLength - 2, calculateFitCrc(output, 0, output.byteLength - 2));
  return output.buffer;
}

function serializeRecords(
  records: readonly FitRecord[],
  definitions: readonly FitDefinitionRecord[],
  edits: PreparedFieldEdits,
  deletedMessageIds: ReadonlySet<string>,
  insertedMessages: PreparedInsertedMessages,
  recordsById: ReadonlyMap<string, FitDataRecord>,
): Uint8Array {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition] as const));
  const chunks: Uint8Array[] = [];

  for (const record of records) {
    if (record.kind === "data") {
      for (const insertedMessage of insertedMessages.byBeforeMessageId.get(record.id) ?? []) {
        chunks.push(...serializeInsertedMessage(insertedMessage, recordsById, definitionsById, edits));
      }
    }

    chunks.push(
      ...serializeRecord(
        record,
        definitionsById,
        edits,
        deletedMessageIds,
        insertedMessages.byAfterMessageId.get(record.id) ?? [],
        recordsById,
      ),
    );
  }

  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function serializeRecord(
  record: FitRecord,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
  edits: PreparedFieldEdits,
  deletedMessageIds: ReadonlySet<string>,
  insertedAfterRecord: readonly FitInsertedMessage[],
  recordsById: ReadonlyMap<string, FitDataRecord>,
): Uint8Array[] {
  if (record.kind === "definition") {
    return [serializeDefinitionRecord(record)];
  }
  if (deletedMessageIds.has(record.id)) {
    return [];
  }
  const definition = definitionsById.get(record.definitionId);
  if (!definition) {
    throw new Error(`Cannot write data record ${record.id}; missing definition ${record.definitionId}.`);
  }

  const addedFieldEdits = edits.addedByMessageId.get(record.id) ?? [];
  if (addedFieldEdits.length === 0) {
    const chunks = [serializeDataRecord(record, definition, edits)];
    for (const insertedMessage of insertedAfterRecord) {
      chunks.push(...serializeInsertedMessage(insertedMessage, recordsById, definitionsById, edits));
    }
    return chunks;
  }

  const extendedFields = [...definition.fields, ...addedFieldEdits.map((edit) => createAddedFieldDefinition(edit))];
  const extendedDefinition = { ...definition, fields: extendedFields };
  const chunks = [
    serializeDefinitionRecord(definition, extendedFields),
    serializeDataRecord(record, definition, edits, addedFieldEdits),
  ];

  for (const insertedMessage of insertedAfterRecord) {
    chunks.push(
      ...serializeInsertedMessage(
        insertedMessage,
        recordsById,
        definitionsById,
        edits,
        extendedDefinition,
      ),
    );
  }

  chunks.push(serializeDefinitionRecord(definition));
  return chunks;
}

function serializeInsertedMessage(
  insertedMessage: FitInsertedMessage,
  recordsById: ReadonlyMap<string, FitDataRecord>,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
  edits: PreparedFieldEdits,
  activeDefinition?: FitDefinitionRecord,
): Uint8Array[] {
  if (insertedMessage.origin === "raw") {
    return serializeRawInsertedMessage(insertedMessage, recordsById, definitionsById, activeDefinition);
  }

  return serializeDuplicateInsertedMessage(insertedMessage, recordsById, definitionsById, edits, activeDefinition);
}

function serializeDuplicateInsertedMessage(
  insertedMessage: FitInsertedMessage,
  recordsById: ReadonlyMap<string, FitDataRecord>,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
  edits: PreparedFieldEdits,
  activeDefinition?: FitDefinitionRecord,
): Uint8Array[] {
  const placement = activeDefinition ?? resolveInsertedMessageAnchor(
    insertedMessage,
    recordsById,
    definitionsById,
    "duplicate",
  ).definition;
  const source = resolveDuplicateSourceMessage(insertedMessage, recordsById, definitionsById);
  const sourceAddedFieldEdits = edits.addedByMessageId.get(source.record.id) ?? [];
  const sourceAddedFieldNumbers = new Set(sourceAddedFieldEdits.map((edit) => edit.fieldNumber));
  const duplicateAddedFields = insertedMessage.message.fields.filter((field) => field.added);
  const duplicateAddedFieldNumbers = new Set(duplicateAddedFields.map((field) => field.number));

  const sourceExtendedFields = sourceAddedFieldEdits.length > 0
    ? [...source.definition.fields, ...sourceAddedFieldEdits.map((edit) => createAddedFieldDefinition(edit))]
    : undefined;

  if (duplicateAddedFieldNumbers.size > 0) {
    if (!sourceExtendedFields) {
      throw new Error(`Cannot write inserted duplicate ${insertedMessage.id}; added fields require the source message to have an extended definition.`);
    }

    for (const fieldNumber of duplicateAddedFieldNumbers) {
      if (!sourceAddedFieldNumbers.has(fieldNumber)) {
        throw new Error(`Cannot write inserted duplicate ${insertedMessage.id}; added field ${fieldNumber} does not fit the source message shape.`);
      }
    }
  }

  const definition = {
    ...source.definition,
    id: `duplicate-definition:${insertedMessage.id}`,
    localMessageType: placement.localMessageType,
    fields: sourceExtendedFields ? [...sourceExtendedFields] : source.definition.fields,
  };
  const record = prepareInsertedRecord(insertedMessage.message, definition);

  return [
    serializeDefinitionRecord(definition),
    serializeDataRecord(record, definition, EMPTY_FIELD_EDITS),
    serializeDefinitionRecord(placement),
  ];
}

function serializeRawInsertedMessage(
  insertedMessage: FitInsertedMessage,
  recordsById: ReadonlyMap<string, FitDataRecord>,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
  activeDefinition?: FitDefinitionRecord,
): Uint8Array[] {
  const anchor = resolveInsertedMessageAnchor(
    insertedMessage,
    recordsById,
    definitionsById,
    "raw",
  );
  const placement = activeDefinition ?? anchor.definition;
  const definition = createRawInsertedDefinition(insertedMessage.message, placement);
  const record = prepareInsertedRecord(insertedMessage.message, definition);
  const restoreDefinition = serializeDefinitionRecord(placement);
  return [
    serializeDefinitionRecord(definition),
    serializeDataRecord(record, definition, EMPTY_FIELD_EDITS),
    restoreDefinition,
  ];
}

function resolveInsertedMessageAnchor(
  insertedMessage: FitInsertedMessage,
  recordsById: ReadonlyMap<string, FitDataRecord>,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
  kind: "duplicate" | "raw",
): { readonly record: FitDataRecord; readonly definition: FitDefinitionRecord } {
  const anchorIds = collectInsertedMessageAnchorIds(insertedMessage);
  for (const anchorRecordId of anchorIds) {
    const record = recordsById.get(anchorRecordId);
    if (!record) {
      continue;
    }

    const definition = definitionsById.get(record.definitionId);
    if (!definition) {
      continue;
    }

    return { record, definition };
  }

  throw new Error(`Cannot write inserted ${kind} ${insertedMessage.id}; no usable original data record was found for anchor message ${anchorIds.join(" or ") || "none"}.`);
}

function resolveDuplicateSourceMessage(
  insertedMessage: FitInsertedMessage,
  recordsById: ReadonlyMap<string, FitDataRecord>,
  definitionsById: ReadonlyMap<string, FitDefinitionRecord>,
): { readonly record: FitDataRecord; readonly definition: FitDefinitionRecord } {
  const sourceMessageId = insertedMessage.sourceMessageId;
  if (!sourceMessageId) {
    throw new Error(`Cannot write inserted duplicate ${insertedMessage.id}; source message is missing.`);
  }

  const record = recordsById.get(sourceMessageId);
  if (!record) {
    throw new Error(`Cannot write inserted duplicate ${insertedMessage.id}; source message ${sourceMessageId} was not found.`);
  }

  const definition = definitionsById.get(record.definitionId);
  if (!definition) {
    throw new Error(`Cannot write inserted duplicate ${insertedMessage.id}; missing source definition ${record.definitionId}.`);
  }

  return { record, definition };
}

function prepareInsertedRecord(
  record: FitDataRecord,
  definition: FitDefinitionRecord,
): FitDataRecord {
  return {
    ...record,
    definitionId: definition.id,
    recordHeaderKind: "normal",
    recordHeader: definition.localMessageType,
    compressedTimestampOffset: undefined,
  };
}

function serializeDefinitionRecord(record: FitDefinitionRecord, fields: readonly FitDefinitionField[] = record.fields): Uint8Array {
  if (fields.length > 0xff) {
    throw new Error(`Cannot write definition record ${record.id}; field count ${fields.length} exceeds FIT's one-byte limit of 255.`);
  }

  const size = 1 + 5 + fields.length * 3 + (record.hasDeveloperData ? 1 + record.developerFields.length * 3 : 0);
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  bytes[offset] = 0x40 | (record.hasDeveloperData ? 0x20 : 0x00) | (record.localMessageType & 0x0f);
  offset += 1;
  bytes[offset] = record.reserved;
  offset += 1;
  bytes[offset] = record.architecture;
  offset += 1;
  view.setUint16(offset, record.globalMessageNumber, record.littleEndian);
  offset += 2;
  bytes[offset] = fields.length;
  offset += 1;

  for (const field of fields) {
    bytes[offset] = field.number;
    bytes[offset + 1] = field.size;
    bytes[offset + 2] = field.baseType;
    offset += 3;
  }

  if (record.hasDeveloperData) {
    bytes[offset] = record.developerFields.length;
    offset += 1;
    for (const field of record.developerFields) {
      bytes[offset] = field.number;
      bytes[offset + 1] = field.size;
      bytes[offset + 2] = field.developerDataIndex;
      offset += 3;
    }
  }

  return bytes;
}

function serializeDataRecord(
  record: FitDataRecord,
  definition: FitDefinitionRecord,
  edits: PreparedFieldEdits,
  addedFieldEdits: readonly FitFieldValueEdit[] = []
): Uint8Array {
  const size = 1 +
    definition.fields.reduce((total, field) => total + field.size, 0) +
    definition.developerFields.reduce((total, field) => total + field.size, 0) +
    addedFieldEdits.reduce((total, field) => total + resolveAddedFieldSize(field), 0);
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  const normalFields = indexNormalFields(record);
  const developerFields = indexDeveloperFields(record);
  const addedFieldNumbers = new Set<number>();
  let offset = 0;
  bytes[offset] = record.recordHeader;
  offset += 1;

  for (const fieldDefinition of definition.fields) {
    const field = normalFields.get(fieldDefinition.number);
    if (!field) {
      throw new Error(`Cannot write data record ${record.id}; missing field ${fieldDefinition.number}.`);
    }
    if (field.size !== fieldDefinition.size) {
      throw new Error(`Cannot write data record ${record.id}; field ${field.number} size does not match its definition.`);
    }
    encodeFieldValue(
      view,
      offset,
      field,
      getFieldWriteValue(record, field, edits),
      definition.littleEndian,
    );
    offset += fieldDefinition.size;
  }

  for (const fieldEdit of addedFieldEdits) {
    if (addedFieldNumbers.has(fieldEdit.fieldNumber)) {
      throw new Error(`Cannot write data record ${record.id}; duplicate added field number ${fieldEdit.fieldNumber}.`);
    }
    addedFieldNumbers.add(fieldEdit.fieldNumber);

    if (definition.fields.some((field) => field.number === fieldEdit.fieldNumber)) {
      throw new Error(`Cannot write data record ${record.id}; added field ${fieldEdit.fieldNumber} duplicates an existing field.`);
    }

    const fieldDefinition = createAddedFieldDefinition(fieldEdit);
    encodeFieldValue(view, offset, fieldDefinition, fieldEdit.value, definition.littleEndian);
    offset += fieldDefinition.size;
  }

  for (const fieldDefinition of definition.developerFields) {
    const field = developerFields.get(makeDeveloperFieldKey(fieldDefinition.developerDataIndex, fieldDefinition.number));
    if (!field) {
      throw new Error(`Cannot write data record ${record.id}; missing developer field ${fieldDefinition.developerDataIndex}:${fieldDefinition.number}.`);
    }
    if (field.size !== fieldDefinition.size) {
      throw new Error(`Cannot write data record ${record.id}; developer field ${field.number} size does not match its definition.`);
    }
    encodeFieldValue(
      view,
      offset,
      field,
      getFieldWriteValue(record, field, edits),
      definition.littleEndian,
    );
    offset += fieldDefinition.size;
  }

  return bytes;
}

function encodeFieldValue(
  view: DataView,
  offset: number,
  field: { readonly developer?: boolean; readonly size: number; readonly baseType?: number },
  value: FitValue,
  littleEndian: boolean
): void {
  if (field.developer) {
    encodeRawBytes(view, offset, field.size, value);
    return;
  }

  const baseType = getFitBaseType(field.baseType ?? 0x0d);
  if (baseType.name === "string") {
    encodeString(view, offset, field.size, value);
    return;
  }

  if (baseType.size <= 0 || field.size % baseType.size !== 0) {
    encodeRawBytes(view, offset, field.size, value);
    return;
  }

  const values = fitValueToArray(value);
  const expectedValues = field.size / baseType.size;
  if (values.length !== expectedValues) {
    throw new Error(`Field requires ${expectedValues} value(s), got ${values.length}.`);
  }

  for (let index = 0; index < values.length; index += 1) {
    const valueOffset = offset + index * baseType.size;
    const value = values[index];
    if (value == null) {
      writeInvalidFitValue(view, valueOffset, baseType, littleEndian);
    } else {
      baseType.write(view, valueOffset, value, littleEndian);
    }
  }
}

function prepareFieldEdits(fieldEdits: readonly FitFieldValueEdit[]): PreparedFieldEdits {
  const byFieldId = new Map<string, FitValue>();
  const byMessageFieldKey = new Map<string, FitValue>();
  const addedByMessageId = new Map<string, FitFieldValueEdit[]>();

  for (const edit of fieldEdits) {
    if (edit.fieldId) {
      byFieldId.set(edit.fieldId, edit.value);
    } else {
      byMessageFieldKey.set(makeFieldEditKey(edit.messageId, edit.fieldNumber, edit.developer, edit.developerDataIndex), edit.value);
    }

    if (edit.added) {
      const current = addedByMessageId.get(edit.messageId) ?? [];
      current.push(edit);
      addedByMessageId.set(edit.messageId, current);
    }
  }

  return { byFieldId, byMessageFieldKey, addedByMessageId };
}

function prepareInsertedMessages(
  insertedMessages: readonly FitInsertedMessage[],
  recordsById: ReadonlyMap<string, FitDataRecord>,
  deletedMessageIds: ReadonlySet<string>,
): PreparedInsertedMessages {
  const byAfterMessageId = new Map<string, FitInsertedMessage[]>();
  const byBeforeMessageId = new Map<string, FitInsertedMessage[]>();

  for (const insertedMessage of insertedMessages) {
    const afterMessageId = insertedMessage.position.afterMessageId;
    if (afterMessageId && recordsById.has(afterMessageId) && !deletedMessageIds.has(afterMessageId)) {
      const current = byAfterMessageId.get(afterMessageId) ?? [];
      current.push(insertedMessage);
      byAfterMessageId.set(afterMessageId, current);
      continue;
    }

    if (
      insertedMessage.position.beforeMessageId &&
      recordsById.has(insertedMessage.position.beforeMessageId) &&
      !deletedMessageIds.has(insertedMessage.position.beforeMessageId)
    ) {
      const current = byBeforeMessageId.get(insertedMessage.position.beforeMessageId) ?? [];
      current.push(insertedMessage);
      byBeforeMessageId.set(insertedMessage.position.beforeMessageId, current);
      continue;
    }

    if (
      !insertedMessage.position.afterMessageId &&
      !insertedMessage.position.beforeMessageId &&
      insertedMessage.sourceMessageId &&
      recordsById.has(insertedMessage.sourceMessageId) &&
      !deletedMessageIds.has(insertedMessage.sourceMessageId)
    ) {
      const current = byAfterMessageId.get(insertedMessage.sourceMessageId) ?? [];
      current.push(insertedMessage);
      byAfterMessageId.set(insertedMessage.sourceMessageId, current);
      continue;
    }

    const anchorIds = collectInsertedMessageAnchorIds(insertedMessage);
    throw new Error(`Cannot write inserted message ${insertedMessage.id}; no usable original data record was found for anchor message ${anchorIds.join(" or ") || "none"}.`);
  }

  return { byAfterMessageId, byBeforeMessageId };
}

function collectInsertedMessageAnchorIds(insertedMessage: FitInsertedMessage): string[] {
  const anchorIds: string[] = [];
  const afterMessageId = insertedMessage.position.afterMessageId;
  if (afterMessageId) {
    anchorIds.push(afterMessageId);
  }
  if (
    insertedMessage.position.beforeMessageId &&
    insertedMessage.position.beforeMessageId !== afterMessageId
  ) {
    anchorIds.push(insertedMessage.position.beforeMessageId);
  }
  if (
    anchorIds.length === 0 &&
    insertedMessage.sourceMessageId
  ) {
    anchorIds.push(insertedMessage.sourceMessageId);
  }
  return anchorIds;
}

function getFieldWriteValue(record: FitDataRecord, field: FitField, edits: PreparedFieldEdits): FitValue {
  if (edits.byFieldId.has(field.id)) {
    return edits.byFieldId.get(field.id) ?? null;
  }

  const fieldKey = makeFieldEditKey(
    record.id,
    field.number,
    field.developer,
    field.developer ? field.developerDataIndex : undefined,
  );
  if (edits.byMessageFieldKey.has(fieldKey)) {
    return edits.byMessageFieldKey.get(fieldKey) ?? null;
  }

  return field.rawValue;
}

function indexNormalFields(record: FitDataRecord): ReadonlyMap<number, FitField> {
  const fields = new Map<number, FitField>();
  for (const field of record.fields) {
    if (field.developer) {
      continue;
    }
    if (fields.has(field.number)) {
      throw new Error(`Cannot write data record ${record.id}; duplicate field number ${field.number}.`);
    }
    fields.set(field.number, field);
  }
  return fields;
}

function indexDeveloperFields(record: FitDataRecord): ReadonlyMap<string, FitField> {
  const fields = new Map<string, FitField>();
  for (const field of record.fields) {
    if (!field.developer) {
      continue;
    }
    const key = makeDeveloperFieldKey(field.developerDataIndex, field.number);
    if (fields.has(key)) {
      throw new Error(`Cannot write data record ${record.id}; duplicate developer field ${key}.`);
    }
    fields.set(key, field);
  }
  return fields;
}

function makeFieldEditKey(messageId: string, fieldNumber: number, developer?: boolean, developerDataIndex?: number): string {
  return developer ? `${messageId}:developer:${developerDataIndex ?? "unknown"}:${fieldNumber}` : `${messageId}:field:${fieldNumber}`;
}

function makeDeveloperFieldKey(developerDataIndex: number, fieldNumber: number): string {
  return `${developerDataIndex}:${fieldNumber}`;
}

function createAddedFieldDefinition(edit: FitFieldValueEdit): FitDefinitionField {
  const baseType = resolveAddedFieldBaseType(edit);
  const size = resolveAddedFieldSize(edit);

  return {
    number: edit.fieldNumber,
    size,
    baseType,
    baseTypeName: edit.baseTypeName ?? getFitBaseType(baseType).name
  };
}

function resolveAddedFieldBaseType(edit: FitFieldValueEdit): number {
  if (typeof edit.baseType === "number" && FIT_BASE_TYPES[edit.baseType]) {
    return edit.baseType;
  }

  if (edit.baseTypeName) {
    const resolved = Object.values(FIT_BASE_TYPES).find((type) => type.name === edit.baseTypeName);
    if (resolved) {
      return resolved.id;
    }
  }

  throw new Error(`Cannot write data record ${edit.messageId}; added field ${edit.fieldNumber} is missing a valid base type.`);
}

function resolveAddedFieldSize(edit: FitFieldValueEdit): number {
  const size = edit.size;
  if (!Number.isInteger(size) || size === undefined || size < 1 || size > 255) {
    throw new Error(`Cannot write data record ${edit.messageId}; added field ${edit.fieldNumber} has an invalid size.`);
  }

  return size;
}

function encodeString(view: DataView, offset: number, size: number, value: FitValue): void {
  const text = Array.isArray(value) ? value.join("") : String(value ?? "");
  if (text.length > size) {
    throw new Error(`Cannot encode ${text} as string; maximum length is ${size} byte${size === 1 ? "" : "s"}.`);
  }

  for (let index = 0; index < size; index += 1) {
    view.setUint8(offset + index, index < text.length ? text.charCodeAt(index) & 0xff : 0);
  }
}

function encodeRawBytes(view: DataView, offset: number, size: number, value: FitValue): void {
  const values = fitValueToArray(value);
  if (values.length !== size) {
    throw new Error(`Raw byte field requires ${size} byte(s), got ${values.length}.`);
  }
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index];
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0 || item > 255) {
      throw new Error(`Raw byte value at ${index} must be an integer byte.`);
    }
    view.setUint8(offset + index, item);
  }
}

function createRawInsertedDefinition(
  message: FitDataRecord,
  sourceDefinition: FitDefinitionRecord,
): FitDefinitionRecord {
  if (message.fields.some((field) => field.developer)) {
    throw new Error(`Cannot write raw inserted message ${message.id}; developer fields are not supported.`);
  }
  if (message.fields.length === 0) {
    throw new Error(`Cannot write raw inserted message ${message.id}; at least one normal field is required.`);
  }

  const fields: FitDefinitionField[] = [];
  const seenFieldNumbers = new Set<number>();
  for (const field of message.fields) {
    if (field.developer) {
      throw new Error(`Cannot write raw inserted message ${message.id}; developer fields are not supported.`);
    }
    if (seenFieldNumbers.has(field.number)) {
      throw new Error(`Cannot write raw inserted message ${message.id}; duplicate field number ${field.number}.`);
    }
    seenFieldNumbers.add(field.number);

    if (typeof field.baseType !== "number" || !FIT_BASE_TYPES[field.baseType]) {
      throw new Error(`Cannot write raw inserted message ${message.id}; field ${field.number} is missing a valid base type.`);
    }

    fields.push({
      number: field.number,
      size: field.size,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName
    });
  }

  return {
    ...sourceDefinition,
    id: `raw-definition:${message.id}`,
    hasDeveloperData: false,
    littleEndian: true,
    reserved: 0,
    architecture: 0,
    fields,
    developerFields: [],
    globalMessageNumber: message.globalMessageNumber,
    message: {
      known: false,
      number: message.globalMessageNumber,
      name: message.messageName,
      comment: `Synthetic raw inserted message ${message.messageName}.`,
      fields: []
    } as ResolvedProfileMessageMetadata,
  };
}

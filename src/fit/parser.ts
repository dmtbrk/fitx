import { getFitBaseType, isInvalidFitValue, isInvalidFloatBits } from "./baseTypes";
import { calculateFitCrc, readUint16Le } from "./crc";
import { getProfileFieldMetadata, getProfileMessageMetadata } from "./profile";
import type {
  FitArchitecture,
  FitDataField,
  FitDataRecord,
  FitDefinitionField,
  FitDefinitionRecord,
  FitDeveloperDataField,
  FitDeveloperFieldDefinition,
  FitDocument,
  FitField,
  FitHeader,
  FitScalarValue,
  FitValue
} from "./types";

const FIT_TYPE = ".FIT";

export function parseFitDocument(buffer: ArrayBuffer, fileName = "activity.fit"): FitDocument {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const header = parseFitHeader(bytes, view);
  const recordsStart = header.headerSize;
  const recordsEnd = recordsStart + header.dataSize;

  if (recordsEnd + 2 > bytes.byteLength) {
    throw new Error("FIT header data size exceeds the file size.");
  }

  const fileCrc = readUint16Le(bytes, recordsEnd);
  const calculatedFileCrc = calculateFitCrc(bytes, 0, recordsEnd);
  const issues = [];
  if (header.headerCrcValid === false) {
    issues.push({
      scope: "file" as const,
      code: "invalid-header-crc",
      message: "Original FIT header checksum is invalid."
    });
  }
  if (fileCrc !== calculatedFileCrc) {
    issues.push({
      scope: "file" as const,
      code: "invalid-file-crc",
      message: "Original FIT file checksum is invalid."
    });
  }

  const activeDefinitions = new Map<number, FitDefinitionRecord>();
  const records: FitDocument["records"] = [];
  const definitions: FitDefinitionRecord[] = [];
  const messages: FitDataRecord[] = [];
  let offset: number = recordsStart;
  let order = 0;

  while (offset < recordsEnd) {
    const recordStart = offset;
    const recordHeader = view.getUint8(offset);
    offset += 1;

    if ((recordHeader & 0x80) !== 0) {
      const localMessageType = (recordHeader >> 5) & 0x03;
      const definition = activeDefinitions.get(localMessageType);
      if (!definition) {
        throw new Error(`Compressed timestamp data record references unknown local message type ${localMessageType}.`);
      }

      const parsed = readDataRecord(view, offset, recordsEnd, order, recordHeader, definition, recordStart, {
        compressedTimestampOffset: recordHeader & 0x1f
      });
      offset = parsed.offset;
      records.push(parsed.record);
      messages.push(parsed.record);
      order += 1;
      continue;
    }

    const isDefinition = (recordHeader & 0x40) !== 0;
    const hasDeveloperData = (recordHeader & 0x20) !== 0;
    const localMessageType = recordHeader & 0x0f;

    if (isDefinition) {
      const parsed = readDefinitionRecord(view, offset, recordsEnd, order, localMessageType, hasDeveloperData, recordStart);
      offset = parsed.offset;
      activeDefinitions.set(localMessageType, parsed.record);
      definitions.push(parsed.record);
      records.push(parsed.record);
      order += 1;
      continue;
    }

    const definition = activeDefinitions.get(localMessageType);
    if (!definition) {
      throw new Error(`Data record references unknown local message type ${localMessageType}.`);
    }

    const parsed = readDataRecord(view, offset, recordsEnd, order, recordHeader, definition, recordStart);
    offset = parsed.offset;
    records.push(parsed.record);
    messages.push(parsed.record);
    order += 1;
  }

  return {
    source: buffer,
    fileName,
    fileSize: buffer.byteLength,
    header,
    checksum: {
      fileCrc,
      fileCrcValid: fileCrc === calculatedFileCrc
    },
    records,
    definitions,
    messages,
    issues
  };
}

function parseFitHeader(bytes: Uint8Array, view: DataView): FitHeader {
  if (bytes.byteLength < 14) {
    throw new Error("File is too small to be a FIT file.");
  }

  const headerSize = view.getUint8(0);
  if (headerSize !== 12 && headerSize !== 14) {
    throw new Error(`Unsupported FIT header size ${headerSize}.`);
  }
  if (bytes.byteLength < headerSize + 2) {
    throw new Error("File is too small for its FIT header.");
  }

  const dataType = readAscii(view, 8, 4).replace(/\0/g, "");
  if (dataType !== FIT_TYPE) {
    throw new Error(`Unsupported file type "${dataType}". Expected a .FIT file.`);
  }

  const protocolVersionRaw = view.getUint8(1);
  const profileVersionRaw = view.getUint16(2, true);
  const headerCrc = headerSize === 14 ? view.getUint16(12, true) : undefined;
  const calculatedHeaderCrc = headerSize === 14 ? calculateFitCrc(bytes, 0, 12) : undefined;

  return {
    headerSize,
    protocolVersionRaw,
    profileVersionRaw,
    protocolVersion: `${protocolVersionRaw >> 4}.${protocolVersionRaw & 0x0f}`,
    profileVersion: `${Math.floor(profileVersionRaw / 100)}.${String(profileVersionRaw % 100).padStart(2, "0")}`,
    dataSize: view.getUint32(4, true),
    dataType: FIT_TYPE,
    headerCrc,
    headerCrcValid: headerSize === 14 ? headerCrc === calculatedHeaderCrc : undefined
  };
}

function readDefinitionRecord(
  view: DataView,
  offset: number,
  limit: number,
  order: number,
  localMessageType: number,
  hasDeveloperData: boolean,
  recordStart: number
): { record: FitDefinitionRecord; offset: number } {
  requireFitDataBytes(offset, 5, limit, "definition message header");
  const reserved = view.getUint8(offset);
  offset += 1;
  const architecture = view.getUint8(offset) as FitArchitecture;
  if (architecture !== 0 && architecture !== 1) {
    throw new Error(`Unsupported FIT architecture ${architecture}.`);
  }
  offset += 1;
  const littleEndian = architecture === 0;
  const globalMessageNumber = view.getUint16(offset, littleEndian);
  offset += 2;

  const fieldCount = view.getUint8(offset);
  offset += 1;
  const fields: FitDefinitionField[] = [];
  for (let index = 0; index < fieldCount; index += 1) {
    requireFitDataBytes(offset, 3, limit, "definition field");
    const baseType = view.getUint8(offset + 2);
    fields.push({
      number: view.getUint8(offset),
      size: view.getUint8(offset + 1),
      baseType,
      baseTypeName: getFitBaseType(baseType).name
    });
    offset += 3;
  }

  const developerFields: FitDeveloperFieldDefinition[] = [];
  if (hasDeveloperData) {
    requireFitDataBytes(offset, 1, limit, "developer field definition count");
    const developerFieldCount = view.getUint8(offset);
    offset += 1;
    for (let index = 0; index < developerFieldCount; index += 1) {
      requireFitDataBytes(offset, 3, limit, "developer field definition");
      developerFields.push({
        number: view.getUint8(offset),
        size: view.getUint8(offset + 1),
        developerDataIndex: view.getUint8(offset + 2)
      });
      offset += 3;
    }
  }

  const message = getProfileMessageMetadata(globalMessageNumber);
  return {
    record: {
      kind: "definition",
      id: `definition-${order}`,
      order,
      localMessageType,
      hasDeveloperData,
      reserved,
      architecture,
      littleEndian,
      globalMessageNumber,
      message,
      fields,
      developerFields,
      span: { start: recordStart, end: offset }
    },
    offset
  };
}

function readDataRecord(
  view: DataView,
  offset: number,
  limit: number,
  order: number,
  recordHeader: number,
  definition: FitDefinitionRecord,
  recordStart: number,
  options: { compressedTimestampOffset?: number } = {}
): { record: FitDataRecord; offset: number } {
  const fields: FitField[] = [];
  const messageName = definition.message.name;

  for (const fieldDefinition of definition.fields) {
    const fieldStart = offset;
    requireFitDataBytes(offset, fieldDefinition.size, limit, "data field");
    const profile = getProfileFieldMetadata(definition.globalMessageNumber, fieldDefinition.number);
    const rawValue = decodeFitValue(view, offset, fieldDefinition.size, fieldDefinition.baseType, definition.littleEndian);
    const field: FitDataField = {
      id: `data-${order}:field-${fieldDefinition.number}`,
      number: fieldDefinition.number,
      name: profile.name,
      baseType: fieldDefinition.baseType,
      baseTypeName: fieldDefinition.baseTypeName,
      size: fieldDefinition.size,
      value: rawValue,
      rawValue,
      units: profile.units,
      known: profile.known,
      profile,
      span: { start: fieldStart, end: fieldStart + fieldDefinition.size },
      developer: false
    };
    fields.push(field);
    offset += fieldDefinition.size;
  }

  for (const fieldDefinition of definition.developerFields) {
    const fieldStart = offset;
    requireFitDataBytes(offset, fieldDefinition.size, limit, "developer data field");
    const rawValue = readBytes(view, offset, fieldDefinition.size);
    const field: FitDeveloperDataField = {
      id: `data-${order}:developer-${fieldDefinition.developerDataIndex}-${fieldDefinition.number}`,
      number: fieldDefinition.number,
      name: `developer_${fieldDefinition.developerDataIndex}_${fieldDefinition.number}`,
      size: fieldDefinition.size,
      value: rawValue,
      rawValue,
      developerDataIndex: fieldDefinition.developerDataIndex,
      span: { start: fieldStart, end: fieldStart + fieldDefinition.size },
      developer: true
    };
    fields.push(field);
    offset += fieldDefinition.size;
  }

  const isCompressed = options.compressedTimestampOffset !== undefined;
  return {
    record: {
      kind: "data",
      id: `data-${order}`,
      order,
      recordHeaderKind: isCompressed ? "compressed-timestamp" : "normal",
      recordHeader,
      localMessageType: definition.localMessageType,
      compressedTimestampOffset: options.compressedTimestampOffset,
      globalMessageNumber: definition.globalMessageNumber,
      messageName,
      definitionId: definition.id,
      fields,
      span: { start: recordStart, end: offset }
    },
    offset
  };
}

function requireFitDataBytes(offset: number, size: number, limit: number, context: string): void {
  if (offset + size > limit) {
    throw new Error(`Malformed FIT data: ${context} exceeds declared data size.`);
  }
}

export function decodeFitValue(
  view: DataView,
  offset: number,
  totalSize: number,
  baseTypeId: number,
  littleEndian: boolean
): FitValue {
  const baseType = getFitBaseType(baseTypeId);
  if (baseType.name === "string") {
    return readAscii(view, offset, totalSize).replace(/\0+$/g, "");
  }
  if (baseType.size <= 0 || totalSize % baseType.size !== 0) {
    return readBytes(view, offset, totalSize);
  }

  const values: FitScalarValue[] = [];
  for (let index = 0; index < totalSize; index += baseType.size) {
    if (isInvalidFloatBits(view, offset + index, baseType.name, littleEndian)) {
      values.push(null);
      continue;
    }
    const value = baseType.read(view, offset + index, littleEndian);
    values.push(isInvalidFitValue(value, baseType.invalid) ? null : value);
  }

  return values.length === 1 ? values[0] : values;
}

function readAscii(view: DataView, offset: number, size: number): string {
  let output = "";
  for (let index = 0; index < size; index += 1) {
    output += String.fromCharCode(view.getUint8(offset + index));
  }
  return output;
}

function readBytes(view: DataView, offset: number, size: number): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < size; index += 1) {
    bytes.push(view.getUint8(offset + index));
  }
  return bytes;
}

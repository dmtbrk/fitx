#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve("src/generated/fitProfile.generated.ts");
const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_GENERATOR_VERSION = "canonical-json-0";
const WORKBOOK_GENERATOR_VERSION = "profile-xlsx-0";
const WORKBOOK_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsm"]);
export const FIT_PROFILE_GENERATOR_USAGE = [
  "Usage: node scripts/generate-fit-profile.mjs [--generated-at ISO-8601] /path/to/Profile.xlsx [output-file]",
  "Canonical JSON profile input remains supported.",
  "Garmin Profile.xlsx workbook input is supported for full FIT profile generation."
].join(" ");

export async function buildGeneratedProfileArtifact({ inputPath, generatedAt } = {}) {
  if (!inputPath) {
    throw new Error(FIT_PROFILE_GENERATOR_USAGE);
  }

  const resolvedInputPath = path.resolve(inputPath);
  const inputExtension = path.extname(resolvedInputPath).toLowerCase();
  const isWorkbook = WORKBOOK_EXTENSIONS.has(inputExtension);

  await ensureFileExists(
    resolvedInputPath,
    isWorkbook
      ? `FIT profile workbook not found: ${resolvedInputPath}`
      : `FIT profile JSON not found: ${resolvedInputPath}`,
  );

  const input = await readFile(resolvedInputPath);
  const rawInput = input.toString("utf8");
  const profile = isWorkbook
    ? parseProfileWorkbook(input, resolvedInputPath)
    : parseCanonicalProfileJson(rawInput, resolvedInputPath);
  const generated = normalizeProfile(
    profile,
    resolvedInputPath,
    generatedAt,
    sha256(input),
  );
  return emitGeneratedProfile(generated);
}

export async function writeGeneratedProfileArtifact({ inputPath, outputPath = DEFAULT_OUTPUT, generatedAt } = {}) {
  const output = await buildGeneratedProfileArtifact({ inputPath, generatedAt });
  await writeFile(outputPath, `${output}\n`);
  return output;
}

async function main() {
  const { generatedAt, help, positionals } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(`${FIT_PROFILE_GENERATOR_USAGE}\n`);
    return;
  }

  await writeGeneratedProfileArtifact({
    inputPath: positionals[0],
    outputPath: positionals[1] ? path.resolve(positionals[1]) : DEFAULT_OUTPUT,
    generatedAt
  });
}

export function parseArgs(argv) {
  const positionals = [];
  let generatedAt;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--generated-at") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--generated-at requires an ISO-8601 timestamp value.");
      }
      generatedAt = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--generated-at=")) {
      generatedAt = arg.slice("--generated-at=".length);
      if (!generatedAt) {
        throw new Error("--generated-at requires an ISO-8601 timestamp value.");
      }
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    positionals.push(arg);
  }

  return { generatedAt, help, positionals };
}

async function ensureFileExists(filePath, message) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    throw new Error(message);
  }
}

function parseCanonicalProfileJson(rawInput, filePath) {
  let parsed;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    throw new Error(`Unable to parse canonical FIT profile JSON: ${filePath}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Canonical FIT profile JSON must be a JSON object.");
  }

  return parsed;
}

function parseProfileWorkbook(input, filePath) {
  const workbook = readXlsxWorkbook(input, filePath);
  const typeRows = workbook.sheets.get("Types");
  const messageRows = workbook.sheets.get("Messages");

  if (!typeRows) {
    throw new Error("Garmin Profile.xlsx must include a Types worksheet.");
  }
  if (!messageRows) {
    throw new Error("Garmin Profile.xlsx must include a Messages worksheet.");
  }

  const types = parseWorkbookTypes(typeRows);
  const messages = parseWorkbookMessages(messageRows, types);

  return {
    source: {
      generatorVersion: WORKBOOK_GENERATOR_VERSION,
      generatedAt: DEFAULT_GENERATED_AT,
      workbookPath: path.basename(filePath),
      workbookSha256: "computed",
      sdkRelease: "unavailable"
    },
    types,
    messages
  };
}

function parseWorkbookTypes(rows) {
  const types = [];
  let currentType;

  for (const row of rows.slice(1)) {
    const typeName = cleanCell(row.A);
    const baseType = cleanCell(row.B);
    const valueName = cleanCell(row.C);
    const value = cleanCell(row.D);
    const comment = cleanCell(row.E);

    if (typeName && baseType) {
      const primitive = resolvePrimitiveType(baseType);
      currentType = {
        name: typeName,
        baseType,
        size: primitive.size,
        signed: primitive.signed,
        values: []
      };
      types.push(currentType);
    }

    if (currentType && valueName && value) {
      const parsedValue = parseWorkbookEnumValue(value);
      if (currentType.values.some((existing) => existing.value === parsedValue)) {
        continue;
      }
      currentType.values.push(orderedObject({
        value: parsedValue,
        name: valueName,
        comment: comment || undefined
      }));
    }
  }

  return types;
}

function parseWorkbookMessages(rows, types) {
  const typesByName = new Map(types.map((type) => [type.name, type]));
  const messageNumbers = new Map(
    typesByName.get("mesg_num")?.values
      .filter((value) => typeof value.value === "number")
      .map((value) => [value.name, value.value]) ?? [],
  );
  const messages = [];
  let currentMessage;

  for (const row of rows.slice(1)) {
    const messageName = cleanCell(row.A);
    const fieldNumber = cleanCell(row.B);
    const fieldName = cleanCell(row.C);
    const fieldType = cleanCell(row.D);

    if (messageName && !fieldNumber && !fieldName) {
      const number = messageNumbers.get(messageName);
      if (number === undefined) {
        currentMessage = undefined;
        continue;
      }
      currentMessage = {
        number,
        name: messageName,
        comment: cleanCell(row.N) || undefined,
        fields: []
      };
      messages.push(currentMessage);
      continue;
    }

    if (!currentMessage || !fieldNumber || !fieldName || !fieldType) {
      continue;
    }

    const parsedFieldNumber = parseWorkbookInteger(fieldNumber);
    if (!Number.isInteger(parsedFieldNumber) || parsedFieldNumber < 0 || parsedFieldNumber > 255) {
      continue;
    }

    const fieldTypeMetadata = typesByName.get(fieldType);
    const primitive = resolvePrimitiveType(fieldTypeMetadata?.baseType ?? fieldType);
    const values = fieldTypeMetadata?.values ?? [];
    currentMessage.fields.push(orderedObject({
      number: parsedFieldNumber,
      name: fieldName,
      baseType: fieldTypeMetadata?.baseType ?? fieldType,
      size: primitive.size,
      type: fieldType,
      scale: parseOptionalWorkbookNumber(row.G),
      offset: parseOptionalWorkbookNumber(row.H),
      units: cleanCell(row.I) || undefined,
      values,
      components: parseWorkbookComponents(row),
      comment: cleanCell(row.N) || undefined
    }));
  }

  return messages;
}

function parseWorkbookComponents(row) {
  const components = splitWorkbookList(row.F);
  if (components.length === 0) {
    return undefined;
  }

  return undefined;
}

function readXlsxWorkbook(input, filePath) {
  const archive = readZipEntries(input);
  const sharedStrings = parseSharedStrings(readZipText(archive, "xl/sharedStrings.xml"));
  const workbookXml = readZipText(archive, "xl/workbook.xml");
  const relsXml = readZipText(archive, "xl/_rels/workbook.xml.rels");
  const relations = parseWorkbookRelationships(relsXml);
  const sheets = new Map();

  for (const sheet of parseWorkbookSheets(workbookXml)) {
    const target = relations.get(sheet.relationshipId);
    if (!target) {
      throw new Error(`Unable to resolve worksheet relationship ${sheet.relationshipId} in ${filePath}`);
    }
    const sheetPath = normalizeWorkbookTarget(target);
    sheets.set(sheet.name, parseWorksheetRows(readZipText(archive, sheetPath), sharedStrings));
  }

  return { sheets };
}

function readZipEntries(input) {
  const entries = new Map();
  const eocdOffset = findEndOfCentralDirectory(input);
  const entryCount = input.readUInt16LE(eocdOffset + 10);
  let offset = input.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (input.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory in FIT profile workbook.");
    }

    const compressionMethod = input.readUInt16LE(offset + 10);
    const compressedSize = input.readUInt32LE(offset + 20);
    const fileNameLength = input.readUInt16LE(offset + 28);
    const extraLength = input.readUInt16LE(offset + 30);
    const commentLength = input.readUInt16LE(offset + 32);
    const localHeaderOffset = input.readUInt32LE(offset + 42);
    const name = input.slice(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    const localFileNameLength = input.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = input.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressed = input.slice(dataOffset, dataOffset + compressedSize);
    const content = compressionMethod === 8
      ? inflateRawSync(compressed)
      : compressionMethod === 0
        ? compressed
        : undefined;

    if (!content) {
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${name}.`);
    }

    entries.set(name, content);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(input) {
  const minOffset = Math.max(0, input.length - 0xFFFF - 22);
  for (let offset = input.length - 22; offset >= minOffset; offset -= 1) {
    if (input.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Invalid ZIP workbook: end of central directory not found.");
}

function readZipText(archive, name) {
  const content = archive.get(name);
  if (!content) {
    throw new Error(`Missing workbook entry: ${name}`);
  }
  return content.toString("utf8");
}

function parseWorkbookRelationships(xml) {
  const relationships = new Map();
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = parseXmlAttributes(match[1]);
    if (attrs.Id && attrs.Target) {
      relationships.set(attrs.Id, attrs.Target);
    }
  }
  return relationships;
}

function parseWorkbookSheets(xml) {
  return [...xml.matchAll(/<x:sheet\b([^>]*)\/>/g)].map((match) => {
    const attrs = parseXmlAttributes(match[1]);
    return {
      name: attrs.name,
      relationshipId: attrs["r:id"]
    };
  }).filter((sheet) => sheet.name && sheet.relationshipId);
}

function normalizeWorkbookTarget(target) {
  if (target.startsWith("/")) {
    return target.slice(1);
  }
  if (target.startsWith("xl/")) {
    return target;
  }
  return `xl/${target}`;
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<x:si>(.*?)<\/x:si>/gs)].map((match) => (
    [...match[1].matchAll(/<x:t\b[^>]*>(.*?)<\/x:t>/gs)]
      .map((text) => decodeXml(text[1]))
      .join("")
  ));
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<x:row\b[^>]*>(.*?)<\/x:row>/gs)) {
    const row = {};
    for (const cellMatch of rowMatch[1].matchAll(/<x:c\b([^>]*)>(.*?)<\/x:c>/gs)) {
      const attrs = parseXmlAttributes(cellMatch[1]);
      const column = attrs.r?.match(/^[A-Z]+/)?.[0];
      if (!column) {
        continue;
      }
      row[column] = parseWorksheetCellValue(cellMatch[2], attrs, sharedStrings);
    }
    rows.push(row);
  }
  return rows;
}

function parseWorksheetCellValue(xml, attrs, sharedStrings) {
  if (attrs.t === "s") {
    const index = Number(xml.match(/<x:v>(.*?)<\/x:v>/s)?.[1]);
    return sharedStrings[index] ?? "";
  }

  if (attrs.t === "inlineStr") {
    return [...xml.matchAll(/<x:t\b[^>]*>(.*?)<\/x:t>/gs)]
      .map((match) => decodeXml(match[1]))
      .join("");
  }

  return decodeXml(xml.match(/<x:v>(.*?)<\/x:v>/s)?.[1] ?? "");
}

function parseXmlAttributes(rawAttributes) {
  return Object.fromEntries(
    [...rawAttributes.matchAll(/([:\w]+)="([^"]*)"/g)].map((match) => [match[1], decodeXml(match[2])]),
  );
}

function decodeXml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cleanCell(value) {
  return typeof value === "string" ? value.trim() : "";
}

function splitWorkbookList(value) {
  const trimmed = cleanCell(value);
  return trimmed.length > 0
    ? trimmed.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
    : [];
}

function parseWorkbookEnumValue(value) {
  const parsed = parseWorkbookInteger(value);
  return Number.isInteger(parsed) ? parsed : cleanCell(value);
}

function parseWorkbookInteger(value) {
  const trimmed = cleanCell(value);
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return Number.parseInt(trimmed, 16);
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return undefined;
}

function parseOptionalWorkbookNumber(value) {
  const trimmed = cleanCell(value);
  if (trimmed.length === 0 || trimmed.includes(",")) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function resolvePrimitiveType(typeName) {
  const primitive = PRIMITIVE_TYPES.get(typeName);
  if (!primitive) {
    throw new Error(`Unsupported FIT primitive base type: ${typeName}`);
  }
  return primitive;
}

const PRIMITIVE_TYPES = new Map([
  ["enum", { size: 1, signed: false }],
  ["bool", { size: 1, signed: false }],
  ["sint8", { size: 1, signed: true }],
  ["uint8", { size: 1, signed: false }],
  ["sint16", { size: 2, signed: true }],
  ["uint16", { size: 2, signed: false }],
  ["sint32", { size: 4, signed: true }],
  ["uint32", { size: 4, signed: false }],
  ["string", { size: 1, signed: false }],
  ["float32", { size: 4, signed: true }],
  ["float64", { size: 8, signed: true }],
  ["uint8z", { size: 1, signed: false }],
  ["uint16z", { size: 2, signed: false }],
  ["uint32z", { size: 4, signed: false }],
  ["byte", { size: 1, signed: false }],
  ["sint64", { size: 8, signed: true }],
  ["uint64", { size: 8, signed: false }],
  ["uint64z", { size: 8, signed: false }]
]);

function normalizeProfile(profile, inputPath, overrideGeneratedAt, inputSha256) {
  const source = isPlainObject(profile.source) ? profile.source : {};
  if (!Array.isArray(profile.types)) {
    throw new Error("Canonical FIT profile JSON must include a types array.");
  }
  if (!Array.isArray(profile.messages)) {
    throw new Error("Canonical FIT profile JSON must include a messages array.");
  }

  const types = profile.types;
  const messages = profile.messages;
  validateProfileShape(types, messages);

  return {
    source: normalizeSource(source, inputPath, overrideGeneratedAt, inputSha256),
    types: types.map(normalizeType).sort(compareByName),
    messages: messages.map(normalizeMessage).sort(compareByNumberThenName)
  };
}

function normalizeSource(source, inputPath, overrideGeneratedAt, inputSha256) {
  return orderedObject({
    generatorVersion: coerceString(source.generatorVersion, DEFAULT_GENERATOR_VERSION),
    generatedAt: coerceString(overrideGeneratedAt ?? source.generatedAt, DEFAULT_GENERATED_AT),
    workbookPath: coerceString(source.workbookPath, path.basename(inputPath)),
    workbookSha256: inputSha256,
    sdkRelease: coerceString(source.sdkRelease, "unavailable")
  });
}

function normalizeType(type) {
  const values = Array.isArray(type.values) ? type.values : [];
  return orderedObject({
    name: coerceString(type.name, "unknown_type"),
    baseType: coerceString(type.baseType, "unknown"),
    size: coerceNumber(type.size, 0),
    signed: Boolean(type.signed),
    values: values.map(normalizeEnumValue).sort(compareEnumValues)
  });
}

function normalizeMessage(message) {
  return orderedObject({
    number: coerceNumber(message.number, 0),
    name: coerceString(message.name, "unknown_message"),
    comment: maybeString(message.comment),
    fields: message.fields.map(normalizeField).sort(compareByNumberThenName)
  });
}

function normalizeField(field) {
  const values = Array.isArray(field.values) ? field.values : [];
  const components = Array.isArray(field.components) ? field.components : [];
  const normalized = {
    number: coerceNumber(field.number, 0),
    name: coerceString(field.name, "unknown_field"),
    baseType: coerceString(field.baseType, "unknown"),
    size: coerceNumber(field.size, 0),
    type: maybeString(field.type),
    scale: maybeNumber(field.scale),
    offset: maybeNumber(field.offset),
    units: maybeString(field.units),
    values: values.map(normalizeEnumValue).sort(compareEnumValues)
  };

  if (components.length > 0) {
    normalized.components = components.map(normalizeComponent).sort(compareByFieldNumberThenName);
  }

  const comment = maybeString(field.comment);
  if (comment !== undefined) {
    normalized.comment = comment;
  }

  return orderedObject(normalized);
}

function normalizeComponent(component) {
  return orderedObject({
    fieldNumber: coerceNumber(component.fieldNumber, 0),
    scale: maybeNumber(component.scale),
    offset: maybeNumber(component.offset),
    units: maybeString(component.units)
  });
}

function normalizeEnumValue(value) {
  const normalized = {
    value: coerceEnumValue(value.value),
    name: coerceString(value.name, "unknown_value")
  };
  const comment = maybeString(value.comment);
  if (comment !== undefined) {
    normalized.comment = comment;
  }
  return orderedObject(normalized);
}

function validateProfileShape(types, messages) {
  const typeNames = new Set();
  for (const type of types) {
    if (!isPlainObject(type)) {
      throw new Error("FIT profile type entries must be objects.");
    }
    const name = requireName(type.name, "type");
    requireName(type.baseType, `type ${name} baseType`);
    requireIntegerInRange(type.size, `type ${name} size`, 1, 255);
    if (typeof type.signed !== "boolean") {
      throw new Error(`FIT profile type ${name} signed must be a boolean.`);
    }
    if (typeNames.has(name)) {
      throw new Error(`Duplicate FIT profile type name: ${name}`);
    }
    typeNames.add(name);
    validateEnumCollection(type.values, `type ${name}`);
  }

  const messageNumbers = new Set();
  for (const message of messages) {
    if (!isPlainObject(message)) {
      throw new Error("FIT profile message entries must be objects.");
    }
    const messageName = requireName(message.name, "message");
    const messageNumber = requireIntegerInRange(
      message.number,
      `message ${messageName} number`,
      0,
      65534,
    );
    if (messageNumbers.has(messageNumber)) {
      throw new Error(`Duplicate FIT profile message number: ${messageNumber}`);
    }
    messageNumbers.add(messageNumber);

    const fieldNumbers = new Set();
    if (!Array.isArray(message.fields)) {
      throw new Error(`FIT profile fields for message ${messageName} must be an array.`);
    }

    for (const field of message.fields) {
      if (!isPlainObject(field)) {
        throw new Error(`FIT profile field entries for message ${messageName} must be objects.`);
      }
      const fieldName = requireName(field.name, `message ${messageName} field`);
      const fieldNumber = requireIntegerInRange(
        field.number,
        `field ${messageName}.${fieldName} number`,
        0,
        255,
      );
      if (fieldNumbers.has(fieldNumber)) {
        throw new Error(`Duplicate FIT profile field number ${fieldNumber} in message ${messageName}.`);
      }
      fieldNumbers.add(fieldNumber);
      requireName(field.baseType, `field ${messageName}.${fieldName} baseType`);
      requireIntegerInRange(field.size, `field ${messageName}.${fieldName} size`, 1, 255);
      validateOptionalFieldMetadata(field, `field ${messageName}.${fieldName}`);
      validateEnumCollection(field.values, `field ${messageName}.${fieldName}`);
      validateComponents(field.components, `field ${messageName}.${fieldName}`);
    }
  }
}

function validateOptionalFieldMetadata(field, ownerLabel) {
  validateOptionalString(field.type, `${ownerLabel} type`);
  validateOptionalNumber(field.scale, `${ownerLabel} scale`);
  validateOptionalNumber(field.offset, `${ownerLabel} offset`);
  validateOptionalString(field.units, `${ownerLabel} units`);
  validateOptionalString(field.comment, `${ownerLabel} comment`);
}

function validateComponents(components, ownerLabel) {
  if (components === undefined) {
    return;
  }

  if (!Array.isArray(components)) {
    throw new Error(`FIT profile components for ${ownerLabel} must be an array.`);
  }

  for (const component of components) {
    if (!isPlainObject(component)) {
      throw new Error(`FIT profile component entries for ${ownerLabel} must be objects.`);
    }
    requireIntegerInRange(component.fieldNumber, `${ownerLabel} component fieldNumber`, 0, 255);
    validateOptionalNumber(component.scale, `${ownerLabel} component scale`);
    validateOptionalNumber(component.offset, `${ownerLabel} component offset`);
    if (component.units !== undefined && typeof component.units !== "string") {
      throw new Error(`FIT profile ${ownerLabel} component units must be a string.`);
    }
  }
}

function validateEnumCollection(values, ownerLabel) {
  if (values === undefined) {
    return;
  }

  validateEnumValues(values, ownerLabel);
}

function validateEnumValues(values, ownerLabel) {
  if (!Array.isArray(values)) {
    throw new Error(`FIT profile enum values for ${ownerLabel} must be an array.`);
  }

  const enumValues = new Set();
  for (const value of values) {
    if (!isPlainObject(value)) {
      throw new Error(`FIT profile enum entries for ${ownerLabel} must be objects.`);
    }
    if (typeof value.value !== "number" && typeof value.value !== "string") {
      throw new Error(`FIT profile enum value for ${ownerLabel} must be a number or string.`);
    }
    if (enumValues.has(value.value)) {
      throw new Error(`Duplicate FIT profile enum value ${value.value} in ${ownerLabel}.`);
    }
    enumValues.add(value.value);
    requireName(value.name, `${ownerLabel} enum`);
  }
}

function requireName(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`FIT profile ${label} name is required.`);
  }

  return value;
}

function requireInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(`FIT profile ${label} must be an integer.`);
  }

  return value;
}

function requireIntegerInRange(value, label, min, max) {
  const integer = requireInteger(value, label);
  if (integer < min || integer > max) {
    throw new Error(`FIT profile ${label} must be between ${min} and ${max}.`);
  }

  return integer;
}

function validateOptionalNumber(value, label) {
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`FIT profile ${label} must be a finite number.`);
  }
}

function validateOptionalString(value, label) {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`FIT profile ${label} must be a string.`);
  }
}

function emitGeneratedProfile(profile) {
  return [
    "/**",
    " * @generated by scripts/generate-fit-profile.mjs",
    " * DO NOT EDIT.",
    " */",
    "",
    'import type { FitProfileGeneratedData } from "../fit/profile";',
    "",
    `export const FIT_PROFILE_GENERATED: FitProfileGeneratedData = ${JSON.stringify(profile, null, 2)};`
  ].join("\n");
}

function orderedObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function maybeString(value) {
  return typeof value === "string" ? value : undefined;
}

function coerceNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function maybeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function compareByName(left, right) {
  return left.name.localeCompare(right.name);
}

function compareByNumberThenName(left, right) {
  return left.number - right.number || left.name.localeCompare(right.name);
}

function compareByFieldNumberThenName(left, right) {
  return (
    left.fieldNumber - right.fieldNumber ||
    compareOptionalNumber(left.scale, right.scale) ||
    compareOptionalNumber(left.offset, right.offset) ||
    compareOptionalString(left.units, right.units)
  );
}

function compareEnumValues(left, right) {
  if (typeof left.value === "number" && typeof right.value === "number") {
    return left.value - right.value || left.name.localeCompare(right.name);
  }
  if (typeof left.value === "number") {
    return -1;
  }
  if (typeof right.value === "number") {
    return 1;
  }
  return String(left.value).localeCompare(String(right.value)) || left.name.localeCompare(right.name);
}

function compareOptionalNumber(left, right) {
  const leftDefined = typeof left === "number";
  const rightDefined = typeof right === "number";
  if (leftDefined && rightDefined) {
    return left - right;
  }
  if (leftDefined) {
    return -1;
  }
  if (rightDefined) {
    return 1;
  }
  return 0;
}

function compareOptionalString(left, right) {
  const leftDefined = typeof left === "string";
  const rightDefined = typeof right === "string";
  if (leftDefined && rightDefined) {
    return left.localeCompare(right);
  }
  if (leftDefined) {
    return -1;
  }
  if (rightDefined) {
    return 1;
  }
  return 0;
}

function coerceEnumValue(value) {
  return typeof value === "number" || typeof value === "string" ? value : 0;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

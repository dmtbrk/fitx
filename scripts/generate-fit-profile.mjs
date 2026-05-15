#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve("src/generated/fitProfile.generated.ts");
const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_GENERATOR_VERSION = "canonical-json-0";
const WORKBOOK_EXTENSIONS = new Set([".xls", ".xlsx", ".xlsm"]);
export const FIT_PROFILE_GENERATOR_USAGE = [
  "Usage: node scripts/generate-fit-profile.mjs [--generated-at ISO-8601] /path/to/profile.json [output-file]",
  "Canonical JSON profile input is supported now.",
  "Garmin workbook inputs will be added later as an optional extension."
].join(" ");

export async function buildGeneratedProfileArtifact({ inputPath, generatedAt } = {}) {
  if (!inputPath) {
    throw new Error(FIT_PROFILE_GENERATOR_USAGE);
  }

  const resolvedInputPath = path.resolve(inputPath);
  const inputExtension = path.extname(resolvedInputPath).toLowerCase();
  if (WORKBOOK_EXTENSIONS.has(inputExtension)) {
    throw new Error(
      [
        `Workbook inputs are not supported yet: ${resolvedInputPath}`,
        "This generator currently accepts canonical JSON profile input only.",
        "Convert the Garmin profile to JSON first, or wait for the later Profile.xlsx parsing extension."
      ].join(" ")
    );
  }

  await ensureFileExists(resolvedInputPath, `FIT profile JSON not found: ${resolvedInputPath}`);

  const rawInput = await readFile(resolvedInputPath, "utf8");
  const profile = parseCanonicalProfileJson(rawInput, resolvedInputPath);
  const generated = normalizeProfile(
    profile,
    resolvedInputPath,
    generatedAt,
    sha256(rawInput),
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

#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT = path.resolve("src/generated/fitProfileCompatibility.generated.ts");
const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";
const GENERATOR_VERSION = "community-profile-xlsx-0";
const COMMUNITY_PROFILE_SOURCE_NAME = "HarryOnline community FIT profile";
const COMMUNITY_PROFILE_SOURCE_URL =
  "https://www.harryonline.net/blog-en/beyond-the-sdk-uncovering-undocumented-garmin-fit-file-information/14727/";

export const FIT_PROFILE_COMPATIBILITY_GENERATOR_USAGE = [
  "Usage: node scripts/generate-fit-profile-compatibility.mjs [--generated-at ISO-8601] /path/to/community-profile.xlsx [output-file]",
  "Input is the HarryOnline community FIT profile workbook export."
].join(" ");

export async function buildGeneratedCompatibilityArtifact({ inputPath, generatedAt } = {}) {
  if (!inputPath) {
    throw new Error(FIT_PROFILE_COMPATIBILITY_GENERATOR_USAGE);
  }

  const resolvedInputPath = path.resolve(inputPath);
  await ensureFileExists(resolvedInputPath, `FIT community profile workbook not found: ${resolvedInputPath}`);

  const input = await readFile(resolvedInputPath);
  const workbook = readXlsxWorkbook(input);
  const rows = workbook.sheets.get("Messages");
  if (!rows) {
    throw new Error("Community FIT profile workbook must include a Messages worksheet.");
  }

  const messages = parseCommunityMessages(rows);
  return emitGeneratedCompatibilityProfile({
    source: {
      generatorVersion: GENERATOR_VERSION,
      generatedAt: generatedAt ?? DEFAULT_GENERATED_AT,
      workbookPath: path.basename(resolvedInputPath),
      workbookSha256: sha256(input),
      sourceName: COMMUNITY_PROFILE_SOURCE_NAME,
      sourceUrl: COMMUNITY_PROFILE_SOURCE_URL,
    },
    messages,
  });
}

export async function writeGeneratedCompatibilityArtifact({
  inputPath,
  outputPath = DEFAULT_OUTPUT,
  generatedAt,
} = {}) {
  const output = await buildGeneratedCompatibilityArtifact({ inputPath, generatedAt });
  await writeFile(outputPath, `${output}\n`);
  return output;
}

function parseCommunityMessages(rows) {
  const messages = [];
  let currentMessage;

  for (const row of rows.slice(1)) {
    const messageName = cleanCell(row.A);
    const fieldName = cleanCell(row.C);
    const fieldType = cleanCell(row.D);

    if (messageName && !fieldName && !fieldType && !isWorkbookNumber(messageName)) {
      currentMessage = {
        number: parseOptionalMessageNumber(row),
        name: messageName,
        fields: [],
      };
      messages.push(currentMessage);
      continue;
    }

    if (!currentMessage || !fieldName || !fieldType) {
      continue;
    }

    const fieldNumber = parseWorkbookInteger(row.A) ?? parseWorkbookInteger(row.B);
    if (!Number.isInteger(fieldNumber) || fieldNumber < 0 || fieldNumber > 255) {
      continue;
    }

    const primitive = resolvePrimitiveType(fieldType);
    currentMessage.fields.push(orderedObject({
      number: fieldNumber,
      name: fieldName,
      baseType: primitive.baseType,
      size: primitive.size,
      type: fieldType,
      scale: parseOptionalWorkbookNumber(row.G),
      offset: parseOptionalWorkbookNumber(row.H),
      units: cleanCell(row.I) || inferUnits(fieldName, fieldType),
      values: [],
      comment: cleanCell(row.N) || undefined,
      profileSource: COMMUNITY_PROFILE_SOURCE_NAME,
      profileSourceUrl: COMMUNITY_PROFILE_SOURCE_URL,
    }));
  }

  return messages
    .filter((message) => message.fields.length > 0)
    .sort(compareCompatibilityMessages)
    .map((message) => orderedObject({
      ...message,
      fields: message.fields.sort(compareByNumberThenName),
    }));
}

function parseOptionalMessageNumber(row) {
  return parseWorkbookInteger(row.Q) ?? parseWorkbookInteger(row.O) ?? parseLikelyMessageNumber(row.B);
}

function parseLikelyMessageNumber(value) {
  const number = parseWorkbookInteger(value);
  return Number.isInteger(number) && number >= 0 && number <= 655 ? number : undefined;
}

function resolvePrimitiveType(fieldType) {
  const primitive = PRIMITIVE_TYPES.get(fieldType);
  return primitive ?? { baseType: "unknown", size: 0 };
}

function inferUnits(fieldName, fieldType) {
  if (fieldType === "sint32" && /(?:^|_)(?:lat|long|position_lat|position_long)$/.test(fieldName)) {
    return "semicircles";
  }
  return undefined;
}

function readXlsxWorkbook(input) {
  const archive = readZipEntries(input);
  const sharedStrings = parseSharedStrings(readZipText(archive, "xl/sharedStrings.xml"));
  const workbookXml = readZipText(archive, "xl/workbook.xml");
  const relsXml = readZipText(archive, "xl/_rels/workbook.xml.rels");
  const relationships = parseWorkbookRelationships(relsXml);
  const sheets = new Map();

  for (const sheet of parseWorkbookSheets(workbookXml)) {
    const target = relationships.get(sheet.relationshipId);
    if (!target) {
      continue;
    }
    sheets.set(sheet.name, parseWorksheetRows(readZipText(archive, normalizeWorkbookTarget(target)), sharedStrings));
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
      throw new Error("Invalid ZIP central directory in FIT community profile workbook.");
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
  return [...xml.matchAll(/<sheet\b([^>]*)\/>/g)].map((match) => {
    const attrs = parseXmlAttributes(match[1]);
    return {
      name: attrs.name,
      relationshipId: attrs["r:id"],
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
  return [...xml.matchAll(/<si\b[^>]*>(.*?)<\/si>/gs)].map((match) => (
    [...match[1].matchAll(/<t\b[^>]*>(.*?)<\/t>/gs)]
      .map((text) => decodeXml(text[1]))
      .join("")
  ));
}

function parseWorksheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>(.*?)<\/row>/gs)) {
    const row = {};
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>(.*?)<\/c>/gs)) {
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
    const index = Number(xml.match(/<v>(.*?)<\/v>/s)?.[1]);
    return sharedStrings[index] ?? "";
  }

  if (attrs.t === "inlineStr") {
    return [...xml.matchAll(/<t\b[^>]*>(.*?)<\/t>/gs)]
      .map((match) => decodeXml(match[1]))
      .join("");
  }

  return decodeXml(xml.match(/<v>(.*?)<\/v>/s)?.[1] ?? "");
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

function parseWorkbookInteger(value) {
  const trimmed = cleanCell(value);
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    return Number.parseInt(trimmed, 16);
  }
  if (/^-?\d+(?:\.0+)?$/.test(trimmed)) {
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

function isWorkbookNumber(value) {
  return parseWorkbookInteger(value) !== undefined;
}

function orderedObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function compareCompatibilityMessages(left, right) {
  const leftNumber = left.number ?? Number.MAX_SAFE_INTEGER;
  const rightNumber = right.number ?? Number.MAX_SAFE_INTEGER;
  return leftNumber - rightNumber || left.name.localeCompare(right.name);
}

function compareByNumberThenName(left, right) {
  return left.number - right.number || left.name.localeCompare(right.name);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function ensureFileExists(filePath, message) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    throw new Error(message);
  }
}

function emitGeneratedCompatibilityProfile(profile) {
  return [
    "/**",
    " * @generated by scripts/generate-fit-profile-compatibility.mjs",
    " * DO NOT EDIT.",
    " */",
    "",
    'import type { FitProfileCompatibilityData } from "../fit/profile";',
    "",
    `export const FIT_PROFILE_COMPATIBILITY: FitProfileCompatibilityData = ${JSON.stringify(profile, null, 2)} as const;`
  ].join("\n");
}

function parseArgs(argv) {
  const positionals = [];
  let generatedAt;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--generated-at") {
      generatedAt = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--generated-at=")) {
      generatedAt = arg.slice("--generated-at=".length);
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

const PRIMITIVE_TYPES = new Map([
  ["enum", { baseType: "enum", size: 1 }],
  ["bool", { baseType: "enum", size: 1 }],
  ["sint8", { baseType: "sint8", size: 1 }],
  ["uint8", { baseType: "uint8", size: 1 }],
  ["sint16", { baseType: "sint16", size: 2 }],
  ["uint16", { baseType: "uint16", size: 2 }],
  ["sint32", { baseType: "sint32", size: 4 }],
  ["uint32", { baseType: "uint32", size: 4 }],
  ["string", { baseType: "string", size: 1 }],
  ["float32", { baseType: "float32", size: 4 }],
  ["float64", { baseType: "float64", size: 8 }],
  ["uint8z", { baseType: "uint8z", size: 1 }],
  ["uint16z", { baseType: "uint16z", size: 2 }],
  ["uint32z", { baseType: "uint32z", size: 4 }],
  ["byte", { baseType: "byte", size: 1 }],
  ["sint64", { baseType: "sint64", size: 8 }],
  ["uint64", { baseType: "uint64", size: 8 }],
  ["uint64z", { baseType: "uint64z", size: 8 }],
  ["date_time", { baseType: "uint32", size: 4 }],
  ["local_date_time", { baseType: "uint32", size: 4 }],
]);

async function main() {
  const { generatedAt, help, positionals } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(`${FIT_PROFILE_COMPATIBILITY_GENERATOR_USAGE}\n`);
    return;
  }

  await writeGeneratedCompatibilityArtifact({
    inputPath: positionals[0],
    outputPath: positionals[1] ? path.resolve(positionals[1]) : DEFAULT_OUTPUT,
    generatedAt,
  });
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

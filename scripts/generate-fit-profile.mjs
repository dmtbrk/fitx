#!/usr/bin/env node

import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

const DEFAULT_OUTPUT = path.resolve("src/generated/fitProfile.generated.ts");

async function main() {
  const workbookPath = process.argv[2];
  const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT;

  if (!workbookPath) {
    throw new Error(
      "Usage: node scripts/generate-fit-profile.mjs /absolute/or/relative/path/to/Profile.xlsx [output-file]"
    );
  }

  const resolvedWorkbookPath = path.resolve(workbookPath);
  await ensureFileExists(resolvedWorkbookPath, `FIT workbook not found: ${resolvedWorkbookPath}`);

  const xlsx = await loadXlsx();
  if (!xlsx) {
    throw new Error(
      [
        'The "xlsx" package is required to generate FIT profile metadata.',
        "Install it in the local dev environment, then rerun this script with a local Garmin Profile.xlsx path."
      ].join(" ")
    );
  }

  throw new Error(
    [
      "FIT profile generation is scaffolded only in this repository snapshot.",
      `Workbook path accepted: ${resolvedWorkbookPath}.`,
      `Output path would be: ${outputPath}.`,
      "Replace buildGeneratedArtifact() with real Profile.xlsx parsing when the local xlsx dependency and Garmin workbook are available."
    ].join(" ")
  );
}

async function ensureFileExists(filePath, message) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch {
    throw new Error(message);
  }
}

async function loadXlsx() {
  try {
    return await import("xlsx");
  } catch {
    return null;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

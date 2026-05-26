import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  FIT_PROFILE_GENERATOR_USAGE,
  buildGeneratedProfileArtifact,
  parseArgs,
} from "../../scripts/generate-fit-profile.mjs";

const fixturePath = fileURLToPath(new URL("../fixtures/fit-profile.canonical.json", import.meta.url));

describe("fit profile generator", () => {
  it("emits a deterministic TypeScript artifact from canonical JSON input", async () => {
    const first = await buildGeneratedProfileArtifact({
      inputPath: fixturePath,
      generatedAt: "2026-01-02T03:04:05.000Z"
    });
    const second = await buildGeneratedProfileArtifact({
      inputPath: fixturePath,
      generatedAt: "2026-01-02T03:04:05.000Z"
    });

    expect(first).toBe(second);
    expect(first).toContain("export const FIT_PROFILE_GENERATED: FitProfileGeneratedData = {");
    expect(first).toContain('"generatorVersion": "canonical-json-fixture"');
    expect(first).toContain('"generatedAt": "2026-01-02T03:04:05.000Z"');
    expect(first).toContain('"workbookPath": "fixtures/fit-profile.canonical.json"');
    expect(first).toMatch(/"workbookSha256": "[a-f0-9]{64}"/);
    expect(first).toContain('"name": "file_id"');
    expect(first).toContain('"name": "record"');
    expect(first).toContain('"comment": "Time series sample message."');
    expect(first).toContain('"components": [');
    expect(first).toContain('"fieldNumber": 1');
    expect(first).toContain('"scale": 10');
    expect(first).toContain('"offset": 2');
    expect(first).toContain('"units": "bpm"');
    expect(first).toContain('"comment": "FIT file purpose."');
  });

  it("emits a TypeScript artifact from Garmin Profile.xlsx workbook input", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const workbookPath = path.join(tempDirectory, "Profile.xlsx");

    try {
      await writeFile(workbookPath, createWorkbookFixture());

      const generated = await buildGeneratedProfileArtifact({
        inputPath: workbookPath,
        generatedAt: "2026-01-02T03:04:05.000Z"
      });

      expect(generated).toContain('"generatorVersion": "profile-xlsx-0"');
      expect(generated).toContain('"workbookPath": "Profile.xlsx"');
      expect(generated).toMatch(/"workbookSha256": "[a-f0-9]{64}"/);
      expect(generated).toContain('"number": 19');
      expect(generated).toContain('"name": "lap"');
      expect(generated).toContain('"name": "start_position_lat"');
      expect(generated).toContain('"type": "semicircles"');
      expect(generated).toContain('"scale": 100');
      expect(generated).toContain('"units": "m"');
      expect(generated).not.toContain('"name": "running_product"');
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects duplicate message and field numbers", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const duplicateMessagePath = path.join(tempDirectory, "duplicate-message.json");
    const duplicateFieldPath = path.join(tempDirectory, "duplicate-field.json");

    try {
      await writeFile(
        duplicateMessagePath,
        JSON.stringify({
          types: [],
          messages: [
            { number: 20, name: "record", fields: [] },
            { number: 20, name: "record_duplicate", fields: [] }
          ]
        }),
      );
      await writeFile(
        duplicateFieldPath,
        JSON.stringify({
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [
                { number: 3, name: "heart_rate", baseType: "uint8", size: 1 },
                { number: 3, name: "heart_rate_duplicate", baseType: "uint8", size: 1 }
              ]
            }
          ]
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: duplicateMessagePath }),
      ).rejects.toThrow("Duplicate FIT profile message number: 20");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: duplicateFieldPath }),
      ).rejects.toThrow("Duplicate FIT profile field number 3 in message record.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects malformed top-level sections", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const missingTypesPath = path.join(tempDirectory, "missing-types.json");
    const malformedMessagesPath = path.join(tempDirectory, "malformed-messages.json");

    try {
      await writeFile(
        missingTypesPath,
        JSON.stringify({
          messages: []
        }),
      );
      await writeFile(
        malformedMessagesPath,
        JSON.stringify({
          types: [],
          messages: {}
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: missingTypesPath }),
      ).rejects.toThrow("must include a types array");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: malformedMessagesPath }),
      ).rejects.toThrow("must include a messages array");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects messages without a fields array", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const missingFieldsPath = path.join(tempDirectory, "missing-fields.json");

    try {
      await writeFile(
        missingFieldsPath,
        JSON.stringify({
          types: [],
          messages: [{ number: 20, name: "record" }]
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: missingFieldsPath }),
      ).rejects.toThrow("FIT profile fields for message record must be an array.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects malformed required type metadata", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const invalidTypePath = path.join(tempDirectory, "invalid-type.json");
    const invalidSignedPath = path.join(tempDirectory, "invalid-signed.json");

    try {
      await writeFile(
        invalidTypePath,
        JSON.stringify({
          types: [{ name: "sport", baseType: "enum", size: "1", signed: false }],
          messages: []
        }),
      );
      await writeFile(
        invalidSignedPath,
        JSON.stringify({
          types: [{ name: "sport", baseType: "enum", size: 1, signed: "false" }],
          messages: []
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: invalidTypePath }),
      ).rejects.toThrow("FIT profile type sport size must be an integer.");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: invalidSignedPath }),
      ).rejects.toThrow("FIT profile type sport signed must be a boolean.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects duplicate type names and enum values", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const duplicateTypePath = path.join(tempDirectory, "duplicate-type.json");
    const duplicateEnumPath = path.join(tempDirectory, "duplicate-enum.json");

    try {
      await writeFile(
        duplicateTypePath,
        JSON.stringify({
          types: [
            { name: "sport", baseType: "enum", size: 1, signed: false, values: [] },
            { name: "sport", baseType: "enum", size: 1, signed: false, values: [] }
          ],
          messages: []
        }),
      );
      await writeFile(
        duplicateEnumPath,
        JSON.stringify({
          types: [
            {
              name: "sport",
              baseType: "enum",
              size: 1,
              signed: false,
              values: [
                { value: 1, name: "running" },
                { value: 1, name: "running_duplicate" }
              ]
            }
          ],
          messages: []
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: duplicateTypePath }),
      ).rejects.toThrow("Duplicate FIT profile type name: sport");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: duplicateEnumPath }),
      ).rejects.toThrow("Duplicate FIT profile enum value 1 in type sport.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects malformed components", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const invalidComponentPath = path.join(tempDirectory, "invalid-component.json");

    try {
      await writeFile(
        invalidComponentPath,
        JSON.stringify({
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [
                {
                  number: 3,
                  name: "heart_rate",
                  baseType: "uint8",
                  size: 1,
                  components: [{ scale: "10" }]
                }
              ]
            }
          ]
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: invalidComponentPath }),
      ).rejects.toThrow("component fieldNumber must be an integer");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects malformed optional field metadata", async () => {
    const invalidCases = [
      ["invalid-scale", { scale: "10" }, "FIT profile field record.heart_rate scale must be a finite number."],
      ["invalid-offset", { offset: "2" }, "FIT profile field record.heart_rate offset must be a finite number."],
      ["invalid-units", { units: 5 }, "FIT profile field record.heart_rate units must be a string."],
      ["invalid-type", { type: 5 }, "FIT profile field record.heart_rate type must be a string."],
      ["invalid-comment", { comment: 5 }, "FIT profile field record.heart_rate comment must be a string."],
    ];
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));

    try {
      for (const [name, invalidMetadata, expectedMessage] of invalidCases) {
        const filePath = path.join(tempDirectory, `${name}.json`);
        await writeFile(
          filePath,
          JSON.stringify({
            types: [],
            messages: [
              {
                number: 20,
                name: "record",
                fields: [
                  {
                    number: 3,
                    name: "heart_rate",
                    baseType: "uint8",
                    size: 1,
                    ...invalidMetadata
                  }
                ]
              }
            ]
          }),
        );

        await expect(
          buildGeneratedProfileArtifact({ inputPath: filePath }),
        ).rejects.toThrow(expectedMessage);
      }
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects null entries inside profile arrays", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const nullTypePath = path.join(tempDirectory, "null-type.json");
    const nullEnumPath = path.join(tempDirectory, "null-enum.json");
    const nullComponentPath = path.join(tempDirectory, "null-component.json");

    try {
      await writeFile(
        nullTypePath,
        JSON.stringify({
          types: [null],
          messages: []
        }),
      );
      await writeFile(
        nullEnumPath,
        JSON.stringify({
          types: [{ name: "sport", baseType: "enum", size: 1, signed: false, values: [null] }],
          messages: []
        }),
      );
      await writeFile(
        nullComponentPath,
        JSON.stringify({
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [
                {
                  number: 3,
                  name: "heart_rate",
                  baseType: "uint8",
                  size: 1,
                  components: [null]
                }
              ]
            }
          ]
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: nullTypePath }),
      ).rejects.toThrow("FIT profile type entries must be objects.");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: nullEnumPath }),
      ).rejects.toThrow("FIT profile enum entries for type sport must be objects.");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: nullComponentPath }),
      ).rejects.toThrow("FIT profile component entries for field record.heart_rate must be objects.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects explicit null enum collections", async () => {
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));
    const nullTypeValuesPath = path.join(tempDirectory, "null-type-values.json");
    const nullFieldValuesPath = path.join(tempDirectory, "null-field-values.json");

    try {
      await writeFile(
        nullTypeValuesPath,
        JSON.stringify({
          types: [{ name: "sport", baseType: "enum", size: 1, signed: false, values: null }],
          messages: []
        }),
      );
      await writeFile(
        nullFieldValuesPath,
        JSON.stringify({
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [
                {
                  number: 3,
                  name: "heart_rate",
                  baseType: "uint8",
                  size: 1,
                  values: null
                }
              ]
            }
          ]
        }),
      );

      await expect(
        buildGeneratedProfileArtifact({ inputPath: nullTypeValuesPath }),
      ).rejects.toThrow("FIT profile enum values for type sport must be an array.");
      await expect(
        buildGeneratedProfileArtifact({ inputPath: nullFieldValuesPath }),
      ).rejects.toThrow("FIT profile enum values for field record.heart_rate must be an array.");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("rejects FIT metadata outside supported numeric ranges", async () => {
    const invalidCases = [
      [
        "invalid-type-size",
        {
          types: [{ name: "sport", baseType: "enum", size: 0, signed: false }],
          messages: []
        },
        "FIT profile type sport size must be between 1 and 255."
      ],
      [
        "invalid-message-number",
        {
          types: [],
          messages: [{ number: -1, name: "record", fields: [] }]
        },
        "FIT profile message record number must be between 0 and 65534."
      ],
      [
        "invalid-field-number",
        {
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [{ number: 256, name: "heart_rate", baseType: "uint8", size: 1 }]
            }
          ]
        },
        "FIT profile field record.heart_rate number must be between 0 and 255."
      ],
      [
        "invalid-field-size",
        {
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [{ number: 3, name: "heart_rate", baseType: "uint8", size: 0 }]
            }
          ]
        },
        "FIT profile field record.heart_rate size must be between 1 and 255."
      ],
      [
        "invalid-component-number",
        {
          types: [],
          messages: [
            {
              number: 20,
              name: "record",
              fields: [
                {
                  number: 3,
                  name: "heart_rate",
                  baseType: "uint8",
                  size: 1,
                  components: [{ fieldNumber: 256 }]
                }
              ]
            }
          ]
        },
        "FIT profile field record.heart_rate component fieldNumber must be between 0 and 255."
      ]
    ];
    const tempDirectory = await mkdtemp(path.join(tmpdir(), "fitx-profile-"));

    try {
      for (const [name, input, expectedMessage] of invalidCases) {
        const filePath = path.join(tempDirectory, `${name}.json`);
        await writeFile(filePath, JSON.stringify(input));

        await expect(
          buildGeneratedProfileArtifact({ inputPath: filePath }),
        ).rejects.toThrow(expectedMessage);
      }
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("parses help without treating it as a generation failure", () => {
    const parsed = parseArgs(["--help"]);

    expect(parsed).toEqual({
      generatedAt: undefined,
      help: true,
      positionals: []
    });
    expect(FIT_PROFILE_GENERATOR_USAGE).toContain("Usage: node scripts/generate-fit-profile.mjs");
    expect(FIT_PROFILE_GENERATOR_USAGE).toContain("Garmin Profile.xlsx workbook input is supported");
  });
});

function createWorkbookFixture() {
  const files = new Map([
    [
      "xl/workbook.xml",
      `<?xml version="1.0" encoding="utf-8"?>
      <x:workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <x:sheets>
          <x:sheet name="Types" sheetId="1" r:id="rId1" />
          <x:sheet name="Messages" sheetId="2" r:id="rId2" />
        </x:sheets>
      </x:workbook>`
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<?xml version="1.0" encoding="utf-8"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml" Id="rId1" />
        <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet2.xml" Id="rId2" />
      </Relationships>`
    ],
    [
      "xl/sharedStrings.xml",
      `<?xml version="1.0" encoding="utf-8"?>
      <x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" />`
    ],
    [
      "xl/worksheets/sheet1.xml",
      createWorksheet([
        ["Type Name", "Base Type", "Value Name", "Value", "Comment"],
        ["mesg_num", "uint16", "", "", ""],
        ["", "", "file_id", "0", ""],
        ["", "", "lap", "19", ""],
        ["date_time", "uint32", "", "", ""],
        ["semicircles", "sint32", "", "", ""],
        ["uint32", "uint32", "", "", ""],
        ["uint16", "uint16", "", "", ""],
        ["sport", "enum", "", "", ""],
        ["", "", "running", "1", "Run sport"]
      ])
    ],
    [
      "xl/worksheets/sheet2.xml",
      createWorksheet([
        [
          "Message Name",
          "Field Def #",
          "Field Name",
          "Field Type",
          "Array",
          "Components",
          "Scale",
          "Offset",
          "Units",
          "Bits",
          "Accumulate",
          "Ref Field Name",
          "Ref Field Value",
          "Comment",
          "Products:",
          "EXAMPLE"
        ],
        ["file_id", "", "", "", "", "", "", "", "", "", "", "", "", "Must be first message in file.", "", ""],
        ["", "0", "type", "uint16", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "4", "time_created", "date_time", "", "", "", "", "s", "", "", "", "", "Creation time.", "", ""],
        ["lap", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "253", "timestamp", "date_time", "", "", "", "", "s", "", "", "", "", "", "", ""],
        ["", "3", "start_position_lat", "semicircles", "", "", "", "", "semicircles", "", "", "", "", "", "", ""],
        ["", "9", "total_distance", "uint32", "", "", "100", "", "m", "", "", "", "", "", "", ""],
        ["", "25", "sport", "sport", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "running_product", "uint16", "", "", "", "", "", "", "", "sport", "running", "", "", ""]
      ])
    ]
  ]);

  return createZip(files);
}

function createWorksheet(rows) {
  return `<?xml version="1.0" encoding="utf-8"?>
  <x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <x:sheetData>
      ${rows.map((row, rowIndex) => (
        `<x:row r="${rowIndex + 1}">${row.map((value, columnIndex) => (
          value === ""
            ? ""
            : `<x:c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><x:is><x:t>${escapeXml(value)}</x:t></x:is></x:c>`
        )).join("")}</x:row>`
      )).join("")}
    </x:sheetData>
  </x:worksheet>`;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, text] of files) {
    const nameBuffer = Buffer.from(name, "utf8");
    const compressed = deflateRawSync(Buffer.from(text, "utf8"));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(Buffer.byteLength(text, "utf8"), 22);
    local.writeUInt16LE(nameBuffer.length, 26);

    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(Buffer.byteLength(text, "utf8"), 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + compressed.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.size, 8);
  eocd.writeUInt16LE(files.size, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

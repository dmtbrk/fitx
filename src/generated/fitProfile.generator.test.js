import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
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

  it("rejects workbook inputs with actionable copy", async () => {
    const workbookPath = path.join(path.dirname(fixturePath), "Profile.xlsx");

    await expect(buildGeneratedProfileArtifact({ inputPath: workbookPath })).rejects.toThrow(
      "Workbook inputs are not supported yet"
    );
    await expect(buildGeneratedProfileArtifact({ inputPath: workbookPath })).rejects.toThrow(
      "canonical JSON profile input only"
    );
    await expect(buildGeneratedProfileArtifact({ inputPath: workbookPath })).rejects.toThrow(
      "Profile.xlsx parsing"
    );
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
    expect(FIT_PROFILE_GENERATOR_USAGE).toContain("Canonical JSON profile input is supported now.");
  });
});

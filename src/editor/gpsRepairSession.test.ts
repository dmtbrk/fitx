import { describe, expect, it } from "vitest";
import {
  buildGpsRepairPreviewEdits,
  collectGpsRepairRuns,
  degreesToSemicircles,
} from "./gpsRepair";
import {
  createEmptyEditOverlay,
  getEditsForMessage,
  stageEditsIntoOverlay,
} from "./editOverlay";
import type { FitDataRecord, FitDocument, FitField } from "../fit";

describe("gps repair session integration", () => {
  it("stages only GPS edits for the selected bounded run", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 51.5, 13.4),
      makeRecord("record-2", 1, 110, null, null),
      makeRecord("record-3", 2, 120, 51.6, 13.5),
    ]);
    const [run] = collectGpsRepairRuns(document);
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const edits = buildGpsRepairPreviewEdits(run, {
      points: [
        { lat: 51.5, lon: 13.4 },
        { lat: 51.55, lon: 13.45 },
        { lat: 51.6, lon: 13.5 },
      ],
    });
    const overlay = stageEditsIntoOverlay(createEmptyEditOverlay(), edits);

    expect(getEditsForMessage(overlay, "record-2")).toEqual([
      expect.objectContaining({ fieldNumber: 0, fieldName: "position_lat" }),
      expect.objectContaining({ fieldNumber: 1, fieldName: "position_long" }),
    ]);
    expect(getEditsForMessage(overlay, "record-1")).toEqual([]);
    expect(getEditsForMessage(overlay, "record-3")).toEqual([]);
  });
});

function makeDocument(messages: readonly FitDataRecord[]): FitDocument {
  return {
    source: new ArrayBuffer(0),
    fileName: "activity.fit",
    fileSize: 0,
    header: {
      headerSize: 12,
      protocolVersionRaw: 0,
      profileVersionRaw: 0,
      protocolVersion: "0.0",
      profileVersion: "0.0",
      dataSize: 0,
      dataType: ".FIT",
    },
    checksum: {
      fileCrc: 0,
      fileCrcValid: true,
    },
    records: [...messages],
    definitions: [],
    messages: [...messages],
    issues: [],
  };
}

function makeRecord(
  id: string,
  order: number,
  timestampSeconds: number,
  latitudeDegrees: number | null,
  longitudeDegrees: number | null,
): FitDataRecord {
  const fields: FitField[] = [
    makeField(id, 253, "timestamp", timestampSeconds, "uint32", 0x86),
  ];

  if (latitudeDegrees !== null) {
    fields.push(
      makeField(
        id,
        0,
        "position_lat",
        degreesToSemicircles(latitudeDegrees),
        "sint32",
        0x85,
      ),
    );
  }
  if (longitudeDegrees !== null) {
    fields.push(
      makeField(
        id,
        1,
        "position_long",
        degreesToSemicircles(longitudeDegrees),
        "sint32",
        0x85,
      ),
    );
  }

  return {
    kind: "data",
    id,
    order,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: 20,
    messageName: "record",
    definitionId: "definition-record",
    fields,
    span: { start: 0, end: 0 },
  };
}

function makeField(
  id: string,
  number: number,
  name: string,
  value: number,
  baseTypeName: string,
  baseType: number,
): FitField {
  return {
    id: `${id}:${name}`,
    number,
    name,
    baseType,
    baseTypeName,
    size: 4,
    value,
    rawValue: value,
    units: number === 253 ? "s" : "semicircles",
    known: true,
    profile: {
      known: true,
      messageNumber: 20,
      messageName: "record",
      number,
      name,
      baseType: baseTypeName,
      size: 4,
      values: [],
      units: number === 253 ? "s" : "semicircles",
    },
    span: { start: 0, end: 0 },
    developer: false,
  };
}

import { describe, expect, it } from "vitest";
import {
  buildGpsRepairPreviewEdits,
  collectGpsRouteSegments,
  collectGpsRepairRuns,
  degreesToSemicircles,
  semicirclesToDegrees,
} from "./gpsRepair";
import type { FitGpsRepairRun } from "./gpsRepair";
import type { FitDataRecord, FitDocument, FitField } from "../fit";

describe("gps repair", () => {
  it("converts between semicircles and degrees", () => {
    expect(degreesToSemicircles(90)).toBe(1073741824);
    expect(semicirclesToDegrees(1073741824)).toBeCloseTo(90, 10);
    expect(semicirclesToDegrees(degreesToSemicircles(51.5))).toBeCloseTo(51.5, 6);
  });

  it("detects bounded contiguous runs of record messages missing GPS positions", () => {
    const document = makeDocument([
      makeRecord("record-0", 0, 90, null, null),
      makeRecord("record-1", 1, 100, 51.5, 13.4),
      makeRecord("record-2", 2, 110, null, 13.41),
      makeRecord("record-3", 3, 120, null, null),
      makeRecord("record-4", 4, 130, 51.6, 13.5),
      makeRecord("record-5", 5, 140, 51.61, null),
    ]);

    const runs = collectGpsRepairRuns(document);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toBeDefined();
    if (!runs[0]) {
      throw new Error("Expected one GPS repair run.");
    }

    expect(runs[0].before.record.id).toBe("record-1");
    expect(runs[0].before.timestampSeconds).toBe(100);
    expect(runs[0].before.latitudeDegrees).toBeCloseTo(51.5, 6);
    expect(runs[0].before.longitudeDegrees).toBeCloseTo(13.4, 6);
    expect(runs[0].after.record.id).toBe("record-4");
    expect(runs[0].after.timestampSeconds).toBe(130);
    expect(runs[0].after.latitudeDegrees).toBeCloseTo(51.6, 6);
    expect(runs[0].after.longitudeDegrees).toBeCloseTo(13.5, 6);
    expect(runs[0].missingRecords).toEqual([
      expect.objectContaining({
        record: expect.objectContaining({ id: "record-2" }),
        timestampSeconds: 110,
        missingLatitude: true,
        missingLongitude: false,
      }),
      expect.objectContaining({
        record: expect.objectContaining({ id: "record-3" }),
        timestampSeconds: 120,
        missingLatitude: true,
        missingLongitude: true,
      }),
    ]);
  });

  it("maps a routed polyline back onto missing records in timestamp order with only position edits", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 125, null, 10),
      makeRecord("record-3", 2, 175, null, null),
      makeRecord("record-4", 3, 200, 10, 10),
    ]);
    const [run] = collectGpsRepairRuns(document);

    expect(run).toBeDefined();
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const edits = buildGpsRepairPreviewEdits(run, {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 10 },
        { lat: 10, lon: 10 },
      ],
    });

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        fieldName: "position_lat",
        baseType: 0x85,
        baseTypeName: "sint32",
        size: 4,
        units: "semicircles",
        added: true,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 0,
        fieldName: "position_lat",
        baseType: 0x85,
        baseTypeName: "sint32",
        size: 4,
        units: "semicircles",
        added: true,
        value: degreesToSemicircles(5),
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 1,
        fieldName: "position_long",
        baseType: 0x85,
        baseTypeName: "sint32",
        size: 4,
        units: "semicircles",
        added: true,
        value: degreesToSemicircles(10),
      }),
    ]);
  });

  it("splits known route geometry at missing GPS spans", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 51.5, 13.4),
      makeRecord("record-2", 1, 110, 51.51, 13.41),
      makeRecord("record-3", 2, 120, null, null),
      makeRecord("record-4", 3, 130, 51.6, 13.5),
    ]);

    expect(collectGpsRouteSegments(document)).toEqual([
      [
        { lat: expect.closeTo(51.5, 6), lon: expect.closeTo(13.4, 6) },
        { lat: expect.closeTo(51.51, 6), lon: expect.closeTo(13.41, 6) },
      ],
      [{ lat: expect.closeTo(51.6, 6), lon: expect.closeTo(13.5, 6) }],
    ]);
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
    makeField({
      id: `${id}:timestamp`,
      number: 253,
      name: "timestamp",
      baseType: 0x86,
      baseTypeName: "uint32",
      size: 4,
      value: timestampSeconds,
      rawValue: timestampSeconds,
      known: true,
    }),
  ];

  if (latitudeDegrees !== null) {
    fields.push(makeField({
      id: `${id}:position_lat`,
      number: 0,
      name: "position_lat",
      baseType: 0x85,
      baseTypeName: "sint32",
      size: 4,
      value: degreesToSemicircles(latitudeDegrees),
      rawValue: degreesToSemicircles(latitudeDegrees),
      known: true,
    }));
  }

  if (longitudeDegrees !== null) {
    fields.push(makeField({
      id: `${id}:position_long`,
      number: 1,
      name: "position_long",
      baseType: 0x85,
      baseTypeName: "sint32",
      size: 4,
      value: degreesToSemicircles(longitudeDegrees),
      rawValue: degreesToSemicircles(longitudeDegrees),
      known: true,
    }));
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

function makeField(field: {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly baseType: number;
  readonly baseTypeName: string;
  readonly size: number;
  readonly value: number | null;
  readonly rawValue: number | null;
  readonly known: boolean;
}): FitField {
  return {
    ...field,
    units: field.number === 253 ? "s" : "semicircles",
    profile: {
      known: field.known,
      messageNumber: 20,
      messageName: "record",
      number: field.number,
      name: field.name,
      baseType: field.baseTypeName,
      size: field.size,
      values: [],
      units: field.number === 253 ? "s" : "semicircles",
      comment: undefined,
    },
    span: { start: 0, end: 0 },
    developer: false,
  };
}

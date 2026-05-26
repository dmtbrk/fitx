import { describe, expect, it } from "vitest";
import {
  buildGpsFixedRepair,
  buildGpsFilledRepair,
  buildGpsRecordPositionEdits,
  buildGpsRecordSpeedEdits,
  buildGpsEraseRangeEdits,
  buildGpsRepairAnchorPlacementEdits,
  buildGpsRepairEditsFromPoints,
  buildGpsRepairPreviewEdits,
  calculateGpsRepairRunDistanceMeters,
  calculateRouteDistanceMeters,
  calculateRouteSegmentsDistanceMeters,
  collectGpsRouteSegments,
  collectGpsRepairRuns,
  degreesToSemicircles,
  semicirclesToDegrees,
  updateGpsFixedRepairEditablePoint,
} from "./gpsRepair";
import type { FitGpsRepairRun } from "./gpsRepair";
import { buildMessageSnapshotFromAppliedEdits } from "./editSession";
import type { FitDataRecord, FitDocument, FitField } from "../fit";

describe("gps repair", () => {
  it("converts between semicircles and degrees", () => {
    expect(degreesToSemicircles(90)).toBe(1073741824);
    expect(semicirclesToDegrees(1073741824)).toBeCloseTo(90, 10);
    expect(semicirclesToDegrees(degreesToSemicircles(51.5))).toBeCloseTo(51.5, 6);
  });

  it("detects every contiguous run of record messages missing GPS positions", () => {
    const document = makeDocument([
      makeRecord("record-0", 0, 90, null, null),
      makeRecord("record-1", 1, 100, 51.5, 13.4),
      makeRecord("record-2", 2, 110, null, 13.41),
      makeRecord("record-3", 3, 120, null, null),
      makeRecord("record-4", 4, 130, 51.6, 13.5),
      makeRecord("record-5", 5, 140, 51.61, null),
    ]);

    const runs = collectGpsRepairRuns(document);

    expect(runs).toHaveLength(3);
    const boundedRun = runs[1];
    if (!boundedRun) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    expect(runs[0]?.before).toBeNull();
    expect(runs[0]?.after?.record.id).toBe("record-1");
    expect(runs[0]?.missingRecords.map((record) => record.record.id)).toEqual([
      "record-0",
    ]);
    expect(boundedRun.before?.record.id).toBe("record-1");
    expect(boundedRun.before?.timestampSeconds).toBe(100);
    expect(boundedRun.before?.latitudeDegrees).toBeCloseTo(51.5, 6);
    expect(boundedRun.before?.longitudeDegrees).toBeCloseTo(13.4, 6);
    expect(boundedRun.after?.record.id).toBe("record-4");
    expect(boundedRun.after?.timestampSeconds).toBe(130);
    expect(boundedRun.after?.latitudeDegrees).toBeCloseTo(51.6, 6);
    expect(boundedRun.after?.longitudeDegrees).toBeCloseTo(13.5, 6);
    expect(boundedRun.missingRecords).toEqual([
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
    expect(runs[2]?.before?.record.id).toBe("record-4");
    expect(runs[2]?.after).toBeNull();
    expect(runs[2]?.missingRecords.map((record) => record.record.id)).toEqual([
      "record-5",
    ]);
  });

  it("tracks record timer time across pauses for gap labels", () => {
    const document = makeDocument([
      makeEvent("event-start", 0, 100, 0),
      makeRecord("record-1", 1, 105, 51.5, 13.4),
      makeEvent("event-stop", 2, 110, 1),
      makeEvent("event-restart", 3, 200, 0),
      makeRecord("record-2", 4, 203, null, null),
      makeRecord("record-3", 5, 215, 51.6, 13.5),
    ]);
    const [run] = collectGpsRepairRuns(document);

    expect(run).toBeDefined();
    if (!run?.before || !run.after) {
      throw new Error("Expected one bounded GPS repair run.");
    }

    expect(run.before.timerTimeSeconds).toBe(5);
    expect(run.missingRecords[0]?.timerTimeSeconds).toBe(13);
    expect(run.after.timerTimeSeconds).toBe(25);
  });

  it("places repair points by timer time when absolute timestamps include a pause", () => {
    const document = makeDocument([
      makeEvent("event-start", 0, 100, 0),
      makeRecord("record-1", 1, 105, 0, 0),
      makeEvent("event-stop", 2, 110, 1),
      makeEvent("event-restart", 3, 200, 0),
      makeRecord("record-2", 4, 203, null, null),
      makeRecord("record-3", 5, 215, 0, 0.01),
    ]);
    const [run] = collectGpsRepairRuns(document);

    expect(run).toBeDefined();
    if (!run) {
      throw new Error("Expected one GPS repair run.");
    }

    const edits = buildGpsRepairPreviewEdits(run, {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 0.01 },
      ],
    });

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 1,
        value: degreesToSemicircles(0.004),
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

  it("syncs record speed fields from current GPS segments", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0, 50_000),
      makeRecord("record-2", 1, 110, 0, 0.001, 50_000),
      makeRecord("record-3", 2, 120, null, null, 50_000),
      makeRecord("record-4", 3, 130, 0, 0.002),
      makeRecord("record-5", 4, 140, 0, 0.003),
    ]);

    const edits = buildGpsRecordSpeedEdits(
      document,
      collectGpsRouteSegments(document),
    );
    const expectedRawSpeed = Math.round(
      ((calculateRouteDistanceMeters([
        { lat: 0, lon: 0 },
        { lat: 0, lon: 0.001 },
      ]) ?? 0) /
        10) *
        1000,
    );

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-1",
        fieldNumber: 73,
        value: expectedRawSpeed,
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 73,
        value: expectedRawSpeed,
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 73,
        value: null,
      }),
      expect.objectContaining({
        messageId: "record-4",
        fieldNumber: 73,
        fieldName: "enhanced_speed",
        added: true,
        value: expectedRawSpeed,
      }),
      expect.objectContaining({
        messageId: "record-5",
        fieldNumber: 73,
        fieldName: "enhanced_speed",
        added: true,
        value: expectedRawSpeed,
      }),
    ]);
  });

  it("keeps clumped timestamp placement visible when timer time is unavailable", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 198, null, null),
      makeRecord("record-3", 2, 199, null, null),
      makeRecord("record-4", 3, 200, 0, 0.03),
    ]);
    const [run] = collectGpsRepairRuns(document);
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const edits = buildGpsRepairPreviewEdits(run, {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 0.03 },
      ],
    });

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 1,
        value: degreesToSemicircles(0.0294),
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 0,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 1,
        value: degreesToSemicircles(0.0297),
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
        expect.objectContaining({
          lat: expect.closeTo(51.5, 6),
          lon: expect.closeTo(13.4, 6),
        }),
        expect.objectContaining({
          lat: expect.closeTo(51.51, 6),
          lon: expect.closeTo(13.41, 6),
        }),
      ],
      [
        expect.objectContaining({
          lat: expect.closeTo(51.6, 6),
          lon: expect.closeTo(13.5, 6),
        }),
      ],
    ]);
  });

  it("keeps record identity on route points for map range selection", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 51.5, 13.4),
      makeRecord("record-2", 1, 110, 51.51, 13.41),
    ]);

    expect(collectGpsRouteSegments(document)).toEqual([
      [
        expect.objectContaining({
          recordId: "record-1",
          recordOrder: 0,
          timestampSeconds: 100,
          lat: expect.closeTo(51.5, 6),
          lon: expect.closeTo(13.4, 6),
        }),
        expect.objectContaining({
          recordId: "record-2",
          recordOrder: 1,
          timestampSeconds: 110,
          lat: expect.closeTo(51.51, 6),
          lon: expect.closeTo(13.41, 6),
        }),
      ],
    ]);
  });

  it("builds null GPS edits for an erased selected record range", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 51.5, 13.4),
      makeRecord("record-2", 1, 110, 51.51, 13.41),
      makeRecord("record-3", 2, 120, 51.52, 13.42),
    ]);

    const edits = buildGpsEraseRangeEdits(document, "record-1", "record-2");

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-1",
        fieldNumber: 0,
        fieldName: "position_lat",
        value: null,
      }),
      expect.objectContaining({
        messageId: "record-1",
        fieldNumber: 1,
        fieldName: "position_long",
        value: null,
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        fieldName: "position_lat",
        value: null,
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 1,
        fieldName: "position_long",
        value: null,
      }),
    ]);
  });

  it("places an end anchor on the last missing GPS record", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 110, null, null),
      makeRecord("record-3", 2, 120, null, null),
    ]);
    const [openRun] = collectGpsRepairRuns(document);
    if (!openRun) {
      throw new Error("Expected an open GPS repair run.");
    }

    const edits = buildGpsRepairAnchorPlacementEdits(openRun, "end", {
      lat: 0,
      lon: 0.02,
    });
    const anchoredRecord = buildMessageSnapshotFromAppliedEdits(
      document.messages[2]!,
      edits,
    );
    const [boundedRun] = collectGpsRepairRuns(
      makeDocument([document.messages[0]!, document.messages[1]!, anchoredRecord]),
    );

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 0,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-3",
        fieldNumber: 1,
        value: degreesToSemicircles(0.02),
      }),
    ]);
    expect(boundedRun?.before?.record.id).toBe("record-1");
    expect(boundedRun?.after?.record.id).toBe("record-3");
    expect(boundedRun?.missingRecords.map((record) => record.record.id)).toEqual([
      "record-2",
    ]);
  });

  it("summarizes gap and fixed-route distances for repaired spans", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 110, null, null),
      makeRecord("record-3", 2, 120, 0, 0.01),
    ]);
    const [run] = collectGpsRepairRuns(document);
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const route = {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0.005, lon: 0.005 },
        { lat: 0, lon: 0.01 },
      ],
      distanceMeters: 1600,
    };
    const fixedRepair = buildGpsFixedRepair(run, route);

    expect(calculateGpsRepairRunDistanceMeters(run)).toBeCloseTo(1111.9, 0);
    expect(calculateRouteDistanceMeters(route.points)).toBeGreaterThan(1500);
    expect(fixedRepair).toEqual(
      expect.objectContaining({
        beforeTimestampSeconds: 100,
        afterTimestampSeconds: 120,
        missingRecordCount: 1,
        routePoints: route.points,
      }),
    );
    expect(fixedRepair.gapDistanceMeters).toBeCloseTo(1111.9, 0);
    expect(fixedRepair.fixedDistanceMeters).toBe(1600);
    expect(fixedRepair.editablePoints).toHaveLength(1);
  });

  it("builds a straight filled repair with editable points on the line", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 110, null, null),
      makeRecord("record-3", 2, 120, 0, 0.01),
    ]);
    const [run] = collectGpsRepairRuns(document);
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const repair = buildGpsFilledRepair(run);
    const editablePoint = repair.editablePoints[0];
    if (!editablePoint) {
      throw new Error("Expected one editable repair point.");
    }

    expect(repair.editablePoints).toEqual([
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0.005, 6) },
    ]);
    expect(repair.routePoints).toEqual([
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0, 6) },
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0.005, 6) },
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0.01, 6) },
    ]);
    expect(
      buildGpsRepairEditsFromPoints(repair.run, repair.editablePoints),
    ).toEqual([
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        value: degreesToSemicircles(0),
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 1,
        value: degreesToSemicircles(editablePoint.lon),
      }),
    ]);
  });

  it("updates fixed repair geometry and edits from a manually moved GPS point", () => {
    const document = makeDocument([
      makeRecord("record-1", 0, 100, 0, 0),
      makeRecord("record-2", 1, 110, null, null),
      makeRecord("record-3", 2, 120, 0, 0.01),
    ]);
    const [run] = collectGpsRepairRuns(document);
    if (!run) {
      throw new Error("Expected a bounded GPS repair run.");
    }

    const fixedRepair = buildGpsFixedRepair(run, {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 0.01 },
      ],
    });
    const movedRepair = updateGpsFixedRepairEditablePoint(fixedRepair, 0, {
      lat: 0.005,
      lon: 0.005,
    });

    expect(movedRepair.routePoints).toEqual([
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0, 6) },
      { lat: 0.005, lon: 0.005 },
      { lat: expect.closeTo(0, 6), lon: expect.closeTo(0.01, 6) },
    ]);
    expect(movedRepair.fixedDistanceMeters).toBeCloseTo(
      calculateRouteDistanceMeters(movedRepair.routePoints) ?? 0,
      6,
    );
    expect(
      buildGpsRepairEditsFromPoints(movedRepair.run, movedRepair.editablePoints),
    ).toEqual([
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 0,
        value: degreesToSemicircles(0.005),
      }),
      expect.objectContaining({
        messageId: "record-2",
        fieldNumber: 1,
        value: degreesToSemicircles(0.005),
      }),
    ]);
  });

  it("sums measurable route segments for computed activity distance", () => {
    expect(
      calculateRouteSegmentsDistanceMeters([
        [
          { lat: 0, lon: 0 },
          { lat: 0, lon: 0.01 },
        ],
        [{ lat: 1, lon: 1 }],
        [
          { lat: 0, lon: 0.01 },
          { lat: 0.01, lon: 0.01 },
        ],
      ]),
    ).toBeCloseTo(2223.9, 0);
  });

  it("keeps generated GPS fields editable across repeated record drags", () => {
    const originalRecord = makeRecord("record-1", 1, 100, null, null);
    const firstEdits = buildGpsRecordPositionEdits(
      makeDocument([originalRecord]),
      originalRecord.id,
      { lat: 50.1, lon: 30.1 },
    );
    const effectiveRecord = buildMessageSnapshotFromAppliedEdits(
      originalRecord,
      firstEdits,
    );

    const secondEdits = buildGpsRecordPositionEdits(
      makeDocument([effectiveRecord]),
      originalRecord.id,
      { lat: 50.2, lon: 30.2 },
    );
    const updatedRecord = buildMessageSnapshotFromAppliedEdits(
      originalRecord,
      secondEdits,
    );
    const [segment] = collectGpsRouteSegments(makeDocument([updatedRecord]));

    expect(secondEdits).toEqual([
      expect.objectContaining({
        fieldId: "gps:record-1:position_lat",
        added: true,
        value: degreesToSemicircles(50.2),
      }),
      expect.objectContaining({
        fieldId: "gps:record-1:position_long",
        added: true,
        value: degreesToSemicircles(30.2),
      }),
    ]);
    expect(segment?.[0]).toEqual(
      expect.objectContaining({
        recordId: "record-1",
        lat: expect.closeTo(50.2, 6),
        lon: expect.closeTo(30.2, 6),
      }),
    );
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
  enhancedSpeed: number | null = null,
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

  if (enhancedSpeed !== null) {
    fields.push(makeField({
      id: `${id}:enhanced_speed`,
      number: 73,
      name: "unknown_field_73",
      baseType: 0x86,
      baseTypeName: "uint32",
      size: 4,
      value: enhancedSpeed,
      rawValue: enhancedSpeed,
      known: false,
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

function makeEvent(
  id: string,
  order: number,
  timestampSeconds: number,
  eventType: number,
): FitDataRecord {
  return {
    kind: "data",
    id,
    order,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber: 21,
    messageName: "event",
    definitionId: "definition-event",
    fields: [
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
      makeField({
        id: `${id}:event`,
        number: 0,
        name: "event",
        baseType: 0,
        baseTypeName: "enum",
        size: 1,
        value: 0,
        rawValue: 0,
        known: true,
      }),
      makeField({
        id: `${id}:event_type`,
        number: 1,
        name: "event_type",
        baseType: 0,
        baseTypeName: "enum",
        size: 1,
        value: eventType,
        rawValue: eventType,
        known: true,
      }),
    ],
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

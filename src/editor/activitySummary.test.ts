import { describe, expect, it } from "vitest";
import type { FitDataRecord, FitDocument, FitDataField, FitValue } from "../fit";
import {
  buildFitActivitySummary,
  buildFitLapDataSummaries,
  buildFitMessageDataGroups,
  buildFitSessionDataSummary,
  buildFitLapGpsSummaryEdits,
  buildFitSessionDistanceEdit,
  buildFitSessionGpsSummaryEdits,
} from "./activitySummary";
import { buildMessageSnapshotFromAppliedEdits } from "./editSession";

describe("fit activity summary", () => {
  it("uses session fields as the activity summary source of truth", () => {
    const document = makeDocument([
      makeSession([
        makeField("sport", 1),
        makeField("sub_sport", 0),
        makeField("start_time", fitTimestamp(Date.UTC(2024, 0, 1, 8, 12))),
        makeField("total_distance", 1_242_345),
        makeField("total_timer_time", 2_912_000),
      ]),
      makeRecord([
        makeField("start_time", fitTimestamp(Date.UTC(2023, 0, 1))),
        makeField("total_distance", 99_999_999),
        makeField("total_timer_time", 99_999_999),
      ]),
    ]);

    expect(
      buildFitActivitySummary(document, {
        locale: "en-US",
        timeZone: "Europe/Kyiv",
      }),
    ).toEqual({
      activityIdentity: "Running",
      activityIcon: "running",
      startTime: "Jan 1, 2024, 10:12 AM GMT+2",
      distance: "12.42 km",
      distanceMeters: 12423.45,
      duration: "48:32",
    });
  });

  it("combines non-generic sub sport with sport identity", () => {
    const document = makeDocument([
      makeSession([
        makeField("sport", 2),
        makeField("sub_sport", 2),
      ]),
    ]);

    expect(buildFitActivitySummary(document).activityIdentity).toBe(
      "Road cycling",
    );
    expect(buildFitActivitySummary(document).activityIcon).toBe("cycling");
  });

  it("does not derive missing session fields from other messages", () => {
    const document = makeDocument([
      makeRecord([
        makeField("sport", 1),
        makeField("start_time", fitTimestamp(Date.UTC(2024, 0, 1))),
        makeField("total_distance", 1_242_345),
        makeField("total_timer_time", 2_912_000),
      ]),
    ]);

    expect(buildFitActivitySummary(document)).toEqual({
      activityIdentity: null,
      activityIcon: null,
      startTime: null,
      distance: null,
      distanceMeters: null,
      duration: null,
    });
  });

  it("builds a scaled session total_distance edit from GPS meters", () => {
    const document = makeDocument([
      makeSession([
        makeField("total_distance", 1_242_345, 9),
      ]),
    ]);

    const edits = buildFitSessionDistanceEdit(document, 12_500.126);
    const editedSession = buildMessageSnapshotFromAppliedEdits(
      document.messages[0]!,
      edits,
    );

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "session-1",
        fieldId: "total_distance-field",
        fieldNumber: 9,
        fieldName: "total_distance",
        value: 1_250_013,
      }),
    ]);
    expect(buildFitActivitySummary(makeDocument([editedSession])).distanceMeters)
      .toBe(12_500.13);
  });

  it("builds session position edits from current GPS route geometry", () => {
    const document = makeDocument([
      makeSession([
        makeField("total_distance", 1_242_345, 9),
        makePositionField("unknown_field_3", 3),
        makePositionField("unknown_field_4", 4),
        makePositionField("unknown_field_29", 29),
        makePositionField("unknown_field_30", 30),
        makePositionField("unknown_field_31", 31),
        makePositionField("unknown_field_32", 32),
        makePositionField("unknown_field_38", 38),
        makePositionField("unknown_field_39", 39),
        makeField("unknown_field_34", 0, 34),
        makeField("unknown_field_35", 0, 35),
      ]),
    ]);

    const edits = buildFitSessionGpsSummaryEdits(
      document,
      [
        [
          { lat: 50.45, lon: 30.52 },
          { lat: 50.47, lon: 30.51 },
        ],
        [
          { lat: 50.46, lon: 30.54 },
          { lat: 50.44, lon: 30.53 },
        ],
      ],
      12_500,
    );

    expect(edits).toEqual([
      expect.objectContaining({ fieldNumber: 9, value: 1_250_000 }),
      expect.objectContaining({
        fieldNumber: 3,
        value: degreesToSemicircles(50.45),
      }),
      expect.objectContaining({
        fieldNumber: 4,
        value: degreesToSemicircles(30.52),
      }),
      expect.objectContaining({
        fieldNumber: 38,
        value: degreesToSemicircles(50.44),
      }),
      expect.objectContaining({
        fieldNumber: 39,
        value: degreesToSemicircles(30.53),
      }),
      expect.objectContaining({
        fieldNumber: 29,
        value: degreesToSemicircles(50.47),
      }),
      expect.objectContaining({
        fieldNumber: 30,
        value: degreesToSemicircles(30.54),
      }),
      expect.objectContaining({
        fieldNumber: 31,
        value: degreesToSemicircles(50.44),
      }),
      expect.objectContaining({
        fieldNumber: 32,
        value: degreesToSemicircles(30.51),
      }),
    ]);
    expect(edits.some((edit) => edit.fieldNumber === 34)).toBe(false);
    expect(edits.some((edit) => edit.fieldNumber === 35)).toBe(false);
  });

  it("builds lap position edits from GPS points inside each lap time range", () => {
    const document = makeDocument([
      makeLap("lap-1", 1, [
        makeField("start_time", 100, 2),
        makeField("timestamp", 109, 253),
        makePositionField("unknown_field_3", 3),
        makePositionField("unknown_field_4", 4),
        makePositionField("unknown_field_5", 5),
        makePositionField("unknown_field_6", 6),
        makePositionField("unknown_field_27", 27),
        makePositionField("unknown_field_28", 28),
        makePositionField("unknown_field_29", 29),
        makePositionField("unknown_field_30", 30),
      ]),
      makeLap("lap-2", 2, [
        makeField("start_time", 200, 2),
        makeField("timestamp", 220, 253),
        makePositionField("unknown_field_3", 3),
        makePositionField("unknown_field_4", 4),
        makePositionField("unknown_field_5", 5),
        makePositionField("unknown_field_6", 6),
        makePositionField("unknown_field_27", 27),
        makePositionField("unknown_field_28", 28),
        makePositionField("unknown_field_29", 29),
        makePositionField("unknown_field_30", 30),
      ]),
    ]);

    const edits = buildFitLapGpsSummaryEdits(document, [
      [
        { lat: 50.1, lon: 30.1, timestampSeconds: 100 },
        { lat: 50.3, lon: 30.4, timestampSeconds: 105 },
        { lat: 50.2, lon: 30.0, timestampSeconds: 109 },
      ],
      [
        { lat: 51.1, lon: 31.1, timestampSeconds: 200 },
        { lat: 51.2, lon: 31.2, timestampSeconds: 220 },
      ],
    ]);

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 3,
        value: degreesToSemicircles(50.1),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 4,
        value: degreesToSemicircles(30.1),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 5,
        value: degreesToSemicircles(50.2),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 6,
        value: degreesToSemicircles(30.0),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 27,
        value: degreesToSemicircles(50.3),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 28,
        value: degreesToSemicircles(30.4),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 29,
        value: degreesToSemicircles(50.1),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 30,
        value: degreesToSemicircles(30.0),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 3,
        value: degreesToSemicircles(51.1),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 4,
        value: degreesToSemicircles(31.1),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 5,
        value: degreesToSemicircles(51.2),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 6,
        value: degreesToSemicircles(31.2),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 27,
        value: degreesToSemicircles(51.2),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 28,
        value: degreesToSemicircles(31.2),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 29,
        value: degreesToSemicircles(51.1),
      }),
      expect.objectContaining({
        messageId: "lap-2",
        fieldNumber: 30,
        value: degreesToSemicircles(31.1),
      }),
    ]);
  });

  it("collapses an empty lap time range to one nearby GPS point", () => {
    const document = makeDocument([
      makeLap("lap-1", 1, [
        makeField("start_time", 300, 2),
        makeField("timestamp", 100, 253),
        makePositionField("unknown_field_3", 3),
        makePositionField("unknown_field_4", 4),
        makePositionField("unknown_field_5", 5),
        makePositionField("unknown_field_6", 6),
        makePositionField("unknown_field_27", 27),
        makePositionField("unknown_field_28", 28),
        makePositionField("unknown_field_29", 29),
        makePositionField("unknown_field_30", 30),
      ]),
      makeLap("lap-2", 2, [
        makeField("start_time", 360, 2),
        makeField("timestamp", 100, 253),
      ]),
    ]);

    const edits = buildFitLapGpsSummaryEdits(document, [
      [
        { lat: 50.0, lon: 30.0, timestampSeconds: 290 },
        { lat: 50.4, lon: 30.5, timestampSeconds: 365 },
      ],
    ]);

    expect(edits).toEqual([
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 3,
        value: degreesToSemicircles(50.4),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 4,
        value: degreesToSemicircles(30.5),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 5,
        value: degreesToSemicircles(50.4),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 6,
        value: degreesToSemicircles(30.5),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 27,
        value: degreesToSemicircles(50.4),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 28,
        value: degreesToSemicircles(30.5),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 29,
        value: degreesToSemicircles(50.4),
      }),
      expect.objectContaining({
        messageId: "lap-1",
        fieldNumber: 30,
        value: degreesToSemicircles(30.5),
      }),
    ]);
  });

  it("resolves lap data field labels from the current profile metadata", () => {
    const document = makeDocument([
      makeLap("lap-1", 1, [
        makePositionField("unknown_field_29", 29),
        makeField("unknown_field_110", 5997, 110),
      ]),
    ]);

    const [lap] = buildFitLapDataSummaries(document);

    expect(lap?.fields).toEqual([
      expect.objectContaining({
        number: 29,
        name: "swc_lat",
        value: "0.000000 deg",
      }),
      expect.objectContaining({
        number: 110,
        name: "enhanced_avg_speed",
        value: "6.00 m/s",
      }),
    ]);
  });

  it("shows only on-file lap fields while keeping invalid sentinel values", () => {
    const document = makeDocument([
      makeLap("lap-1", 1, [
        makeField("total_distance", null, 9),
        makePositionField("unknown_field_29", 29),
        {
          ...makeField("synthetic_field", 12, 200),
          added: true,
        },
      ]),
    ]);

    const [lap] = buildFitLapDataSummaries(document);

    expect(lap?.fieldCount).toBe(2);
    expect(lap?.populatedFieldCount).toBe(1);
    expect(lap?.fields).toEqual([
      expect.objectContaining({
        number: 9,
        name: "total_distance",
        value: "-",
        valid: false,
      }),
      expect.objectContaining({
        number: 29,
        name: "swc_lat",
        valid: true,
      }),
    ]);
  });

  it("builds session data from all on-file session fields", () => {
    const document = makeDocument([
      makeSession([
        makeField("timestamp", fitTimestamp(Date.UTC(2026, 4, 17, 7, 40)), 253),
        makeField("total_distance", 500_000, 9),
        makePositionField("unknown_field_38", 38),
        makeField("total_timer_time", null, 8),
        makeField("total_ascent", 146, 22),
        {
          ...makeField("synthetic_field", 12, 200),
          added: true,
        },
      ]),
    ]);

    const session = buildFitSessionDataSummary(document, {
      locale: "en-US",
      timeZone: "Europe/Kyiv",
    });

    expect(session?.fieldCount).toBe(5);
    expect(session?.populatedFieldCount).toBe(4);
    expect(session?.fields).toEqual([
      expect.objectContaining({
        number: 253,
        name: "timestamp",
        value: "May 17, 2026, 10:40 AM GMT+3",
        valid: true,
      }),
      expect.objectContaining({
        number: 9,
        name: "total_distance",
        value: "5.00 km",
        valid: true,
      }),
      expect.objectContaining({
        number: 38,
        name: "end_position_lat",
        value: "0.000000 deg",
        valid: true,
      }),
      expect.objectContaining({
        number: 8,
        name: "total_timer_time",
        value: "-",
        valid: false,
      }),
      expect.objectContaining({
        number: 22,
        name: "total_ascent",
        value: "146 m",
        valid: true,
      }),
    ]);
  });

  it("groups messages with summary-like types before dense records", () => {
    const document = makeDocument([
      makeRecord([
        makeField("timestamp", fitTimestamp(Date.UTC(2026, 4, 17, 7, 40)), 253),
        makePositionField("position_lat", 0),
      ]),
      makeSession([
        makeField("start_time", fitTimestamp(Date.UTC(2026, 4, 17, 7, 35)), 2),
      ]),
      makeLap("lap-1", 3, [
        makeField("start_time", fitTimestamp(Date.UTC(2026, 4, 17, 7, 36)), 2),
      ]),
    ]);

    const groups = buildFitMessageDataGroups(document, {
      locale: "en-US",
      timeZone: "Europe/Kyiv",
    });

    expect(groups.map((group) => group.messageName)).toEqual([
      "session",
      "lap",
      "record",
    ]);
    expect(groups[2]).toEqual(
      expect.objectContaining({
        label: "Record",
        count: 1,
        dense: true,
      }),
    );
    expect(groups[2]?.messages[0]).toEqual(
      expect.objectContaining({
        dateLabel: "May 17, 2026",
        timeLabel: "10:40:00 AM",
      }),
    );
  });
});

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

function fitTimestamp(unixMs: number): number {
  return Math.floor((unixMs - FIT_EPOCH_MS) / 1000);
}

function makeDocument(messages: readonly FitDataRecord[]): Pick<FitDocument, "messages"> {
  return { messages: [...messages] };
}

function makeSession(fields: readonly FitDataField[]): FitDataRecord {
  return makeMessage(18, "session", fields);
}

function makeLap(
  id: string,
  order: number,
  fields: readonly FitDataField[],
): FitDataRecord {
  return makeMessage(19, "lap", fields, id, order);
}

function makeRecord(fields: readonly FitDataField[]): FitDataRecord {
  return makeMessage(20, "record", fields);
}

function makeMessage(
  globalMessageNumber: number,
  messageName: string,
  fields: readonly FitDataField[],
  id = `${messageName}-1`,
  order = 1,
): FitDataRecord {
  return {
    kind: "data",
    id,
    order,
    recordHeaderKind: "normal",
    recordHeader: 0,
    localMessageType: 0,
    globalMessageNumber,
    messageName,
    definitionId: `${messageName}-definition`,
    fields: [...fields],
    span: { start: 0, end: 0 },
  };
}

function makeField(name: string, value: FitValue, number = 0): FitDataField {
  return {
    id: `${name}-field`,
    number,
    name,
    baseType: 0,
    baseTypeName: "uint32",
    size: 4,
    value,
    rawValue: value,
    known: true,
    profile: {
      known: true,
      messageNumber: 18,
      messageName: "session",
      number,
      name,
      baseType: "uint32",
      size: 4,
      values: [],
    },
    span: { start: 0, end: 0 },
    developer: false,
  };
}

function makePositionField(name: string, number: number): FitDataField {
  return {
    ...makeField(name, 0, number),
    baseType: 0x85,
    baseTypeName: "sint32",
    units: "semicircles",
    profile: {
      known: false,
      messageNumber: 18,
      messageName: "session",
      number,
      name,
      baseType: "sint32",
      size: 4,
      values: [],
      units: "semicircles",
    },
  };
}

const SEMICIRCLES_PER_DEGREE = 2147483648 / 180;

function degreesToSemicircles(degrees: number): number {
  return Math.round(degrees * SEMICIRCLES_PER_DEGREE);
}

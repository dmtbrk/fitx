import { describe, expect, it } from "vitest";
import type {
  FitGpsRepairRun,
  FitGpsRoutePoint,
} from "./gpsRepair";
import type { FitDataRecord } from "../fit";
import {
  buildGpsEditRoute,
  buildGpsEditRouteDragPreview,
} from "./gpsEditRoute";

function makeRecord(id: string, order: number): FitDataRecord {
  return {
    id,
    order,
    messageName: "record",
    globalMessageNumber: 20,
    localMessageType: 0,
    fields: [],
    developerFields: [],
  } as unknown as FitDataRecord;
}

function makeKnownPoint(
  id: string,
  recordOrder: number,
  lat: number,
  lon: number,
): FitGpsRoutePoint {
  return {
    recordId: id,
    recordOrder,
    timestampSeconds: null,
    timerTimeSeconds: null,
    lat,
    lon,
  };
}

describe("buildGpsEditRoute", () => {
  it("connects known points through bounded gaps with straight-line gap points", () => {
    const missing = makeRecord("missing", 2);
    const run: FitGpsRepairRun = {
      before: {
        record: makeRecord("before", 1),
        timestampSeconds: 10,
        timerTimeSeconds: 10,
        latitudeDegrees: 50,
        longitudeDegrees: 30,
      },
      after: {
        record: makeRecord("after", 3),
        timestampSeconds: 30,
        timerTimeSeconds: 30,
        latitudeDegrees: 50.002,
        longitudeDegrees: 30.004,
      },
      missingRecords: [
        {
          record: missing,
          timestampSeconds: 20,
          timerTimeSeconds: 20,
          missingLatitude: true,
          missingLongitude: true,
        },
      ],
    };

    const route = buildGpsEditRoute({
      routeSegments: [
        [makeKnownPoint("before", 1, 50, 30)],
        [makeKnownPoint("after", 3, 50.002, 30.004)],
      ],
      runs: [run],
    });

    expect(route.points[0]).toEqual(
      expect.objectContaining({ recordId: "before", kind: "known" }),
    );
    expect(route.points[1]).toEqual(
      expect.objectContaining({ recordId: "missing", kind: "gap" }),
    );
    expect(route.points[1]?.lat).toBeCloseTo(50.001);
    expect(route.points[1]?.lon).toBeCloseTo(30.002);
    expect(route.points[2]).toEqual(
      expect.objectContaining({ recordId: "after", kind: "known" }),
    );
    expect(route.segments).toHaveLength(1);
    expect(route.segments[0]?.map((point) => point.recordId)).toEqual([
      "before",
      "missing",
      "after",
    ]);
  });

  it("builds drag preview geometry by moving exactly one route record", () => {
    const route = buildGpsEditRoute({
      routeSegments: [
        [
          makeKnownPoint("before", 1, 50, 30),
          makeKnownPoint("middle", 2, 50.001, 30.001),
          makeKnownPoint("after", 3, 50.002, 30.002),
        ],
      ],
      runs: [],
    });
    const movedPoint = { lat: 50.01, lon: 30.02 };

    const preview = buildGpsEditRouteDragPreview(
      route,
      "middle",
      movedPoint,
    );

    expect(preview?.points.map((point) => point.recordId)).toEqual([
      "before",
      "middle",
      "after",
    ]);
    expect(preview?.points[1]).toEqual(
      expect.objectContaining({
        recordId: "middle",
        lat: movedPoint.lat,
        lon: movedPoint.lon,
      }),
    );
    expect(preview?.segments[0]?.[1]).toBe(preview?.points[1]);
  });
});

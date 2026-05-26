import { describe, expect, it } from "vitest";
import type { FitGpsFixedRepair } from "../editor";
import type { FitDataRecord } from "../fit";
import { buildFixedRouteDragPreview } from "./gpsRepairMapPreview";

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

describe("buildFixedRouteDragPreview", () => {
  it("uses the moved point for both the preview route and point source", () => {
    const repair: FitGpsFixedRepair = {
      key: "repair:1",
      run: {
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
          latitudeDegrees: 50.003,
          longitudeDegrees: 30.003,
        },
        missingRecords: [
          {
            record: makeRecord("missing", 2),
            timestampSeconds: 20,
            timerTimeSeconds: 20,
            missingLatitude: true,
            missingLongitude: true,
          },
        ],
      },
      beforeTimestampSeconds: 10,
      afterTimestampSeconds: 30,
      beforeTimerTimeSeconds: 10,
      afterTimerTimeSeconds: 30,
      missingRecordCount: 1,
      gapDistanceMeters: null,
      fixedDistanceMeters: null,
      routePoints: [
        { lat: 50, lon: 30 },
        { lat: 50.001, lon: 30.001 },
        { lat: 50.003, lon: 30.003 },
      ],
      editablePoints: [{ lat: 50.001, lon: 30.001 }],
    };
    const movedPoint = { lat: 50.002, lon: 30.004 };

    const preview = buildFixedRouteDragPreview(
      [repair],
      repair.key,
      0,
      movedPoint,
    );

    expect(preview).not.toBeNull();
    expect(preview?.segments).toEqual([
      [
        { lat: 50, lon: 30 },
        movedPoint,
        { lat: 50.003, lon: 30.003 },
      ],
    ]);
    expect(preview?.editablePoints).toEqual([
      {
        repairKey: repair.key,
        pointIndex: 0,
        point: movedPoint,
      },
    ]);
  });
});

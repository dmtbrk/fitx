import type {
  FitGpsRepairRun,
  FitGpsRoutePoint,
} from "./gpsRepair";
import {
  collectGpsRepairRuns,
  collectGpsRouteSegments,
} from "./gpsRepair";
import type { FitDocument } from "../fit";
import type { FitRoutePoint } from "./routing";

export type FitGpsEditRoutePointKind = "known" | "gap";

export interface FitGpsEditRoutePoint extends FitRoutePoint {
  readonly id: string;
  readonly recordId: string;
  readonly recordOrder: number;
  readonly kind: FitGpsEditRoutePointKind;
}

export interface FitGpsEditRoute {
  readonly points: readonly FitGpsEditRoutePoint[];
  readonly segments: readonly (readonly FitGpsEditRoutePoint[])[];
}

export interface FitGpsEditRouteDragPreview {
  readonly points: readonly FitGpsEditRoutePoint[];
  readonly segments: readonly (readonly FitGpsEditRoutePoint[])[];
}

export type FitGpsMapView = FitGpsEditRoute;

export function buildGpsMapView(
  document: Pick<FitDocument, "messages">,
): FitGpsMapView {
  return buildGpsEditRoute({
    routeSegments: collectGpsRouteSegments(document),
    runs: collectGpsRepairRuns(document),
  });
}

export function buildGpsEditRoute({
  routeSegments,
  runs,
}: {
  readonly routeSegments: readonly (readonly FitGpsRoutePoint[])[];
  readonly runs: readonly FitGpsRepairRun[];
}): FitGpsEditRoute {
  const pointsByRecordId = new Map<string, FitGpsEditRoutePoint>();

  for (const point of routeSegments.flat()) {
    pointsByRecordId.set(point.recordId, {
      id: point.recordId,
      recordId: point.recordId,
      recordOrder: point.recordOrder,
      kind: "known",
      lat: point.lat,
      lon: point.lon,
    });
  }

  for (const run of runs) {
    const orderedMissingRecords = [...run.missingRecords].sort(
      (left, right) => left.record.order - right.record.order,
    );
    if (orderedMissingRecords.length === 0 || !run.before || !run.after) {
      continue;
    }

    for (let index = 0; index < orderedMissingRecords.length; index += 1) {
      const missingRecord = orderedMissingRecords[index];
      const point = interpolateRoutePoint(
        {
          lat: run.before.latitudeDegrees,
          lon: run.before.longitudeDegrees,
        },
        {
          lat: run.after.latitudeDegrees,
          lon: run.after.longitudeDegrees,
        },
        (index + 1) / (orderedMissingRecords.length + 1),
      );
      pointsByRecordId.set(missingRecord.record.id, {
        id: missingRecord.record.id,
        recordId: missingRecord.record.id,
        recordOrder: missingRecord.record.order,
        kind: "gap",
        lat: point.lat,
        lon: point.lon,
      });
    }
  }

  const points = [...pointsByRecordId.values()].sort(
    (left, right) => left.recordOrder - right.recordOrder,
  );
  return {
    points,
    segments: points.length >= 2 ? [points] : [],
  };
}

export function buildGpsEditRouteDragPreview(
  route: FitGpsEditRoute,
  recordId: string,
  point: FitRoutePoint,
): FitGpsEditRouteDragPreview | null {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
    return null;
  }

  let found = false;
  const points = route.points.map((currentPoint) => {
    if (currentPoint.recordId !== recordId) {
      return currentPoint;
    }

    found = true;
    return {
      ...currentPoint,
      lat: point.lat,
      lon: point.lon,
    };
  });
  if (!found) {
    return null;
  }

  return {
    points,
    segments: points.length >= 2 ? [points] : [],
  };
}

function interpolateRoutePoint(
  start: FitRoutePoint,
  end: FitRoutePoint,
  fraction: number,
): FitRoutePoint {
  return {
    lat: start.lat + (end.lat - start.lat) * fraction,
    lon: start.lon + (end.lon - start.lon) * fraction,
  };
}

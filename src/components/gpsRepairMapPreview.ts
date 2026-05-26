import type {
  FitGpsFixedRepair,
  FitRoutePoint,
} from "../editor";

export interface FixedRouteDragPreview {
  readonly segments: readonly (readonly FitRoutePoint[])[];
  readonly editablePoints: readonly {
    readonly repairKey: string;
    readonly pointIndex: number;
    readonly point: FitRoutePoint;
  }[];
}

export function buildFixedRouteDragPreview(
  fixedRepairs: readonly FitGpsFixedRepair[],
  repairKey: string,
  pointIndex: number,
  point: FitRoutePoint,
): FixedRouteDragPreview | null {
  const repair = fixedRepairs.find(
    (currentRepair) => currentRepair.key === repairKey,
  );
  if (
    !repair ||
    pointIndex < 0 ||
    pointIndex >= repair.editablePoints.length ||
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lon)
  ) {
    return null;
  }

  const editablePoints = repair.editablePoints.map((currentPoint, index) =>
    index === pointIndex ? point : currentPoint,
  );
  const routePoints = buildEditableFixedRepairRoutePoints(
    repair,
    editablePoints,
  );

  return {
    segments: fixedRepairs.map((currentRepair) =>
      currentRepair.key === repair.key
        ? routePoints
        : currentRepair.routePoints,
    ),
    editablePoints: editablePoints.map((editablePoint, editablePointIndex) => ({
      repairKey: repair.key,
      pointIndex: editablePointIndex,
      point: editablePoint,
    })),
  };
}

export function buildEditableFixedRepairRoutePoints(
  repair: FitGpsFixedRepair,
  editablePoints: readonly FitRoutePoint[],
): FitRoutePoint[] {
  const firstRoutePoint = repair.routePoints[0];
  const lastRoutePoint = repair.routePoints.at(-1);
  return [
    {
      lat: repair.run.before?.latitudeDegrees ?? firstRoutePoint?.lat ?? 0,
      lon: repair.run.before?.longitudeDegrees ?? firstRoutePoint?.lon ?? 0,
    },
    ...editablePoints,
    {
      lat: repair.run.after?.latitudeDegrees ?? lastRoutePoint?.lat ?? 0,
      lon: repair.run.after?.longitudeDegrees ?? lastRoutePoint?.lon ?? 0,
    },
  ];
}

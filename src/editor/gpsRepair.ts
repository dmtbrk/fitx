import type { FitDataRecord, FitField, FitFieldValueEdit, FitDocument } from "../fit";
import type { FitRoutePoint, FitRouteResponse } from "./routing";

export interface FitGpsRepairRunAnchor {
  readonly record: FitDataRecord;
  readonly timestampSeconds: number;
  readonly latitudeDegrees: number;
  readonly longitudeDegrees: number;
}

export interface FitGpsRepairRunMissingRecord {
  readonly record: FitDataRecord;
  readonly timestampSeconds: number;
  readonly missingLatitude: boolean;
  readonly missingLongitude: boolean;
}

export interface FitGpsRepairRun {
  readonly before: FitGpsRepairRunAnchor;
  readonly after: FitGpsRepairRunAnchor;
  readonly missingRecords: readonly FitGpsRepairRunMissingRecord[];
}

const GPS_LAT_FIELD_NUMBER = 0;
const GPS_LON_FIELD_NUMBER = 1;
const GPS_TIMESTAMP_FIELD_NUMBER = 253;
const GPS_POSITION_BASE_TYPE = 0x85;
const GPS_POSITION_SIZE = 4;
const GPS_POSITION_UNITS = "semicircles";
const SEMICIRCLES_PER_DEGREE = 2147483648 / 180;

export function degreesToSemicircles(degrees: number): number {
  if (!Number.isFinite(degrees)) {
    throw new Error("GPS degrees must be a finite number.");
  }

  return Math.round(degrees * SEMICIRCLES_PER_DEGREE);
}

export function semicirclesToDegrees(semicircles: number): number {
  if (!Number.isFinite(semicircles)) {
    throw new Error("GPS semicircles must be a finite number.");
  }

  return semicircles / SEMICIRCLES_PER_DEGREE;
}

export function collectGpsRepairRuns(document: FitDocument): FitGpsRepairRun[] {
  const runs: FitGpsRepairRun[] = [];
  let before: FitGpsRepairRunAnchor | null = null;
  let missingRecords: FitGpsRepairRunMissingRecord[] = [];

  for (const record of document.messages) {
    if (record.messageName !== "record") {
      continue;
    }

    const timestampSeconds = readGpsTimestampSeconds(record);
    const position = readGpsPosition(record);

    if (timestampSeconds === null) {
      before = null;
      missingRecords = [];
      continue;
    }

    if (position) {
      if (before && missingRecords.length > 0) {
        runs.push({
          before,
          after: {
            record,
            timestampSeconds,
            latitudeDegrees: position.latitudeDegrees,
            longitudeDegrees: position.longitudeDegrees,
          },
          missingRecords,
        });
      }

      before = {
        record,
        timestampSeconds,
        latitudeDegrees: position.latitudeDegrees,
        longitudeDegrees: position.longitudeDegrees,
      };
      missingRecords = [];
      continue;
    }

    if (before) {
      missingRecords.push({
        record,
        timestampSeconds,
        missingLatitude: !hasFiniteGpsField(record, GPS_LAT_FIELD_NUMBER, "position_lat"),
        missingLongitude: !hasFiniteGpsField(record, GPS_LON_FIELD_NUMBER, "position_long"),
      });
    }
  }

  return runs;
}

export function collectGpsRouteSegments(
  document: Pick<FitDocument, "messages">,
): FitRoutePoint[][] {
  const segments: FitRoutePoint[][] = [];
  let currentSegment: FitRoutePoint[] = [];

  for (const record of document.messages) {
    if (record.messageName !== "record") {
      continue;
    }

    const position = readGpsPosition(record);
    if (!position) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      continue;
    }

    currentSegment.push({
      lat: position.latitudeDegrees,
      lon: position.longitudeDegrees,
    });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

export function buildGpsRepairPreviewEdits(
  run: FitGpsRepairRun,
  route: FitRouteResponse,
): FitFieldValueEdit[] {
  const routePoints = route.points;
  if (routePoints.length === 0 || run.missingRecords.length === 0) {
    return [];
  }

  const orderedMissingRecords = [...run.missingRecords].sort((left, right) => {
    if (left.timestampSeconds !== right.timestampSeconds) {
      return left.timestampSeconds - right.timestampSeconds;
    }

    return left.record.order - right.record.order;
  });

  const routeSamplePoints = orderedMissingRecords.map((missingRecord, index) =>
    sampleRoutePoint(routePoints, resolveRouteFraction(run, orderedMissingRecords, index, missingRecord.timestampSeconds)),
  );

  const edits: FitFieldValueEdit[] = [];
  for (let index = 0; index < orderedMissingRecords.length; index += 1) {
    const missingRecord = orderedMissingRecords[index];
    const routePoint = routeSamplePoints[index];

    if (missingRecord.missingLatitude) {
      edits.push(buildGpsPositionEdit(missingRecord.record, GPS_LAT_FIELD_NUMBER, "position_lat", routePoint.lat));
    }

    if (missingRecord.missingLongitude) {
      edits.push(buildGpsPositionEdit(missingRecord.record, GPS_LON_FIELD_NUMBER, "position_long", routePoint.lon));
    }
  }

  return edits;
}

function readGpsTimestampSeconds(record: FitDataRecord): number | null {
  const field = findField(record, GPS_TIMESTAMP_FIELD_NUMBER, "timestamp");
  return field ? coerceNumericValue(field.value) : null;
}

function readGpsPosition(
  record: FitDataRecord,
): { readonly latitudeDegrees: number; readonly longitudeDegrees: number } | null {
  const latitude = findField(record, GPS_LAT_FIELD_NUMBER, "position_lat");
  const longitude = findField(record, GPS_LON_FIELD_NUMBER, "position_long");
  const latitudeDegrees = latitude ? readGpsSemicircleDegrees(latitude) : null;
  const longitudeDegrees = longitude ? readGpsSemicircleDegrees(longitude) : null;

  if (latitudeDegrees === null || longitudeDegrees === null) {
    return null;
  }

  return { latitudeDegrees, longitudeDegrees };
}

function readGpsSemicircleDegrees(field: FitField): number | null {
  const numericValue = coerceNumericValue(field.value);
  return numericValue === null ? null : semicirclesToDegrees(numericValue);
}

function hasFiniteGpsField(
  record: FitDataRecord,
  fieldNumber: number,
  fieldName: string,
): boolean {
  const field = findField(record, fieldNumber, fieldName);
  return field !== undefined && coerceNumericValue(field.value) !== null;
}

function findField(
  record: FitDataRecord,
  fieldNumber: number,
  fieldName: string,
): FitField | undefined {
  return record.fields.find(
    (field) => field.number === fieldNumber || field.name === fieldName,
  );
}

function coerceNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : null;
  }

  return null;
}

function resolveRouteFraction(
  run: FitGpsRepairRun,
  orderedMissingRecords: readonly FitGpsRepairRunMissingRecord[],
  index: number,
  timestampSeconds: number,
): number {
  const totalSeconds = run.after.timestampSeconds - run.before.timestampSeconds;
  if (totalSeconds > 0) {
    return clamp01((timestampSeconds - run.before.timestampSeconds) / totalSeconds);
  }

  return (index + 1) / (orderedMissingRecords.length + 1);
}

function sampleRoutePoint(
  points: readonly FitRoutePoint[],
  fraction: number,
): FitRoutePoint {
  if (points.length === 1) {
    return points[0];
  }

  const boundedFraction = clamp01(fraction);
  const totalDistance = points
    .slice(1)
    .reduce((total, point, index) => total + distanceBetween(points[index], point), 0);

  if (totalDistance === 0) {
    return points[0];
  }

  const targetDistance = boundedFraction * totalDistance;
  let traversedDistance = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segmentDistance = distanceBetween(start, end);
    if (segmentDistance === 0) {
      continue;
    }

    const nextDistance = traversedDistance + segmentDistance;
    if (nextDistance >= targetDistance) {
      const segmentFraction = (targetDistance - traversedDistance) / segmentDistance;
      return interpolateRoutePoint(start, end, segmentFraction);
    }

    traversedDistance = nextDistance;
  }

  return points[points.length - 1];
}

function interpolateRoutePoint(
  start: FitRoutePoint,
  end: FitRoutePoint,
  fraction: number,
): FitRoutePoint {
  const boundedFraction = clamp01(fraction);
  return {
    lat: start.lat + (end.lat - start.lat) * boundedFraction,
    lon: start.lon + (end.lon - start.lon) * boundedFraction,
  };
}

function distanceBetween(start: FitRoutePoint, end: FitRoutePoint): number {
  const radius = 6371000;
  const startLat = toRadians(start.lat);
  const endLat = toRadians(end.lat);
  const deltaLat = toRadians(end.lat - start.lat);
  const deltaLon = toRadians(end.lon - start.lon);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const a =
    sinLat * sinLat +
    Math.cos(startLat) * Math.cos(endLat) * sinLon * sinLon;

  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function buildGpsPositionEdit(
  record: FitDataRecord,
  fieldNumber: number,
  fieldName: string,
  degrees: number,
): FitFieldValueEdit {
  const field = findField(record, fieldNumber, fieldName);
  const value = degreesToSemicircles(degrees);

  if (field) {
    return {
      messageId: record.id,
      fieldId: field.id,
      fieldNumber,
      value,
    };
  }

  return {
    messageId: record.id,
    fieldId: `gps:${record.id}:${fieldName}`,
    fieldNumber,
    fieldName,
    baseType: GPS_POSITION_BASE_TYPE,
    baseTypeName: "sint32",
    size: GPS_POSITION_SIZE,
    units: GPS_POSITION_UNITS,
    added: true,
    value,
  };
}

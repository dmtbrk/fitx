import type { FitDataRecord, FitField, FitFieldValueEdit, FitDocument } from "../fit";
import type { FitRoutePoint, FitRouteResponse } from "./routing";

export interface FitGpsRepairRunAnchor {
  readonly record: FitDataRecord;
  readonly timestampSeconds: number;
  readonly timerTimeSeconds: number | null;
  readonly latitudeDegrees: number;
  readonly longitudeDegrees: number;
}

export interface FitGpsRepairRunMissingRecord {
  readonly record: FitDataRecord;
  readonly timestampSeconds: number | null;
  readonly timerTimeSeconds: number | null;
  readonly missingLatitude: boolean;
  readonly missingLongitude: boolean;
}

export interface FitGpsRepairRun {
  readonly before: FitGpsRepairRunAnchor | null;
  readonly after: FitGpsRepairRunAnchor | null;
  readonly missingRecords: readonly FitGpsRepairRunMissingRecord[];
}

export interface FitGpsRoutePoint extends FitRoutePoint {
  readonly recordId: string;
  readonly recordOrder: number;
  readonly timestampSeconds: number | null;
  readonly timerTimeSeconds: number | null;
}

export interface FitGpsFixedRepair {
  readonly key: string;
  readonly run: FitGpsRepairRun;
  readonly beforeTimestampSeconds: number;
  readonly afterTimestampSeconds: number;
  readonly beforeTimerTimeSeconds: number | null;
  readonly afterTimerTimeSeconds: number | null;
  readonly missingRecordCount: number;
  readonly gapDistanceMeters: number | null;
  readonly fixedDistanceMeters: number | null;
  readonly routePoints: readonly FitRoutePoint[];
  readonly editablePoints: readonly FitRoutePoint[];
}

export interface FitGpsRecordSpeedSummary {
  readonly gpsSpeedRecords: number;
  readonly existingSpeedFields: number;
  readonly updatedSpeedFields: number;
  readonly clearedSpeedFields: number;
  readonly addedEnhancedSpeedFields: number;
}

export type FitGpsRepairAnchorPlacement = "start" | "end";

const GPS_LAT_FIELD_NUMBER = 0;
const GPS_LON_FIELD_NUMBER = 1;
const GPS_TIMESTAMP_FIELD_NUMBER = 253;
const RECORD_SPEED_FIELD_NUMBER = 6;
const RECORD_ENHANCED_SPEED_FIELD_NUMBER = 73;
const RECORD_SPEED_SCALE = 1000;
const TIMER_EVENT_MESSAGE_NUMBER = 21;
const TIMER_EVENT_FIELD_NUMBER = 0;
const TIMER_EVENT_TYPE_FIELD_NUMBER = 1;
const TIMER_EVENT_VALUE = 0;
const TIMER_EVENT_TYPE_START = 0;
const TIMER_EVENT_TYPE_STOP = 1;
const TIMER_EVENT_TYPE_STOP_ALL = 4;
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

export function collectGpsRepairRuns(
  document: Pick<FitDocument, "messages">,
): FitGpsRepairRun[] {
  const runs: FitGpsRepairRun[] = [];
  let before: FitGpsRepairRunAnchor | null = null;
  let missingRecords: FitGpsRepairRunMissingRecord[] = [];
  let timerState = createTimerState();

  for (const record of document.messages) {
    timerState = updateTimerState(timerState, record);

    if (record.messageName !== "record") {
      continue;
    }

    const timestampSeconds = readGpsTimestampSeconds(record);
    const timerTimeSeconds = readTimerTimeSeconds(timerState, timestampSeconds);
    const position = readGpsPosition(record);

    if (position) {
      const after =
        timestampSeconds === null
          ? null
          : {
              record,
              timestampSeconds,
              timerTimeSeconds,
              latitudeDegrees: position.latitudeDegrees,
              longitudeDegrees: position.longitudeDegrees,
            };
      if (missingRecords.length > 0) {
        runs.push({
          before,
          after,
          missingRecords,
        });
      }

      before = after;
      missingRecords = [];
      continue;
    }

    missingRecords.push({
      record,
      timestampSeconds,
      timerTimeSeconds,
      missingLatitude: !hasFiniteGpsField(record, GPS_LAT_FIELD_NUMBER, "position_lat"),
      missingLongitude: !hasFiniteGpsField(record, GPS_LON_FIELD_NUMBER, "position_long"),
    });
  }

  if (missingRecords.length > 0) {
    runs.push({
      before,
      after: null,
      missingRecords,
    });
  }

  return runs;
}

export function collectGpsRouteSegments(
  document: Pick<FitDocument, "messages">,
): FitGpsRoutePoint[][] {
  const segments: FitGpsRoutePoint[][] = [];
  let currentSegment: FitGpsRoutePoint[] = [];
  let timerState = createTimerState();

  for (const record of document.messages) {
    timerState = updateTimerState(timerState, record);

    if (record.messageName !== "record") {
      continue;
    }

    const timestampSeconds = readGpsTimestampSeconds(record);
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
      recordId: record.id,
      recordOrder: record.order,
      timestampSeconds,
      timerTimeSeconds: readTimerTimeSeconds(timerState, timestampSeconds),
    });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

export function buildGpsEraseRangeEdits(
  document: Pick<FitDocument, "messages">,
  startRecordId: string,
  endRecordId: string,
): FitFieldValueEdit[] {
  const startRecord = document.messages.find(
    (record) => record.id === startRecordId && record.messageName === "record",
  );
  const endRecord = document.messages.find(
    (record) => record.id === endRecordId && record.messageName === "record",
  );
  if (!startRecord || !endRecord) {
    return [];
  }

  const startOrder = Math.min(startRecord.order, endRecord.order);
  const endOrder = Math.max(startRecord.order, endRecord.order);
  const edits: FitFieldValueEdit[] = [];
  for (const record of document.messages) {
    if (
      record.messageName !== "record" ||
      record.order < startOrder ||
      record.order > endOrder ||
      !readGpsPosition(record)
    ) {
      continue;
    }

    const latitude = findField(record, GPS_LAT_FIELD_NUMBER, "position_lat");
    const longitude = findField(record, GPS_LON_FIELD_NUMBER, "position_long");
    if (latitude) {
      edits.push(buildGpsPositionEraseEdit(record, latitude));
    }
    if (longitude) {
      edits.push(buildGpsPositionEraseEdit(record, longitude));
    }
  }

  return edits;
}

export function buildGpsRepairAnchorPlacementEdits(
  run: FitGpsRepairRun,
  placement: FitGpsRepairAnchorPlacement,
  point: FitRoutePoint,
): FitFieldValueEdit[] {
  if (!isFiniteRoutePoint(point)) {
    return [];
  }

  const record =
    placement === "end"
      ? run.missingRecords.at(-1)
      : run.missingRecords[0];
  if (!record) {
    return [];
  }

  return [
    buildGpsPositionEdit(
      record.record,
      GPS_LAT_FIELD_NUMBER,
      "position_lat",
      point.lat,
    ),
    buildGpsPositionEdit(
      record.record,
      GPS_LON_FIELD_NUMBER,
      "position_long",
      point.lon,
    ),
  ];
}

export function buildGpsRecordPositionEdits(
  document: Pick<FitDocument, "messages">,
  recordId: string,
  point: FitRoutePoint,
): FitFieldValueEdit[] {
  if (!isFiniteRoutePoint(point)) {
    return [];
  }

  const record = document.messages.find(
    (message) => message.id === recordId && message.messageName === "record",
  );
  if (!record) {
    return [];
  }

  return [
    buildGpsPositionEdit(
      record,
      GPS_LAT_FIELD_NUMBER,
      "position_lat",
      point.lat,
    ),
    buildGpsPositionEdit(
      record,
      GPS_LON_FIELD_NUMBER,
      "position_long",
      point.lon,
    ),
  ];
}

export function buildGpsRepairPreviewEdits(
  run: FitGpsRepairRun,
  route: FitRouteResponse,
): FitFieldValueEdit[] {
  return buildGpsRepairEditsFromPoints(
    run,
    sampleGpsRepairEditablePoints(run, route.points),
  );
}

export function buildGpsRepairEditsFromPoints(
  run: FitGpsRepairRun,
  points: readonly FitRoutePoint[],
): FitFieldValueEdit[] {
  if (!run.before || !run.after) {
    return [];
  }

  const orderedMissingRecords = getOrderedMissingRecords(run);
  if (
    points.length === 0 ||
    orderedMissingRecords.length === 0 ||
    points.length !== orderedMissingRecords.length
  ) {
    return [];
  }

  const edits: FitFieldValueEdit[] = [];
  for (let index = 0; index < orderedMissingRecords.length; index += 1) {
    const missingRecord = orderedMissingRecords[index];
    const routePoint = points[index];
    if (!routePoint) {
      continue;
    }

    if (missingRecord.missingLatitude) {
      edits.push(buildGpsPositionEdit(missingRecord.record, GPS_LAT_FIELD_NUMBER, "position_lat", routePoint.lat));
    }

    if (missingRecord.missingLongitude) {
      edits.push(buildGpsPositionEdit(missingRecord.record, GPS_LON_FIELD_NUMBER, "position_long", routePoint.lon));
    }
  }

  return edits;
}

export function buildGpsFixedRepair(
  run: FitGpsRepairRun,
  route: FitRouteResponse,
): FitGpsFixedRepair {
  if (!run.before || !run.after) {
    throw new Error("GPS repair requires bounded before and after anchors.");
  }

  const editablePoints = sampleGpsRepairEditablePoints(run, route.points);
  return {
    key: makeGpsRepairRunKey(run),
    run,
    beforeTimestampSeconds: run.before.timestampSeconds,
    afterTimestampSeconds: run.after.timestampSeconds,
    beforeTimerTimeSeconds: run.before.timerTimeSeconds,
    afterTimerTimeSeconds: run.after.timerTimeSeconds,
    missingRecordCount: run.missingRecords.length,
    gapDistanceMeters: calculateGpsRepairRunDistanceMeters(run),
    fixedDistanceMeters: resolveRouteDistanceMeters(route),
    routePoints: route.points,
    editablePoints,
  };
}

export function buildGpsFilledRepair(run: FitGpsRepairRun): FitGpsFixedRepair {
  if (!run.before || !run.after) {
    throw new Error("GPS fill requires bounded before and after anchors.");
  }

  const anchors = [
    { lat: run.before.latitudeDegrees, lon: run.before.longitudeDegrees },
    { lat: run.after.latitudeDegrees, lon: run.after.longitudeDegrees },
  ];
  const editablePoints = sampleGpsRepairEditablePoints(run, anchors);
  const routePoints = [anchors[0], ...editablePoints, anchors[1]];

  return {
    key: makeGpsRepairRunKey(run),
    run,
    beforeTimestampSeconds: run.before.timestampSeconds,
    afterTimestampSeconds: run.after.timestampSeconds,
    beforeTimerTimeSeconds: run.before.timerTimeSeconds,
    afterTimerTimeSeconds: run.after.timerTimeSeconds,
    missingRecordCount: run.missingRecords.length,
    gapDistanceMeters: calculateGpsRepairRunDistanceMeters(run),
    fixedDistanceMeters: calculateRouteDistanceMeters(routePoints),
    routePoints,
    editablePoints,
  };
}

export function updateGpsFixedRepairEditablePoint(
  repair: FitGpsFixedRepair,
  pointIndex: number,
  point: FitRoutePoint,
): FitGpsFixedRepair {
  if (
    pointIndex < 0 ||
    pointIndex >= repair.editablePoints.length ||
    !isFiniteRoutePoint(point)
  ) {
    return repair;
  }

  const editablePoints = repair.editablePoints.map((currentPoint, index) =>
    index === pointIndex ? point : currentPoint,
  );
  const routePoints = [
    {
      lat: repair.run.before?.latitudeDegrees ?? repair.routePoints[0]?.lat ?? point.lat,
      lon: repair.run.before?.longitudeDegrees ?? repair.routePoints[0]?.lon ?? point.lon,
    },
    ...editablePoints,
    {
      lat: repair.run.after?.latitudeDegrees ?? repair.routePoints.at(-1)?.lat ?? point.lat,
      lon: repair.run.after?.longitudeDegrees ?? repair.routePoints.at(-1)?.lon ?? point.lon,
    },
  ];

  return {
    ...repair,
    fixedDistanceMeters: calculateRouteDistanceMeters(routePoints),
    routePoints,
    editablePoints,
  };
}

export function makeGpsRepairRunKey(run: FitGpsRepairRun): string {
  return [
    run.before?.record.id ?? "open-start",
    run.after?.record.id ?? "open-end",
    ...run.missingRecords.map((missingRecord) => missingRecord.record.id),
  ].join(":");
}

export function calculateGpsRepairRunDistanceMeters(
  run: FitGpsRepairRun,
): number | null {
  if (!run.before || !run.after) {
    return null;
  }

  return calculateRouteDistanceMeters([
    { lat: run.before.latitudeDegrees, lon: run.before.longitudeDegrees },
    { lat: run.after.latitudeDegrees, lon: run.after.longitudeDegrees },
  ]);
}

export function calculateRouteDistanceMeters(
  points: readonly FitRoutePoint[],
): number | null {
  if (points.length < 2) {
    return null;
  }

  const distanceMeters = points
    .slice(1)
    .reduce((total, point, index) => total + distanceBetween(points[index], point), 0);

  return Number.isFinite(distanceMeters) ? distanceMeters : null;
}

export function calculateRouteSegmentsDistanceMeters(
  segments: readonly (readonly FitRoutePoint[])[],
): number | null {
  let totalDistanceMeters = 0;
  let hasMeasuredSegment = false;

  for (const segment of segments) {
    const distanceMeters = calculateRouteDistanceMeters(segment);
    if (distanceMeters === null) {
      continue;
    }

    totalDistanceMeters += distanceMeters;
    hasMeasuredSegment = true;
  }

  return hasMeasuredSegment ? totalDistanceMeters : null;
}

export function buildGpsRecordSpeedEdits(
  document: Pick<FitDocument, "messages">,
  segments: readonly (readonly FitGpsRoutePoint[])[],
): FitFieldValueEdit[] {
  const speedByRecordId = calculateGpsRecordSpeeds(segments);
  const documentUsesEnhancedSpeed = document.messages.some(
    (record) =>
      record.messageName === "record" &&
      findField(
        record,
        RECORD_ENHANCED_SPEED_FIELD_NUMBER,
        "enhanced_speed",
      ) !== undefined,
  );
  const edits: FitFieldValueEdit[] = [];

  for (const record of document.messages) {
    if (record.messageName !== "record") {
      continue;
    }

    const speedMetersPerSecond = speedByRecordId.get(record.id) ?? null;
    const speedFields = findRecordSpeedFields(record);
    for (const field of speedFields) {
      edits.push(buildGpsSpeedEdit(record, field, speedMetersPerSecond));
    }

    if (
      speedMetersPerSecond !== null &&
      documentUsesEnhancedSpeed &&
      speedFields.every(
        (field) => field.number !== RECORD_ENHANCED_SPEED_FIELD_NUMBER,
      )
    ) {
      edits.push(buildAddedGpsEnhancedSpeedEdit(record, speedMetersPerSecond));
    }
  }

  return edits;
}

export function buildGpsRecordSpeedSummary(
  document: Pick<FitDocument, "messages">,
  segments: readonly (readonly FitGpsRoutePoint[])[],
): FitGpsRecordSpeedSummary {
  const speedByRecordId = calculateGpsRecordSpeeds(segments);
  const documentUsesEnhancedSpeed = document.messages.some(
    (record) =>
      record.messageName === "record" &&
      findField(
        record,
        RECORD_ENHANCED_SPEED_FIELD_NUMBER,
        "enhanced_speed",
      ) !== undefined,
  );
  let existingSpeedFields = 0;
  let updatedSpeedFields = 0;
  let clearedSpeedFields = 0;
  let addedEnhancedSpeedFields = 0;

  for (const record of document.messages) {
    if (record.messageName !== "record") {
      continue;
    }

    const speedFields = findRecordSpeedFields(record);
    existingSpeedFields += speedFields.length;
    if (speedByRecordId.has(record.id)) {
      updatedSpeedFields += speedFields.length;
      if (
        documentUsesEnhancedSpeed &&
        speedFields.every(
          (field) => field.number !== RECORD_ENHANCED_SPEED_FIELD_NUMBER,
        )
      ) {
        addedEnhancedSpeedFields += 1;
      }
    } else {
      clearedSpeedFields += speedFields.length;
    }
  }

  return {
    gpsSpeedRecords: speedByRecordId.size,
    existingSpeedFields,
    updatedSpeedFields,
    clearedSpeedFields,
    addedEnhancedSpeedFields,
  };
}

function resolveRouteDistanceMeters(route: FitRouteResponse): number | null {
  return route.distanceMeters !== undefined && Number.isFinite(route.distanceMeters)
    ? route.distanceMeters
    : calculateRouteDistanceMeters(route.points);
}

function sampleGpsRepairEditablePoints(
  run: FitGpsRepairRun,
  routePoints: readonly FitRoutePoint[],
): FitRoutePoint[] {
  if (
    routePoints.length === 0 ||
    run.missingRecords.length === 0 ||
    !run.before ||
    !run.after
  ) {
    return [];
  }

  const orderedMissingRecords = getOrderedMissingRecords(run);
  const fractions = resolveRouteFractions(run, orderedMissingRecords);
  return fractions.map((fraction) =>
    sampleRoutePoint(routePoints, fraction),
  );
}

function resolveRouteFractions(
  run: FitGpsRepairRun,
  orderedMissingRecords: readonly FitGpsRepairRunMissingRecord[],
): number[] {
  const timerFractions = resolveTimerRouteFractions(run, orderedMissingRecords);
  if (timerFractions.length > 0) {
    return timerFractions;
  }

  const timestampFractions = resolveTimestampRouteFractions(
    run,
    orderedMissingRecords,
  );
  return timestampFractions;
}

function resolveTimerRouteFractions(
  run: FitGpsRepairRun,
  orderedMissingRecords: readonly FitGpsRepairRunMissingRecord[],
): number[] {
  const before = run.before;
  const after = run.after;
  if (!before || !after) {
    return [];
  }

  const beforeTimerTimeSeconds = before.timerTimeSeconds;
  const afterTimerTimeSeconds = after.timerTimeSeconds;
  if (
    beforeTimerTimeSeconds === null ||
    afterTimerTimeSeconds === null ||
    orderedMissingRecords.some(
      (missingRecord) => missingRecord.timerTimeSeconds === null,
    )
  ) {
    return [];
  }

  const totalSeconds = afterTimerTimeSeconds - beforeTimerTimeSeconds;
  if (totalSeconds <= 0) {
    return [];
  }

  return orderedMissingRecords.map((missingRecord) =>
    clamp01(
      ((missingRecord.timerTimeSeconds ?? 0) - beforeTimerTimeSeconds) /
        totalSeconds,
    ),
  );
}

function resolveTimestampRouteFractions(
  run: FitGpsRepairRun,
  orderedMissingRecords: readonly FitGpsRepairRunMissingRecord[],
): number[] {
  const before = run.before;
  const after = run.after;
  if (!before || !after) {
    return [];
  }

  const totalSeconds = after.timestampSeconds - before.timestampSeconds;
  if (totalSeconds <= 0) {
    return [];
  }

  const fractions: number[] = [];
  for (const missingRecord of orderedMissingRecords) {
    if (missingRecord.timestampSeconds === null) {
      return [];
    }

    fractions.push(
      clamp01(
        (missingRecord.timestampSeconds - before.timestampSeconds) /
          totalSeconds,
      ),
    );
  }

  return fractions;
}

function getOrderedMissingRecords(
  run: FitGpsRepairRun,
): FitGpsRepairRunMissingRecord[] {
  return [...run.missingRecords].sort((left, right) => {
    if (left.timestampSeconds === null || right.timestampSeconds === null) {
      if (left.timestampSeconds !== null) {
        return -1;
      }

      if (right.timestampSeconds !== null) {
        return 1;
      }

      return left.record.order - right.record.order;
    }

    if (left.timestampSeconds !== right.timestampSeconds) {
      return left.timestampSeconds - right.timestampSeconds;
    }

    return left.record.order - right.record.order;
  });
}

function isFiniteRoutePoint(point: FitRoutePoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon);
}

interface GpsTimerState {
  readonly hasTimerEvents: boolean;
  readonly running: boolean;
  readonly elapsedSeconds: number;
  readonly lastStartTimestampSeconds: number | null;
}

function createTimerState(): GpsTimerState {
  return {
    hasTimerEvents: false,
    running: false,
    elapsedSeconds: 0,
    lastStartTimestampSeconds: null,
  };
}

function updateTimerState(
  state: GpsTimerState,
  record: FitDataRecord,
): GpsTimerState {
  if (
    record.globalMessageNumber !== TIMER_EVENT_MESSAGE_NUMBER &&
    record.messageName !== "event"
  ) {
    return state;
  }

  const timestampSeconds = readGpsTimestampSeconds(record);
  const event = readTimerEventField(record, TIMER_EVENT_FIELD_NUMBER, "event");
  const eventType = readTimerEventField(
    record,
    TIMER_EVENT_TYPE_FIELD_NUMBER,
    "event_type",
  );
  if (
    timestampSeconds === null ||
    event !== TIMER_EVENT_VALUE ||
    eventType === null
  ) {
    return state;
  }

  if (eventType === TIMER_EVENT_TYPE_START) {
    return {
      hasTimerEvents: true,
      running: true,
      elapsedSeconds: state.elapsedSeconds,
      lastStartTimestampSeconds: state.running
        ? state.lastStartTimestampSeconds
        : timestampSeconds,
    };
  }

  if (
    eventType === TIMER_EVENT_TYPE_STOP ||
    eventType === TIMER_EVENT_TYPE_STOP_ALL
  ) {
    return {
      hasTimerEvents: true,
      running: false,
      elapsedSeconds:
        state.running && state.lastStartTimestampSeconds !== null
          ? state.elapsedSeconds +
            Math.max(0, timestampSeconds - state.lastStartTimestampSeconds)
          : state.elapsedSeconds,
      lastStartTimestampSeconds: null,
    };
  }

  return { ...state, hasTimerEvents: true };
}

function readTimerTimeSeconds(
  state: GpsTimerState,
  timestampSeconds: number | null,
): number | null {
  if (!state.hasTimerEvents || timestampSeconds === null) {
    return null;
  }

  if (!state.running || state.lastStartTimestampSeconds === null) {
    return state.elapsedSeconds;
  }

  return (
    state.elapsedSeconds +
    Math.max(0, timestampSeconds - state.lastStartTimestampSeconds)
  );
}

function readTimerEventField(
  record: FitDataRecord,
  fieldNumber: number,
  fieldName: string,
): number | null {
  const field = findField(record, fieldNumber, fieldName);
  return field ? coerceNumericValue(field.value) : null;
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

function findRecordSpeedFields(record: FitDataRecord): FitField[] {
  return record.fields.filter(
    (field) =>
      !field.developer &&
      (field.number === RECORD_SPEED_FIELD_NUMBER ||
        field.number === RECORD_ENHANCED_SPEED_FIELD_NUMBER ||
        field.name === "speed" ||
        field.name === "enhanced_speed"),
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

function calculateGpsRecordSpeeds(
  segments: readonly (readonly FitGpsRoutePoint[])[],
): ReadonlyMap<string, number> {
  const speeds = new Map<string, number>();

  for (const segment of segments) {
    if (segment.length < 2) {
      continue;
    }

    for (let index = 0; index < segment.length; index += 1) {
      const previous = index > 0 ? segment[index - 1] : null;
      const current = segment[index];
      const next = index === 0 ? segment[index + 1] : null;
      if (!current) {
        continue;
      }

      const speed =
        previous && current
          ? calculatePointPairSpeedMetersPerSecond(previous, current)
          : current && next
            ? calculatePointPairSpeedMetersPerSecond(current, next)
            : null;
      if (speed !== null) {
        speeds.set(current.recordId, speed);
      }
    }
  }

  return speeds;
}

function calculatePointPairSpeedMetersPerSecond(
  start: FitGpsRoutePoint,
  end: FitGpsRoutePoint,
): number | null {
  if (start.timestampSeconds === null || end.timestampSeconds === null) {
    return null;
  }

  const deltaSeconds = end.timestampSeconds - start.timestampSeconds;
  if (deltaSeconds <= 0) {
    return null;
  }

  const distanceMeters = calculateRouteDistanceMeters([start, end]);
  if (distanceMeters === null) {
    return null;
  }

  const speed = distanceMeters / deltaSeconds;
  return Number.isFinite(speed) && speed >= 0 ? speed : null;
}

function buildGpsSpeedEdit(
  record: FitDataRecord,
  field: FitField,
  speedMetersPerSecond: number | null,
): FitFieldValueEdit {
  const edit: FitFieldValueEdit = {
    messageId: record.id,
    fieldId: field.id,
    fieldNumber: field.number,
    fieldName: field.name,
    size: field.size,
    ...(field.added ? { added: true as const } : {}),
    value:
      speedMetersPerSecond === null
        ? null
        : encodeSpeedMetersPerSecond(speedMetersPerSecond, field),
  };

  if (!field.developer) {
    return {
      ...edit,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName,
      units: field.units,
    };
  }

  return edit;
}

function buildAddedGpsEnhancedSpeedEdit(
  record: FitDataRecord,
  speedMetersPerSecond: number,
): FitFieldValueEdit {
  return {
    messageId: record.id,
    fieldId: `gps:${record.id}:enhanced_speed`,
    fieldNumber: RECORD_ENHANCED_SPEED_FIELD_NUMBER,
    fieldName: "enhanced_speed",
    baseType: 0x86,
    baseTypeName: "uint32",
    size: 4,
    units: "m/s",
    added: true,
    value: Math.round(speedMetersPerSecond * RECORD_SPEED_SCALE),
  };
}

function encodeSpeedMetersPerSecond(
  speedMetersPerSecond: number,
  field: FitField,
): number {
  const rawValue = Math.round(speedMetersPerSecond * RECORD_SPEED_SCALE);
  if (field.developer) {
    return rawValue;
  }

  if (field.baseTypeName === "uint16" || field.baseType === 0x84) {
    return Math.min(0xffff, rawValue);
  }

  if (field.baseTypeName === "uint8" || field.baseType === 0x02) {
    return Math.min(0xff, rawValue);
  }

  return rawValue;
}

function sampleRoutePoint(
  points: readonly FitRoutePoint[],
  fraction: number,
): FitRoutePoint {
  if (points.length === 1) {
    return points[0];
  }

  const boundedFraction = clamp01(fraction);
  const totalDistance = calculateRouteDistanceMeters(points) ?? 0;

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
    const edit: FitFieldValueEdit = {
      messageId: record.id,
      fieldId: field.id,
      fieldNumber,
      value,
    };

    if (!field.added || field.developer) {
      return edit;
    }

    return {
      ...edit,
      fieldName: field.name,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName,
      size: field.size,
      units: field.units,
      added: true,
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

function buildGpsPositionEraseEdit(
  record: FitDataRecord,
  field: FitField,
): FitFieldValueEdit {
  const edit: FitFieldValueEdit = {
    messageId: record.id,
    fieldId: field.id,
    fieldNumber: field.number,
    fieldName: field.name,
    size: field.size,
    value: null,
  };

  if (!field.developer) {
    return {
      ...edit,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName,
      units: field.units,
    };
  }

  return edit;
}

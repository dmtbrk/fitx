import type {
  FitDataRecord,
  FitDataField,
  FitDocument,
  FitField,
  FitFieldValueEdit,
  FitValue,
  ResolvedProfileFieldMetadata,
} from "../fit";
import { getProfileFieldMetadata } from "../fit";

export interface FitActivitySummary {
  readonly activityIdentity: string | null;
  readonly activityIcon: FitActivitySportIcon | null;
  readonly startTime: string | null;
  readonly distance: string | null;
  readonly distanceMeters: number | null;
  readonly duration: string | null;
}

export type FitActivitySportIcon = "activity" | "cycling" | "running";

export interface FitActivitySummaryFormatOptions {
  readonly locale?: string;
  readonly timeZone?: string;
}

export interface FitActivityRoutePoint {
  readonly lat: number;
  readonly lon: number;
}

export interface FitActivityTimedRoutePoint extends FitActivityRoutePoint {
  readonly timestampSeconds: number | null;
}

export interface FitActivityBounds {
  readonly north: number;
  readonly east: number;
  readonly south: number;
  readonly west: number;
}

export interface FitLapGpsSummary {
  readonly lapId: string;
  readonly order: number;
  readonly index: number;
  readonly timeRange: string | null;
  readonly currentStart: FitActivityRoutePoint | null;
  readonly currentEnd: FitActivityRoutePoint | null;
  readonly currentBounds: FitActivityBounds | null;
  readonly gpsStart: FitActivityRoutePoint | null;
  readonly gpsEnd: FitActivityRoutePoint | null;
  readonly gpsBounds: FitActivityBounds | null;
  readonly gpsPointCount: number;
  readonly changed: boolean;
}

export interface FitLapDataSummary {
  readonly lapId: string;
  readonly order: number;
  readonly index: number;
  readonly fieldCount: number;
  readonly populatedFieldCount: number;
  readonly fields: readonly FitLapDataField[];
}

export interface FitLapDataField {
  readonly fieldId: string;
  readonly number: number;
  readonly name: string;
  readonly value: string;
  readonly valid: boolean;
}

export interface FitSessionDataSummary {
  readonly sessionId: string;
  readonly order: number;
  readonly fieldCount: number;
  readonly populatedFieldCount: number;
  readonly fields: readonly FitSessionDataField[];
}

export type FitSessionDataField = FitLapDataField;

export type FitMessageDataField = FitLapDataField;

export interface FitMessageDataSummary {
  readonly messageId: string;
  readonly order: number;
  readonly index: number;
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly title: string;
  readonly dateLabel: string | null;
  readonly timeLabel: string | null;
  readonly fieldCount: number;
  readonly populatedFieldCount: number;
  readonly fields: readonly FitMessageDataField[];
}

export interface FitMessageDataGroup {
  readonly key: string;
  readonly globalMessageNumber: number;
  readonly messageName: string;
  readonly label: string;
  readonly count: number;
  readonly dense: boolean;
  readonly messages: readonly FitMessageDataSummary[];
}

interface FitLapTiming {
  readonly message: FitDataRecord;
  readonly startSeconds: number;
  readonly endSeconds: number | null;
}

const SESSION_MESSAGE_NUMBER = 18;
const LAP_MESSAGE_NUMBER = 19;
const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);
const TOTAL_DISTANCE_SCALE = 100;
const TOTAL_TIMER_TIME_SCALE = 1000;
const SEMICIRCLES_PER_DEGREE = 2147483648 / 180;
const SESSION_POSITION_FIELDS = {
  startLat: { number: 3, name: "start_position_lat" },
  startLong: { number: 4, name: "start_position_long" },
  necLat: { number: 29, name: "nec_lat" },
  necLong: { number: 30, name: "nec_long" },
  swcLat: { number: 31, name: "swc_lat" },
  swcLong: { number: 32, name: "swc_long" },
  endLat: { number: 38, name: "end_position_lat" },
  endLong: { number: 39, name: "end_position_long" },
} as const;
const LAP_POSITION_FIELDS = {
  startLat: { number: 3, name: "start_position_lat" },
  startLong: { number: 4, name: "start_position_long" },
  endLat: { number: 5, name: "end_position_lat" },
  endLong: { number: 6, name: "end_position_long" },
  necLat: { number: 27, name: "nec_lat" },
  necLong: { number: 28, name: "nec_long" },
  swcLat: { number: 29, name: "swc_lat" },
  swcLong: { number: 30, name: "swc_long" },
} as const;
const MESSAGE_TIMESTAMP_FIELD = { number: 253, name: "timestamp" } as const;
const START_TIME_FIELD = { number: 2, name: "start_time" } as const;

const SPORT_LABELS = new Map<number, string>([
  [0, "Generic"],
  [1, "Running"],
  [2, "Cycling"],
]);

const SUB_SPORT_LABELS = new Map<number, string>([
  [0, "Generic"],
  [1, "Treadmill"],
  [2, "Road"],
]);

const SUMMARY_MESSAGE_PRIORITY = new Map<string, number>([
  ["session", 0],
  ["lap", 1],
  ["activity", 2],
  ["file_id", 3],
  ["sport", 4],
  ["device_info", 5],
  ["zones_target", 6],
  ["event", 7],
]);
const DENSE_MESSAGE_THRESHOLD = 25;

export function buildFitActivitySummary(
  document: Pick<FitDocument, "messages">,
  options: FitActivitySummaryFormatOptions = {},
): FitActivitySummary {
  const session = findSessionMessage(document);

  return {
    activityIdentity: session ? readActivityIdentity(session) : null,
    activityIcon: session ? readActivityIcon(session) : null,
    startTime: session ? readStartTime(session, options) : null,
    distance: session ? readDistance(session) : null,
    distanceMeters: session ? readDistanceMeters(session) : null,
    duration: session ? readDuration(session) : null,
  };
}

export function buildFitSessionDistanceEdit(
  document: Pick<FitDocument, "messages">,
  distanceMeters: number,
): FitFieldValueEdit[] {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return [];
  }

  const session = findSessionMessage(document);
  const field = session ? findField(session, "total_distance") : undefined;
  if (!session || !field || field.developer) {
    return [];
  }

  return [
    {
      messageId: session.id,
      fieldId: field.id,
      fieldNumber: field.number,
      fieldName: field.name,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName,
      size: field.size,
      units: field.units,
      value: Math.round(distanceMeters * TOTAL_DISTANCE_SCALE),
    },
  ];
}

export function buildFitSessionGpsSummaryEdits(
  document: Pick<FitDocument, "messages">,
  segments: readonly (readonly FitActivityRoutePoint[])[],
  distanceMeters: number,
): FitFieldValueEdit[] {
  const session = findSessionMessage(document);
  if (!session) {
    return [];
  }

  const points = segments.flat().filter(isFiniteRoutePoint);
  const edits = buildFitSessionDistanceEdit(document, distanceMeters);
  if (points.length === 0) {
    return edits;
  }

  const first = points[0];
  const last = points.at(-1);
  const bounds = calculateRouteBounds(points);
  if (!first || !last || !bounds) {
    return edits;
  }

  edits.push(
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.startLat, first.lat),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.startLong, first.lon),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.endLat, last.lat),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.endLong, last.lon),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.necLat, bounds.north),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.necLong, bounds.east),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.swcLat, bounds.south),
    ...buildSessionPositionEdit(session, SESSION_POSITION_FIELDS.swcLong, bounds.west),
  );

  return edits;
}

export function buildFitLapGpsSummaryEdits(
  document: Pick<FitDocument, "messages">,
  segments: readonly (readonly FitActivityTimedRoutePoint[])[],
): FitFieldValueEdit[] {
  const points = segments.flat().filter(isFiniteTimedRoutePoint);
  if (points.length === 0) {
    return [];
  }

  const laps = collectLapTimings(document);

  const edits: FitFieldValueEdit[] = [];
  for (let index = 0; index < laps.length; index += 1) {
    const lap = laps[index];
    if (!lap) {
      continue;
    }

    const lapPoints = resolveLapPoints(points, laps, index);
    edits.push(...buildPositionSummaryEdits(lap.message, lapPoints, LAP_POSITION_FIELDS));
  }

  return edits;
}

export function buildFitLapGpsSummaries(
  document: Pick<FitDocument, "messages">,
  segments: readonly (readonly FitActivityTimedRoutePoint[])[],
  options: FitActivitySummaryFormatOptions = {},
): FitLapGpsSummary[] {
  const points = segments.flat().filter(isFiniteTimedRoutePoint);
  const laps = collectLapTimings(document);

  return laps.map((lap, index) => {
    const lapPoints = resolveLapPoints(points, laps, index);
    const gpsStart = lapPoints[0] ?? null;
    const gpsEnd = lapPoints.at(-1) ?? null;
    const gpsBounds = calculateRouteBounds(lapPoints);
    const currentStart = readPositionPair(
      lap.message,
      LAP_POSITION_FIELDS.startLat,
      LAP_POSITION_FIELDS.startLong,
    );
    const currentEnd = readPositionPair(
      lap.message,
      LAP_POSITION_FIELDS.endLat,
      LAP_POSITION_FIELDS.endLong,
    );
    const currentBounds = readBounds(lap.message, LAP_POSITION_FIELDS);

    return {
      lapId: lap.message.id,
      order: lap.message.order,
      index,
      timeRange: formatLapTimeRange(lap.startSeconds, lap.endSeconds, options),
      currentStart,
      currentEnd,
      currentBounds,
      gpsStart,
      gpsEnd,
      gpsBounds,
      gpsPointCount: lapPoints.length,
      changed:
        !areRoutePointsEqual(currentStart, gpsStart) ||
        !areRoutePointsEqual(currentEnd, gpsEnd) ||
        !areBoundsEqual(currentBounds, gpsBounds),
    };
  });
}

export function buildFitLapDataSummaries(
  document: Pick<FitDocument, "messages">,
  options: FitActivitySummaryFormatOptions = {},
): FitLapDataSummary[] {
  return findLapMessages(document)
    .sort((left, right) => left.order - right.order)
    .map((lap, index) => {
      const presentFields = lap.fields.filter((field) => field.added !== true);
      return {
        lapId: lap.id,
        order: lap.order,
        index,
        fieldCount: presentFields.length,
        populatedFieldCount: presentFields.filter(isFieldValuePopulated).length,
        fields: presentFields.map((field) => {
          const profile = field.developer ? null : resolveLapFieldProfile(field);
          return {
            fieldId: field.id,
            number: field.number,
            name: profile?.name ?? field.name,
            value: formatMessageFieldValue(
              field,
              profile,
              options,
              LAP_MESSAGE_NUMBER,
            ),
            valid: isFieldValuePopulated(field),
          };
        }),
      };
    });
}

export function buildFitSessionDataSummary(
  document: Pick<FitDocument, "messages">,
  options: FitActivitySummaryFormatOptions = {},
): FitSessionDataSummary | null {
  const session = findSessionMessage(document);
  if (!session) {
    return null;
  }

  const presentFields = session.fields.filter((field) => field.added !== true);
  return {
    sessionId: session.id,
    order: session.order,
    fieldCount: presentFields.length,
    populatedFieldCount: presentFields.filter(isFieldValuePopulated).length,
    fields: presentFields.map((field) => {
      const profile = field.developer ? null : resolveSessionFieldProfile(field);
      return {
        fieldId: field.id,
        number: field.number,
        name: profile?.name ?? field.name,
        value: formatMessageFieldValue(
          field,
          profile,
          options,
          SESSION_MESSAGE_NUMBER,
        ),
        valid: isFieldValuePopulated(field),
      };
    }),
  };
}

export function buildFitMessageDataGroups(
  document: Pick<FitDocument, "messages">,
  options: FitActivitySummaryFormatOptions = {},
): FitMessageDataGroup[] {
  const groups = new Map<number, FitMessageDataSummary[]>();

  for (const message of document.messages) {
    const groupMessages = groups.get(message.globalMessageNumber) ?? [];
    groupMessages.push(
      buildFitMessageDataSummary(message, groupMessages.length, options),
    );
    groups.set(message.globalMessageNumber, groupMessages);
  }

  return [...groups.entries()]
    .map(([globalMessageNumber, messages]) => {
      const firstMessage = messages[0];
      const messageName =
        firstMessage?.messageName ??
        `unknown_message_${globalMessageNumber}`;
      return {
        key: `${globalMessageNumber}:${messageName}`,
        globalMessageNumber,
        messageName,
        label: titleCase(messageName),
        count: messages.length,
        dense: messageName === "record" || messages.length > DENSE_MESSAGE_THRESHOLD,
        messages,
      };
    })
    .sort(compareMessageDataGroups);
}

export function buildFitMessageDataSummary(
  message: FitDataRecord,
  index: number,
  options: FitActivitySummaryFormatOptions,
): FitMessageDataSummary {
  const presentFields = message.fields.filter((field) => field.added !== true);
  const timestamp = readMessageTimestamp(message);

  return {
    messageId: message.id,
    order: message.order,
    index,
    globalMessageNumber: message.globalMessageNumber,
    messageName: message.messageName,
    title: `${titleCase(message.messageName)} ${index + 1}`,
    dateLabel:
      timestamp === null ? null : formatDateLabel(timestamp, options),
    timeLabel:
      timestamp === null ? null : formatTimeOfDay(timestamp, options),
    fieldCount: presentFields.length,
    populatedFieldCount: presentFields.filter(isFieldValuePopulated).length,
    fields: presentFields.map((field) =>
      buildMessageDataField(field, message.globalMessageNumber, options),
    ),
  };
}

function buildMessageDataField(
  field: FitField,
  globalMessageNumber: number,
  options: FitActivitySummaryFormatOptions,
): FitMessageDataField {
  const profile = field.developer
    ? null
    : getProfileFieldMetadata(globalMessageNumber, field.number);
  return {
    fieldId: field.id,
    number: field.number,
    name: profile?.name ?? field.name,
    value: formatMessageFieldValue(field, profile, options, globalMessageNumber),
    valid: isFieldValuePopulated(field),
  };
}

function compareMessageDataGroups(
  left: FitMessageDataGroup,
  right: FitMessageDataGroup,
): number {
  const leftPriority = getMessageDataGroupPriority(left);
  const rightPriority = getMessageDataGroupPriority(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftOrder = left.messages[0]?.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.messages[0]?.order ?? Number.MAX_SAFE_INTEGER;
  return leftOrder - rightOrder;
}

function getMessageDataGroupPriority(group: FitMessageDataGroup): number {
  const summaryPriority = SUMMARY_MESSAGE_PRIORITY.get(group.messageName);
  if (summaryPriority !== undefined) {
    return summaryPriority;
  }

  return group.dense ? 100 : 50;
}

function findSessionMessage(
  document: Pick<FitDocument, "messages">,
): FitDataRecord | undefined {
  return document.messages.find(
    (message) =>
      message.globalMessageNumber === SESSION_MESSAGE_NUMBER ||
      message.messageName === "session",
  );
}

function findLapMessages(
  document: Pick<FitDocument, "messages">,
): FitDataRecord[] {
  return document.messages.filter(
    (message) =>
      message.globalMessageNumber === LAP_MESSAGE_NUMBER ||
      message.messageName === "lap",
  );
}

function collectLapTimings(
  document: Pick<FitDocument, "messages">,
): FitLapTiming[] {
  return findLapMessages(document)
    .map((lap) => ({
      message: lap,
      startSeconds: readNumericFieldByNameOrNumber(lap, START_TIME_FIELD),
      endSeconds: readNumericFieldByNameOrNumber(lap, MESSAGE_TIMESTAMP_FIELD),
    }))
    .filter(
      (
        lap,
      ): lap is FitLapTiming => lap.startSeconds !== null,
    )
    .sort((left, right) => left.startSeconds - right.startSeconds);
}

function readActivityIdentity(session: FitDataRecord): string | null {
  const sport = readEnumField(session, "sport", SPORT_LABELS);
  if (!sport) {
    return null;
  }

  const subSport = readEnumField(session, "sub_sport", SUB_SPORT_LABELS);
  if (!subSport || isGenericLabel(subSport)) {
    return sport;
  }

  if (isGenericLabel(sport)) {
    return subSport;
  }

  return `${subSport} ${sport.toLowerCase()}`;
}

function readActivityIcon(session: FitDataRecord): FitActivitySportIcon | null {
  const sport = readEnumValue(session, "sport");
  if (sport === null) {
    return null;
  }

  if (sport === 1) {
    return "running";
  }

  if (sport === 2) {
    return "cycling";
  }

  return "activity";
}

function readStartTime(
  session: FitDataRecord,
  options: FitActivitySummaryFormatOptions,
): string | null {
  const seconds = readNumericField(session, "start_time");
  return seconds === null ? null : formatStartTime(seconds, options);
}

function readDistance(session: FitDataRecord): string | null {
  const meters = readDistanceMeters(session);
  if (meters === null) {
    return null;
  }

  return formatDistanceMeters(meters);
}

function readDistanceMeters(session: FitDataRecord): number | null {
  const rawDistance = readNumericField(session, "total_distance");
  if (rawDistance === null) {
    return null;
  }

  const meters = rawDistance / TOTAL_DISTANCE_SCALE;
  return Number.isFinite(meters) ? meters : null;
}

function readDuration(session: FitDataRecord): string | null {
  const rawTimerTime = readNumericField(session, "total_timer_time");
  if (rawTimerTime === null) {
    return null;
  }

  const seconds = Math.round(rawTimerTime / TOTAL_TIMER_TIME_SCALE);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${padTimePart(minutes)}:${padTimePart(remainingSeconds)}`;
  }

  return `${minutes}:${padTimePart(remainingSeconds)}`;
}

function readEnumField(
  session: FitDataRecord,
  fieldName: string,
  labels: ReadonlyMap<number, string>,
): string | null {
  const field = findField(session, fieldName);
  if (!field || field.developer) {
    return null;
  }

  const value = readNumericValue(field.value);
  if (value === null) {
    return typeof field.value === "string" && field.value.trim().length > 0
      ? titleCase(field.value)
      : null;
  }

  const profileLabel = field.profile.values.find(
    (candidate) => Number(candidate.value) === value,
  )?.name;
  return titleCase(profileLabel ?? labels.get(value) ?? `${fieldName} ${value}`);
}

function readEnumValue(session: FitDataRecord, fieldName: string): number | null {
  const field = findField(session, fieldName);
  if (!field || field.developer) {
    return null;
  }

  return readNumericValue(field.value);
}

function readNumericField(
  session: FitDataRecord,
  fieldName: string,
): number | null {
  const field = findField(session, fieldName);
  return field ? readNumericValue(field.value) : null;
}

function readNumericFieldByNameOrNumber(
  message: FitDataRecord,
  field: { readonly number: number; readonly name: string },
): number | null {
  const valueField = findFieldByNameOrNumber(message, field);
  return valueField ? readNumericValue(valueField.value) : null;
}

function findField(
  session: FitDataRecord,
  fieldName: string,
): FitField | undefined {
  return session.fields.find((field) => field.name === fieldName);
}

function findFieldByNameOrNumber(
  session: FitDataRecord,
  field: { readonly number?: number; readonly name: string },
): FitField | undefined {
  return session.fields.find(
    (candidate) =>
      candidate.name === field.name ||
      (field.number !== undefined && candidate.number === field.number),
  );
}

function buildSessionPositionEdit(
  message: FitDataRecord,
  target: { readonly number?: number; readonly name: string },
  degrees: number,
): FitFieldValueEdit[] {
  const field = findFieldByNameOrNumber(message, target);
  if (!field || !isGpsPositionField(field) || !Number.isFinite(degrees)) {
    return [];
  }

  return [
    {
      messageId: message.id,
      fieldId: field.id,
      fieldNumber: field.number,
      fieldName: field.name,
      baseType: field.baseType,
      baseTypeName: field.baseTypeName,
      size: field.size,
      units: field.units,
      value: degreesToSemicircles(degrees),
    },
  ];
}

function buildPositionSummaryEdits(
  message: FitDataRecord,
  points: readonly FitActivityRoutePoint[],
  fields: {
    readonly startLat: { readonly number?: number; readonly name: string };
    readonly startLong: { readonly number?: number; readonly name: string };
    readonly endLat: { readonly number?: number; readonly name: string };
    readonly endLong: { readonly number?: number; readonly name: string };
    readonly necLat: { readonly number?: number; readonly name: string };
    readonly necLong: { readonly number?: number; readonly name: string };
    readonly swcLat: { readonly number?: number; readonly name: string };
    readonly swcLong: { readonly number?: number; readonly name: string };
  },
): FitFieldValueEdit[] {
  const first = points[0];
  const last = points.at(-1);
  const bounds = calculateRouteBounds(points);
  if (!first || !last || !bounds) {
    return [];
  }

  return [
    ...buildSessionPositionEdit(message, fields.startLat, first.lat),
    ...buildSessionPositionEdit(message, fields.startLong, first.lon),
    ...buildSessionPositionEdit(message, fields.endLat, last.lat),
    ...buildSessionPositionEdit(message, fields.endLong, last.lon),
    ...buildSessionPositionEdit(message, fields.necLat, bounds.north),
    ...buildSessionPositionEdit(message, fields.necLong, bounds.east),
    ...buildSessionPositionEdit(message, fields.swcLat, bounds.south),
    ...buildSessionPositionEdit(message, fields.swcLong, bounds.west),
  ];
}

function resolveLapPoints(
  points: readonly FitActivityTimedRoutePoint[],
  laps: readonly FitLapTiming[],
  index: number,
): FitActivityTimedRoutePoint[] {
  const lap = laps[index];
  if (!lap) {
    return [];
  }

  const lastPointTimestamp =
    [...points].reverse().find((point) => point.timestampSeconds !== null)
      ?.timestampSeconds ?? null;
  const nextLapStartSeconds = laps[index + 1]?.startSeconds ?? null;
  const endExclusive =
    nextLapStartSeconds !== null && nextLapStartSeconds > lap.startSeconds
      ? nextLapStartSeconds
      : null;
  const endInclusive =
    lap.endSeconds !== null && lap.endSeconds > lap.startSeconds
      ? lap.endSeconds
      : lastPointTimestamp;

  return resolveLapSummaryPoints(
    points,
    lap.startSeconds,
    endExclusive,
    endInclusive,
  );
}

function resolveLapSummaryPoints(
  points: readonly FitActivityTimedRoutePoint[],
  startSeconds: number,
  endExclusive: number | null,
  endInclusive: number | null,
): FitActivityTimedRoutePoint[] {
  const inRange = points.filter(
    (point) =>
      point.timestampSeconds !== null &&
      point.timestampSeconds >= startSeconds &&
      (endExclusive !== null
        ? point.timestampSeconds < endExclusive
        : endInclusive !== null && point.timestampSeconds <= endInclusive),
  );
  if (inRange.length > 0) {
    return inRange;
  }

  const endBoundary = endExclusive ?? endInclusive ?? startSeconds;
  const before = [...points]
    .reverse()
    .find(
      (point) =>
        point.timestampSeconds !== null &&
        point.timestampSeconds <= startSeconds,
    );
  const after = points.find(
    (point) =>
      point.timestampSeconds !== null &&
      point.timestampSeconds >= endBoundary,
  );

  if (before && after) {
    const midpointSeconds = startSeconds + (endBoundary - startSeconds) / 2;
    return [
      Math.abs((before.timestampSeconds ?? startSeconds) - midpointSeconds) <=
      Math.abs((after.timestampSeconds ?? endBoundary) - midpointSeconds)
        ? before
        : after,
    ];
  }

  if (before) {
    return [before];
  }

  if (after) {
    return [after];
  }

  return [];
}

function readPositionPair(
  message: FitDataRecord,
  latitudeTarget: { readonly number?: number; readonly name: string },
  longitudeTarget: { readonly number?: number; readonly name: string },
): FitActivityRoutePoint | null {
  const latitude = readPositionDegrees(message, latitudeTarget);
  const longitude = readPositionDegrees(message, longitudeTarget);
  return latitude === null || longitude === null
    ? null
    : { lat: latitude, lon: longitude };
}

function readBounds(
  message: FitDataRecord,
  fields: {
    readonly necLat: { readonly number?: number; readonly name: string };
    readonly necLong: { readonly number?: number; readonly name: string };
    readonly swcLat: { readonly number?: number; readonly name: string };
    readonly swcLong: { readonly number?: number; readonly name: string };
  },
): FitActivityBounds | null {
  const north = readPositionDegrees(message, fields.necLat);
  const east = readPositionDegrees(message, fields.necLong);
  const south = readPositionDegrees(message, fields.swcLat);
  const west = readPositionDegrees(message, fields.swcLong);
  if (north === null || east === null || south === null || west === null) {
    return null;
  }

  return { north, east, south, west };
}

function readPositionDegrees(
  message: FitDataRecord,
  target: { readonly number?: number; readonly name: string },
): number | null {
  const field = findFieldByNameOrNumber(message, target);
  const semicircles = field && isGpsPositionField(field)
    ? readNumericValue(field.value)
    : null;
  return semicircles === null ? null : semicircles / SEMICIRCLES_PER_DEGREE;
}

function areRoutePointsEqual(
  left: FitActivityRoutePoint | null,
  right: FitActivityRoutePoint | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    Math.abs(left.lat - right.lat) < 0.000001 &&
    Math.abs(left.lon - right.lon) < 0.000001
  );
}

function areBoundsEqual(
  left: FitActivityBounds | null,
  right: FitActivityBounds | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    Math.abs(left.north - right.north) < 0.000001 &&
    Math.abs(left.east - right.east) < 0.000001 &&
    Math.abs(left.south - right.south) < 0.000001 &&
    Math.abs(left.west - right.west) < 0.000001
  );
}

function isGpsPositionField(field: FitField): field is FitDataField {
  return (
    !field.developer &&
    field.size === 4 &&
    (field.baseTypeName === "sint32" || field.baseType === 0x85)
  );
}

function calculateRouteBounds(
  points: readonly FitActivityRoutePoint[],
): {
  readonly north: number;
  readonly east: number;
  readonly south: number;
  readonly west: number;
} | null {
  if (points.length === 0) {
    return null;
  }

  let north = -Infinity;
  let east = -Infinity;
  let south = Infinity;
  let west = Infinity;
  for (const point of points) {
    north = Math.max(north, point.lat);
    east = Math.max(east, point.lon);
    south = Math.min(south, point.lat);
    west = Math.min(west, point.lon);
  }

  return Number.isFinite(north) &&
    Number.isFinite(east) &&
    Number.isFinite(south) &&
    Number.isFinite(west)
    ? { north, east, south, west }
    : null;
}

function isFiniteRoutePoint(point: FitActivityRoutePoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lon);
}

function isFiniteTimedRoutePoint(
  point: FitActivityTimedRoutePoint,
): boolean {
  return isFiniteRoutePoint(point);
}

function degreesToSemicircles(degrees: number): number {
  return Math.round(degrees * SEMICIRCLES_PER_DEGREE);
}

function readNumericValue(value: FitValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function formatStartTime(
  fitSeconds: number,
  options: FitActivitySummaryFormatOptions,
): string | null {
  if (!Number.isFinite(fitSeconds)) {
    return null;
  }

  const date = new Date(FIT_EPOCH_MS + fitSeconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(options.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
    timeZoneName: "short",
  }).format(date);
}

function formatDateLabel(
  fitSeconds: number,
  options: FitActivitySummaryFormatOptions,
): string | null {
  if (!Number.isFinite(fitSeconds)) {
    return null;
  }

  const date = new Date(FIT_EPOCH_MS + fitSeconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(options.locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: options.timeZone,
  }).format(date);
}

function formatLapTimeRange(
  startSeconds: number,
  endSeconds: number | null,
  options: FitActivitySummaryFormatOptions,
): string | null {
  const start = formatTimeOfDay(startSeconds, options);
  const end =
    endSeconds !== null && endSeconds >= startSeconds
      ? formatTimeOfDay(endSeconds, options)
      : null;
  if (!start) {
    return null;
  }

  return end ? `${start}-${end}` : start;
}

function formatMessageFieldValue(
  field: FitField,
  profile: ResolvedProfileFieldMetadata | null,
  options: FitActivitySummaryFormatOptions,
  globalMessageNumber: number,
): string {
  if (field.developer) {
    return formatFitValue(field.value);
  }

  if (!profile) {
    return formatFitValue(field.value);
  }

  const numericValue = readNumericValue(field.value);
  if (numericValue !== null) {
    if (field.number === 253 || field.number === 2 || profile.type === "timestamp") {
      return formatStartTime(numericValue, options) ?? String(numericValue);
    }

    if (isPositionField(field, globalMessageNumber)) {
      return `${(numericValue / SEMICIRCLES_PER_DEGREE).toFixed(6)} deg`;
    }

    if (
      profile.name === "total_elapsed_time" ||
      profile.name === "total_timer_time" ||
      (profile.units === "s" && (field.number === 7 || field.number === 8))
    ) {
      return formatDurationSeconds(applyProfileScale(numericValue, profile));
    }

    if (profile.name === "total_distance") {
      return formatDistanceMeters(applyProfileScale(numericValue, profile));
    }

    if (profile.name.toLowerCase().includes("speed") || profile.units === "m/s") {
      return `${applyProfileScale(numericValue, profile).toFixed(2)} m/s`;
    }

    if (profile.scale || profile.offset || profile.units) {
      const formattedValue = formatNumberValue(
        applyProfileScale(numericValue, profile),
      );
      return profile.units ? `${formattedValue} ${profile.units}` : formattedValue;
    }
  }

  const formattedValue = formatFitValue(field.value);
  return profile.units && formattedValue !== "-"
    ? `${formattedValue} ${profile.units}`
    : formattedValue;
}

function applyProfileScale(
  numericValue: number,
  profile: ResolvedProfileFieldMetadata,
): number {
  const scaledValue = profile.scale ? numericValue / profile.scale : numericValue;
  return profile.offset ? scaledValue - profile.offset : scaledValue;
}

function formatNumberValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function resolveSessionFieldProfile(
  field: FitField,
): ResolvedProfileFieldMetadata {
  return getProfileFieldMetadata(SESSION_MESSAGE_NUMBER, field.number);
}

function resolveLapFieldProfile(field: FitField): ResolvedProfileFieldMetadata {
  return getProfileFieldMetadata(LAP_MESSAGE_NUMBER, field.number);
}

function isFieldValuePopulated(field: FitField): boolean {
  return Array.isArray(field.value)
    ? field.value.some((entry) => entry !== null)
    : field.value !== null;
}

function isPositionField(
  field: FitDataField,
  globalMessageNumber: number,
): boolean {
  if (field.profile.units === "semicircles") {
    return true;
  }

  const positionFieldNumbers: readonly number[] =
    globalMessageNumber === SESSION_MESSAGE_NUMBER
      ? [
          SESSION_POSITION_FIELDS.startLat.number,
          SESSION_POSITION_FIELDS.startLong.number,
          SESSION_POSITION_FIELDS.necLat.number,
          SESSION_POSITION_FIELDS.necLong.number,
          SESSION_POSITION_FIELDS.swcLat.number,
          SESSION_POSITION_FIELDS.swcLong.number,
          SESSION_POSITION_FIELDS.endLat.number,
          SESSION_POSITION_FIELDS.endLong.number,
        ]
      : [
          LAP_POSITION_FIELDS.startLat.number,
          LAP_POSITION_FIELDS.startLong.number,
          LAP_POSITION_FIELDS.endLat.number,
          LAP_POSITION_FIELDS.endLong.number,
          LAP_POSITION_FIELDS.necLat.number,
          LAP_POSITION_FIELDS.necLong.number,
          LAP_POSITION_FIELDS.swcLat.number,
          LAP_POSITION_FIELDS.swcLong.number,
        ];

  return (
    field.size === 4 &&
    (field.baseTypeName === "sint32" || field.baseType === 0x85) &&
    positionFieldNumbers.includes(field.number)
  );
}

function formatTimeOfDay(
  fitSeconds: number,
  options: FitActivitySummaryFormatOptions,
): string | null {
  if (!Number.isFinite(fitSeconds)) {
    return null;
  }

  const date = new Date(FIT_EPOCH_MS + fitSeconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(options.locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: options.timeZone,
  }).format(date);
}

function formatDurationSeconds(rawSeconds: number): string {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) {
    return "-";
  }

  const seconds = Math.round(rawSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${padTimePart(minutes)}:${padTimePart(remainingSeconds)}`;
  }

  return `${minutes}:${padTimePart(remainingSeconds)}`;
}

function formatFitValue(value: FitValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatFitValue(item)).join(", ")}]`;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value === null) {
    return "-";
  }

  return String(value);
}

function readMessageTimestamp(message: FitDataRecord): number | null {
  const timestampField = message.fields.find(
    (field) =>
      !field.developer &&
      (field.number === MESSAGE_TIMESTAMP_FIELD.number ||
        field.name === MESSAGE_TIMESTAMP_FIELD.name ||
        field.name === START_TIME_FIELD.name),
  );
  return timestampField ? readNumericValue(timestampField.value) : null;
}

function isGenericLabel(label: string): boolean {
  return label.toLowerCase() === "generic";
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDistanceMeters(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
}

export interface FitRoutePoint {
  readonly lat: number;
  readonly lon: number;
}

export interface FitRouteRequest {
  readonly profile: string;
  readonly points: readonly FitRoutePoint[];
}

export interface FitRouteResponse {
  readonly points: readonly FitRoutePoint[];
  readonly distanceMeters?: number;
  readonly timeMs?: number;
}

export interface FitRouteProvider {
  readonly name: string;
  readonly apiKey: string;
  buildRequest(request: FitRouteRequest): FitRouteHttpRequest;
  parseResponse(response: unknown): FitRouteResponse;
}

export interface GraphHopperRouteProviderOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

export interface FitRouteHttpRequest {
  readonly url: string;
  readonly init: RequestInit;
}

export interface GraphHopperRouteResponsePath {
  readonly distance?: number;
  readonly time?: number;
  readonly points?: string | GraphHopperRouteCoordinates;
}

export interface GraphHopperRouteCoordinates {
  readonly type?: string;
  readonly coordinates?: readonly (readonly [number, number] | readonly [number, number, number])[];
}

export interface GraphHopperRouteResponse {
  readonly paths?: readonly GraphHopperRouteResponsePath[];
}

const DEFAULT_GRAPHHOPPER_ROUTE_URL = "https://graphhopper.com/api/1/route";

export function createGraphHopperRouteProvider(
  options: GraphHopperRouteProviderOptions = {},
): FitRouteProvider {
  const apiKey = resolveGraphHopperApiKey(options.apiKey);
  const baseUrl = normalizeBaseUrl(options.baseUrl) ?? DEFAULT_GRAPHHOPPER_ROUTE_URL;

  return {
    name: "graphhopper",
    apiKey,
    buildRequest(request) {
      return buildGraphHopperRouteRequest(request, apiKey, baseUrl);
    },
    parseResponse(response) {
      return parseGraphHopperRouteResponse(response);
    },
  };
}

export function buildGraphHopperRouteRequest(
  request: FitRouteRequest,
  apiKey: string,
  baseUrl: string = DEFAULT_GRAPHHOPPER_ROUTE_URL,
): FitRouteHttpRequest {
  if (!Number.isFinite(request.points.length) || request.points.length < 2) {
    throw new Error("GraphHopper routes require at least two points.");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("key", apiKey);

  const body = {
    profile: request.profile,
    points: request.points.map((point) => [point.lon, point.lat] as const),
    calc_points: true,
    instructions: false,
    elevation: false,
    points_encoded: false,
  };

  return {
    url: url.toString(),
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  };
}

export function parseGraphHopperRouteResponse(
  response: unknown,
): FitRouteResponse {
  const responseObject = asRecord(response, "GraphHopper route response");
  const paths = asReadonlyArray(responseObject.paths, "paths");
  if (paths.length === 0) {
    throw new Error("GraphHopper route response does not contain any paths.");
  }

  const firstPath = asRecord(paths[0], "GraphHopper route path");
  const points = parseGraphHopperRoutePoints(firstPath.points);
  if (points.length === 0) {
    throw new Error("GraphHopper route response did not include any route points.");
  }

  return {
    points,
    distanceMeters: toFiniteNumber(firstPath.distance),
    timeMs: toFiniteNumber(firstPath.time),
  };
}

function parseGraphHopperRoutePoints(points: unknown): FitRoutePoint[] {
  if (typeof points === "string") {
    return decodeGraphHopperPolyline(points);
  }

  const pointsObject = asRecord(points, "GraphHopper route points");
  const coordinates = asReadonlyArray(pointsObject.coordinates, "coordinates");
  return coordinates.map((coordinate) => {
    const tuple = asReadonlyArray(coordinate, "coordinate");
    if (tuple.length < 2) {
      throw new Error("GraphHopper route coordinates must contain longitude and latitude.");
    }

    const lon = toFiniteNumber(tuple[0]);
    const lat = toFiniteNumber(tuple[1]);
    if (lon === undefined || lat === undefined) {
      throw new Error("GraphHopper route coordinates must be numeric.");
    }

    return { lat, lon };
  });
}

function decodeGraphHopperPolyline(encoded: string): FitRoutePoint[] {
  const points: FitRoutePoint[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    const latDelta = decodeGraphHopperPolylineValue(encoded, () => index);
    index = latDelta.nextIndex;
    const lonDelta = decodeGraphHopperPolylineValue(encoded, () => index);
    index = lonDelta.nextIndex;
    lat += latDelta.value;
    lon += lonDelta.value;
    points.push({
      lat: lat / 1e5,
      lon: lon / 1e5,
    });
  }

  return points;
}

function decodeGraphHopperPolylineValue(
  encoded: string,
  getIndex: () => number,
): { readonly value: number; readonly nextIndex: number } {
  let index = getIndex();
  let result = 0;
  let shift = 0;

  while (index < encoded.length) {
    const byte = encoded.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
    if (byte < 0x20) {
      const value = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
      return { value, nextIndex: index };
    }
  }

  throw new Error("Truncated GraphHopper encoded polyline.");
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error(`${label} must be an object.`);
}

function asReadonlyArray(value: unknown, label: string): readonly unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  throw new Error(`${label} must be an array.`);
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

function resolveGraphHopperApiKey(apiKey?: string): string {
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (normalizedApiKey) {
    return normalizedApiKey;
  }

  const env = (import.meta as ImportMeta & {
    readonly env?: {
      readonly VITE_GRAPHHOPPER_API_KEY?: string;
    };
  }).env;
  const normalizedEnvKey = normalizeApiKey(env?.VITE_GRAPHHOPPER_API_KEY);
  if (normalizedEnvKey) {
    return normalizedEnvKey;
  }

  throw new Error("Missing GraphHopper API key.");
}

function normalizeApiKey(apiKey?: string): string | undefined {
  const trimmed = apiKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBaseUrl(baseUrl?: string): string | undefined {
  const trimmed = baseUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

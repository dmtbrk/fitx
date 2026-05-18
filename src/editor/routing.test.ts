import { describe, expect, it } from "vitest";
import {
  buildGraphHopperRouteRequest,
  createGraphHopperRouteProvider,
  parseGraphHopperRouteResponse,
} from "./routing";

describe("editor routing", () => {
  it("shapes GraphHopper route requests with lon/lat points and the injected API key", () => {
    const provider = createGraphHopperRouteProvider({ apiKey: "test-key" });

    const request = provider.buildRequest({
      profile: "bike",
      points: [
        { lat: 51.5, lon: 13.4 },
        { lat: 51.6, lon: 13.5 },
      ],
    });

    expect(request.url).toBe("https://graphhopper.com/api/1/route?key=test-key");
    expect(request.init).toMatchObject({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });

    expect(JSON.parse(request.init.body as string)).toEqual({
      profile: "bike",
      points: [
        [13.4, 51.5],
        [13.5, 51.6],
      ],
      calc_points: true,
      instructions: false,
      elevation: false,
      points_encoded: false,
    });
  });

  it("normalizes GraphHopper route responses into provider-neutral coordinates", () => {
    const response = parseGraphHopperRouteResponse({
      paths: [
        {
          distance: 1245.5,
          time: 3210,
          points: {
            type: "LineString",
            coordinates: [
              [13.4, 51.5],
              [13.5, 51.6],
            ],
          },
        },
      ],
    });

    expect(response).toEqual({
      distanceMeters: 1245.5,
      timeMs: 3210,
      points: [
        { lat: 51.5, lon: 13.4 },
        { lat: 51.6, lon: 13.5 },
      ],
    });
  });
});

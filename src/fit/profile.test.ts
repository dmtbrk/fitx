import { describe, expect, it } from "vitest";
import {
  getProfileFieldMetadata,
  getProfileMessageMetadata,
  hasProfileFieldMetadata,
  hasProfileMessageMetadata
} from "./profile";

describe("fit profile metadata", () => {
  it("resolves known message metadata", () => {
    const message = getProfileMessageMetadata(18);

    expect(message.known).toBe(true);
    expect(message.name).toBe("session");
    expect(message.fields.map((field) => field.number)).toContain(253);
    expect(hasProfileMessageMetadata(18)).toBe(true);
  });

  it("resolves known field metadata", () => {
    const field = getProfileFieldMetadata(18, 9);

    expect(field.known).toBe(true);
    expect(field.messageName).toBe("session");
    expect(field.name).toBe("total_distance");
    expect(field.baseType).toBe("uint32");
    expect(field.units).toBe("m");
    expect(hasProfileFieldMetadata(18, 9)).toBe(true);
  });

  it("resolves Garmin lap boundary compatibility fields", () => {
    const field = getProfileFieldMetadata(19, 29);

    expect(field.known).toBe(true);
    expect(field.messageName).toBe("lap");
    expect(field.name).toBe("swc_lat");
    expect(field.baseType).toBe("sint32");
    expect(field.units).toBe("semicircles");
    expect(field.profileSource).toBe("HarryOnline community FIT profile");
    expect(hasProfileFieldMetadata(19, 29)).toBe(true);
  });

  it("resolves community-only message metadata", () => {
    const message = getProfileMessageMetadata(326);

    expect(message.known).toBe(true);
    expect(message.name).toBe("gps_event");
    expect(message.fields.map((candidate) => candidate.number)).toContain(0);
    const field = getProfileFieldMetadata(326, 0);

    expect(field.known).toBe(true);
    expect(field.messageName).toBe("gps_event");
    expect(field.name).toBe("event_type");
    expect(field.profileSourceUrl).toContain("harryonline.net");
  });

  it("falls back to unknown message and field metadata", () => {
    const message = getProfileMessageMetadata(999);
    const field = getProfileFieldMetadata(999, 12);

    expect(message.known).toBe(false);
    expect(message.name).toBe("unknown_message_999");
    expect(message.fields).toEqual([]);
    expect(field.known).toBe(false);
    expect(field.messageName).toBe("unknown_message_999");
    expect(field.name).toBe("unknown_field_12");
    expect(field.baseType).toBe("unknown");
    expect(field.size).toBe(0);
  });
});

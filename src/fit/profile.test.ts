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

import { describe, expect, it } from "vitest";
import {
  createValidationIssue,
  isExportBlockingIssue,
  isWarningIssue,
  parseNumericValue,
  validateNumericValue,
  validatePercentValue
} from "./validation";

describe("fit validation", () => {
  it("parses numeric input conservatively", () => {
    expect(parseNumericValue(" 12.5 ")).toBe(12.5);
    expect(parseNumericValue(4)).toBe(4);
    expect(parseNumericValue("")).toBeNull();
    expect(parseNumericValue("not-a-number")).toBeNull();
  });

  it("validates numeric values with range and integer checks", () => {
    expect(validateNumericValue("3", { integer: true, min: 1, max: 5 })).toEqual({
      ok: true,
      value: 3
    });

    const tooSmall = validateNumericValue("-1", { min: 0, label: "Cadence" });
    expect(tooSmall.ok).toBe(false);
    expect(tooSmall.issue).toMatchObject({
      code: "value-too-small",
      severity: "warning",
      message: "Cadence must be at least 0."
    });

    const notWhole = validateNumericValue("1.5", { integer: true, severity: "export-blocking" });
    expect(notWhole.ok).toBe(false);
    expect(notWhole.issue).toMatchObject({
      code: "invalid-integer",
      severity: "export-blocking"
    });
  });

  it("validates percent values within the FIT range", () => {
    expect(validatePercentValue(42)).toEqual({ ok: true, value: 42 });

    const invalid = validatePercentValue(101, { label: "Body fat" });
    expect(invalid.ok).toBe(false);
    expect(invalid.issue).toMatchObject({
      code: "value-too-large",
      severity: "warning",
      message: "Body fat must be at most 100."
    });
  });

  it("supports warning and export-blocking issue severities", () => {
    const warning = createValidationIssue("custom-warning", "Warn", "warning");
    const blocking = createValidationIssue("custom-blocking", "Block", "export-blocking");

    expect(isWarningIssue(warning)).toBe(true);
    expect(isExportBlockingIssue(warning)).toBe(false);
    expect(isWarningIssue(blocking)).toBe(false);
    expect(isExportBlockingIssue(blocking)).toBe(true);
  });

  it("allows empty numeric inputs when configured", () => {
    expect(validateNumericValue(" ", { allowEmpty: true })).toEqual({ ok: true, value: null });
  });
});

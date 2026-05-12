export type FitIssueSeverity = "warning" | "export-blocking";

export interface FitValidationIssue {
  severity: FitIssueSeverity;
  code: string;
  message: string;
  value?: unknown;
  min?: number;
  max?: number;
}

export interface FitNumericValidationOptions {
  label?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  allowEmpty?: boolean;
  severity?: FitIssueSeverity;
}

export interface FitValidationResult {
  ok: boolean;
  value: number | null;
  issue?: FitValidationIssue;
}

export function createValidationIssue(
  code: string,
  message: string,
  severity: FitIssueSeverity = "warning",
  details: Omit<FitValidationIssue, "code" | "message" | "severity"> = {}
): FitValidationIssue {
  return {
    code,
    message,
    severity,
    ...details
  };
}

export function isExportBlockingIssue(issue: FitValidationIssue): boolean {
  return issue.severity === "export-blocking";
}

export function isWarningIssue(issue: FitValidationIssue): boolean {
  return issue.severity === "warning";
}

export function parseNumericValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateNumericValue(
  value: string | number | null | undefined,
  options: FitNumericValidationOptions = {}
): FitValidationResult {
  const severity = options.severity ?? "warning";
  const parsed = parseNumericValue(value);
  const label = options.label ?? "Value";

  if (parsed === null) {
    if (value === null || value === undefined || (typeof value === "string" && value.trim().length === 0)) {
      if (options.allowEmpty) {
        return { ok: true, value: null };
      }

      return {
        ok: false,
        value: null,
        issue: createValidationIssue(
          "missing-number",
          `${label} is required.`,
          severity,
          { value }
        )
      };
    }

    return {
      ok: false,
      value: null,
      issue: createValidationIssue(
        "invalid-number",
        `${label} must be a valid number.`,
        severity,
        { value }
      )
    };
  }

  if (options.integer && !Number.isInteger(parsed)) {
    return {
      ok: false,
      value: parsed,
      issue: createValidationIssue(
        "invalid-integer",
        `${label} must be a whole number.`,
        severity,
        { value, min: options.min, max: options.max }
      )
    };
  }

  if (options.min !== undefined && parsed < options.min) {
    return {
      ok: false,
      value: parsed,
      issue: createValidationIssue(
        "value-too-small",
        `${label} must be at least ${options.min}.`,
        severity,
        { value: parsed, min: options.min, max: options.max }
      )
    };
  }

  if (options.max !== undefined && parsed > options.max) {
    return {
      ok: false,
      value: parsed,
      issue: createValidationIssue(
        "value-too-large",
        `${label} must be at most ${options.max}.`,
        severity,
        { value: parsed, min: options.min, max: options.max }
      )
    };
  }

  return { ok: true, value: parsed };
}

export function validatePercentValue(
  value: string | number | null | undefined,
  options: Omit<FitNumericValidationOptions, "min" | "max"> = {}
): FitValidationResult {
  return validateNumericValue(value, {
    ...options,
    min: 0,
    max: 100,
    label: options.label ?? "Percent"
  });
}

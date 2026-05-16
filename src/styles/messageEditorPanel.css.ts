import { style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: tokens.color.scrim,
  padding: tokens.space.x16,
  "@media": {
    "(max-width: 639px)": {
      padding: 0
    }
  }
});

export const content = style({
  position: "fixed",
  left: "50%",
  top: "50%",
  zIndex: 51,
  transform: "translate(-50%, -50%)",
  display: "flex",
  width: "min(980px, calc(100vw - 32px))",
  maxHeight: "min(88vh, 920px)",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${tokens.color.borderSubtle}`,
  borderRadius: tokens.radius.xxxl,
  background: tokens.color.surface,
  boxShadow: tokens.color.shadowDialog,
  outline: "none",
  "@media": {
    "(max-width: 639px)": {
      left: 0,
      top: 0,
      width: "100vw",
      maxHeight: "100dvh",
      height: "100dvh",
      transform: "none",
      border: 0,
      borderRadius: 0
    }
  }
});

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x12,
  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: `${tokens.space.x16} ${tokens.space.x20}`,
  "@media": {
    "(min-width: 640px)": {
      padding: `${tokens.space.x18} ${tokens.space.x24}`
    }
  }
});

export const headerRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: tokens.space.x16
});

export const titleWrap = style({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x4
});

export const title = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 20,
  fontWeight: 650,
  lineHeight: 1.2
});

export const titleMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x6,
  color: tokens.color.textSecondary,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4
});

export const titleMetaPill = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent,
  padding: `${tokens.space.x4} ${tokens.space.x10}`
});

export const description = style({
  margin: 0,
  color: tokens.color.textSecondary,
  fontSize: 14,
  lineHeight: 1.55
});

export const body = style({
  flex: 1,
  overflowY: "auto",
  padding: tokens.space.x16,
  "@media": {
    "(min-width: 640px)": {
      padding: tokens.space.x20
    }
  }
});

export const bodyStack = style({
  display: "grid",
  gap: tokens.space.x14
});

export const form = style({
  display: "flex",
  flex: 1,
  minHeight: 0,
  flexDirection: "column"
});

export const warningBanner = style({
  border: `1px solid ${tokens.color.borderDanger}`,
  borderRadius: tokens.radius.xl,
  background: tokens.color.surfaceWarningSoft,
  color: tokens.color.textDangerStrong,
  padding: `${tokens.space.x12} ${tokens.space.x14}`,
  fontSize: 14,
  lineHeight: 1.5
});

export const emptyState = style({
  borderRadius: tokens.radius.xxl,
  background: tokens.color.surfaceMuted,
  padding: `${tokens.space.x28} ${tokens.space.x20}`,
  color: tokens.color.textTertiary,
  textAlign: "center",
  fontSize: 14,
  fontWeight: 600
});

export const fieldList = style({
  display: "grid",
  gap: tokens.space.x12
});

export const fieldShell = style({
  minWidth: 0,
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.xl,
  background: tokens.color.surface,
  padding: tokens.space.x12,
  transition: `border-color ${tokens.motion.fast}, background ${tokens.motion.fast}, box-shadow ${tokens.motion.fast}`
});

export const fieldEdited = style({
  borderColor: tokens.color.borderAccent,
  boxShadow: tokens.color.insetAccent
});

export const fieldInvalid = style({
  borderColor: tokens.color.danger,
  background: tokens.color.surfaceDanger
});

export const fieldHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: `${tokens.space.x6} ${tokens.space.x12}`,
  marginBottom: tokens.space.x10
});

export const fieldLabel = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `${tokens.space.x4} ${tokens.space.x6}`,
  minWidth: 0,
  color: tokens.color.textSecondary,
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.35
});

export const fieldLabelName = style({
  color: tokens.color.textPrimary
});

export const fieldMeta = style({
  color: tokens.color.textTertiary,
  fontWeight: 600
});

export const issueList = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x6,
  justifyContent: "flex-end"
});

export const issuePill = style({
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceDangerStrong,
  color: tokens.color.textDanger,
  padding: `${tokens.space.x4} ${tokens.space.x8}`,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.2
});

export const issuePillWarning = style({
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning
});

export const issuePillBlocking = style({
  background: tokens.color.surfaceDangerBlocking,
  color: tokens.color.textBlocking
});

export const valueStack = style({
  display: "grid",
  gap: tokens.space.x8
});

export const valueInput = style({
  width: "100%",
  minWidth: 0,
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.md,
  background: tokens.color.surface,
  color: tokens.color.textPrimary,
  padding: `${tokens.space.x11} ${tokens.space.x12}`,
  fontSize: 14,
  lineHeight: 1.45,
  fontVariantNumeric: "tabular-nums",
  transition: `border-color ${tokens.motion.fast}, background ${tokens.motion.fast}, box-shadow ${tokens.motion.fast}`,
  selectors: {
    "&::placeholder": {
      color: tokens.color.textPlaceholder
    },
    "&:focus": {
      borderColor: tokens.color.brand,
      boxShadow: tokens.focus.brand,
      outline: "none"
    }
  }
});

export const valueInputEdited = style({
  borderColor: tokens.color.borderAccent,
  background: tokens.color.surfaceEditorSoft
});

export const valueInputInvalid = style({
  borderColor: tokens.color.danger,
  background: tokens.color.surfaceDanger,
  color: tokens.color.textDangerStrong,
  selectors: {
    "&:focus": {
      borderColor: tokens.color.danger,
      boxShadow: tokens.focus.danger
    }
  }
});

export const addFieldShell = style({
  background: tokens.color.surfaceEditorMuted
});

export const addFieldGrid = style({
  display: "grid",
  gap: tokens.space.x8,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  "@media": {
    "(max-width: 639px)": {
      gridTemplateColumns: "1fr"
    }
  }
});

export const addFieldActions = style({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: tokens.space.x10
});

export const footer = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: tokens.space.x8,
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  padding: `${tokens.space.x16} ${tokens.space.x20}`,
  "@media": {
    "(min-width: 640px)": {
      flexDirection: "row",
      justifyContent: "flex-end"
    }
  }
});

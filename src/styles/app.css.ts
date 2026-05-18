import { globalKeyframes, style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

globalKeyframes("fitx-spin", {
  to: { transform: "rotate(360deg)" }
});

export const app = style({
  minHeight: "100vh",
  background: tokens.color.canvas,
  color: tokens.color.textPrimary
});

export const topbar = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x16,
  width: "100%",
  maxWidth: 1152,
  margin: "0 auto",
  padding: `${tokens.space.x20} ${tokens.space.x16}`,
  "@media": {
    "(min-width: 640px)": { padding: `${tokens.space.x20} ${tokens.space.x24}` },
    "(min-width: 1024px)": { padding: `${tokens.space.x20} ${tokens.space.x32}` }
  }
});

export const brandGroup = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x12,
  minWidth: 0,
  flex: 1
});

export const appIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: tokens.radius.lg,
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent
});

export const title = style({
  margin: 0,
  flexShrink: 0,
  color: tokens.color.textPrimary,
  fontSize: 24,
  fontWeight: 650,
  lineHeight: 1.1
});

export const divider = style({
  display: "none",
  width: 1,
  height: 24,
  flexShrink: 0,
  background: tokens.color.borderDefault,
  "@media": { "(min-width: 640px)": { display: "block" } }
});

export const headerText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 600
});

export const mutedHeaderText = style({
  display: "none",
  flexShrink: 0,
  color: tokens.color.textSecondary,
  fontSize: 14,
  "@media": { "(min-width: 640px)": { display: "inline" } }
});

export const headerActions = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  flexShrink: 0
});

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.space.x8,
  minHeight: 42,
  borderRadius: tokens.radius.pill,
  border: "1px solid transparent",
  padding: `${tokens.space.x9} ${tokens.space.x16}`,
  fontSize: 14,
  fontWeight: 650,
  transition: `background ${tokens.motion.fast}, border-color ${tokens.motion.fast}, color ${tokens.motion.fast}, box-shadow ${tokens.motion.fast}`
});

export const primaryButton = style([
  button,
  {
    background: tokens.color.brand,
    color: tokens.color.textOnAccent,
    boxShadow: tokens.color.shadowButton,
    selectors: { "&:hover": { background: tokens.color.brandHover } }
  }
]);

export const secondaryButton = style([
  button,
  {
    borderColor: tokens.color.textTertiary,
    background: "transparent",
    color: tokens.color.brand,
    selectors: { "&:hover": { background: tokens.color.surfaceAccentHover } }
  }
]);

export const dangerButton = style([
  button,
  {
    background: tokens.color.danger,
    color: tokens.color.textOnAccent,
    selectors: { "&:hover": { background: tokens.color.dangerHover } }
  }
]);

export const iconOnlyButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  border: "1px solid transparent",
  borderRadius: tokens.radius.pill,
  background: "transparent",
  color: tokens.color.brand,
  transition: `background ${tokens.motion.fast}`,
  selectors: { "&:hover": { background: tokens.color.surfaceAccentHover } }
});

export const hiddenFileInput = style({
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap"
});

export const pill = style({
  display: "none",
  border: 0,
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x6} ${tokens.space.x12}`,
  fontSize: 12,
  fontWeight: 700,
  "@media": { "(min-width: 640px)": { display: "inline-flex" } }
});

export const issuePill = style([
  pill,
  {
    background: tokens.color.surfaceDangerStrong,
    color: tokens.color.textDanger,
    selectors: { "&:hover": { background: tokens.color.surfaceDangerHover } }
  }
]);

export const editPill = style([
  pill,
  {
    background: tokens.color.surfaceAccent,
    color: tokens.color.textAccent
  }
]);

export const messageToolbar = style({
  width: "100%",
  maxWidth: 1152,
  margin: "0 auto",
  padding: `0 ${tokens.space.x16} ${tokens.space.x12}`,
  "@media": {
    "(min-width: 640px)": { padding: `0 ${tokens.space.x24} ${tokens.space.x12}` },
    "(min-width: 1024px)": { padding: `0 ${tokens.space.x32} ${tokens.space.x12}` }
  }
});

export const messageToolbarSurface = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x8,
  borderRadius: tokens.radius.xxl,
  background: tokens.color.surfaceMuted,
  padding: tokens.space.x8
});

export const messageToolbarRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: tokens.space.x8,
  flexWrap: "wrap"
});

export const messageToolbarActions = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  marginLeft: "auto"
});

export const messageToolbarDisclosure = style({
  gap: tokens.space.x6,
  selectors: {
    "&[aria-expanded=\"true\"]": {
      borderColor: tokens.color.brand,
      background: tokens.color.brand,
      color: tokens.color.textOnAccent
    },
    "&[data-active=\"true\"]": {
      borderColor: tokens.color.brand,
      background: tokens.color.surfaceAccent,
      color: tokens.color.brand
    }
  }
});

export const messageToolbarDisclosureActive = style({
  borderColor: tokens.color.brand,
  background: tokens.color.surfaceAccent,
  color: tokens.color.brand
});

export const messageToolbarDisclosureIcon = style({
  flexShrink: 0
});

export const messageToolbarSummary = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  border: "1px solid transparent",
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x9} ${tokens.space.x14}`,
  background: tokens.color.surfaceAccent,
  color: tokens.color.brand,
  fontSize: 14,
  fontWeight: 650,
  transition: `background ${tokens.motion.fast}`,
  selectors: { "&:hover": { background: tokens.color.surfaceAccentHover } }
});

export const messageToolbarFilters = style({
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  paddingTop: tokens.space.x8
});

export const messageToolbarSelectionCount = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 42,
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x9} ${tokens.space.x14}`,
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent,
  fontSize: 14,
  fontWeight: 650,
  whiteSpace: "nowrap"
});

export const filterBar = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8
});

export const filterButton = style({
  flexShrink: 0,
  minHeight: 36,
  border: 0,
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x7} ${tokens.space.x12}`,
  background: tokens.color.surface,
  color: tokens.color.textSecondary,
  fontSize: 14,
  fontWeight: 650,
  transition: `background ${tokens.motion.fast}, color ${tokens.motion.fast}`,
  selectors: {
    "&:hover": { background: tokens.color.surfaceAccent },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.55
    }
  }
});

export const activeFilterButton = style({
  background: tokens.color.brand,
  color: tokens.color.textOnAccent,
  selectors: { "&:hover": { background: tokens.color.brand } }
});

export const issueFilterButton = style({
  background: tokens.color.surfaceDangerStrong,
  color: tokens.color.textDanger
});

export const activeIssueFilterButton = style({
  background: tokens.color.danger,
  color: tokens.color.textOnAccent,
  selectors: { "&:hover": { background: tokens.color.danger } }
});

export const filterCount = style({
  marginLeft: tokens.space.x6,
  minWidth: 12,
  color: "currentColor",
  opacity: 0.72,
  fontVariantNumeric: "tabular-nums"
});

export const content = style({
  width: "100%",
  maxWidth: 1440,
  margin: "0 auto",
  padding: `0 ${tokens.space.x16} ${tokens.space.x56}`,
  "@media": {
    "(min-width: 640px)": { padding: `0 ${tokens.space.x24} ${tokens.space.x56}` },
    "(min-width: 1024px)": { padding: `0 ${tokens.space.x32} ${tokens.space.x56}` }
  }
});

export const surface = style({
  width: "100%",
  borderRadius: tokens.radius.xxxl,
  background: tokens.color.surfaceMuted,
  padding: tokens.space.x12,
  "@media": { "(min-width: 640px)": { padding: tokens.space.x16 } }
});

export const statusPanel = style({
  display: "flex",
  width: "100%",
  minHeight: 168,
  border: "1px solid transparent",
  borderRadius: tokens.radius.xxxl,
  background: tokens.color.surfaceMuted,
  padding: `${tokens.space.x40} ${tokens.space.x24}`,
  transition: `border ${tokens.motion.fast}, background ${tokens.motion.fast}`,
  "@media": { "(min-width: 640px)": { padding: `${tokens.space.x48} ${tokens.space.x32}` } }
});

export const dragStatusPanel = style({
  borderColor: tokens.color.brand,
  borderStyle: "dashed"
});

export const errorStatusPanel = style({
  background: tokens.color.surfaceDangerSoft
});

export const statusBody = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: tokens.space.x16,
  "@media": { "(min-width: 640px)": { flexDirection: "row", alignItems: "center" } }
});

export const statusIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  flexShrink: 0,
  borderRadius: tokens.radius.lg,
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent
});

export const statusIconError = style({
  background: tokens.color.surfaceDangerStrong,
  color: tokens.color.textDanger
});

export const spin = style({
  animation: "fitx-spin 1s linear infinite"
});

export const statusTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 24,
  fontWeight: 650,
  lineHeight: 1.18
});

export const statusCopy = style({
  margin: `${tokens.space.x8} 0 0`,
  maxWidth: 760,
  color: tokens.color.textSecondary,
  fontSize: 16,
  lineHeight: 1.7
});

export const progressRow = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x12,
  marginTop: tokens.space.x20,
  color: tokens.color.textTertiary,
  fontSize: 14,
  fontWeight: 600
});

export const progressTrack = style({
  width: 176,
  height: 6,
  overflow: "hidden",
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceAccent
});

export const progressFill = style({
  width: "66%",
  height: "100%",
  borderRadius: tokens.radius.pill,
  background: tokens.color.brand,
  animation: "fitx-spin 1.2s linear infinite"
});

export const messageStackItem = style({
  paddingBottom: tokens.space.x12
});

export const messageCard = style({
  border: `1px solid ${tokens.color.borderSubtle}`,
  borderRadius: tokens.radius.xxl,
  background: tokens.color.surface,
  padding: tokens.space.x16,
  boxShadow: tokens.color.shadowSoft,
  selectors: {
    '&[data-selected="true"]': {
      borderColor: tokens.color.borderAccent,
      background: tokens.color.surfaceEditorSoft,
      boxShadow: tokens.color.insetAccent,
    },
  },
  "@media": { "(min-width: 640px)": { padding: tokens.space.x20 } }
});

export const insertTargetCard = style({
  border: `1px dashed ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.xxl,
  background: tokens.color.surface,
  padding: tokens.space.x10,
  boxShadow: tokens.color.insetAccent,
  "@media": { "(min-width: 640px)": { padding: tokens.space.x12 } }
});

export const insertTargetButton = style({
  display: "flex",
  width: "100%",
  minHeight: 52,
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x16,
  border: 0,
  borderRadius: tokens.radius.xl,
  background: tokens.color.surfaceMuted,
  color: tokens.color.textAccent,
  padding: `${tokens.space.x14} ${tokens.space.x16}`,
  textAlign: "left",
  transition: `background ${tokens.motion.fast}, box-shadow ${tokens.motion.fast}, transform ${tokens.motion.fast}`,
  selectors: {
    "&:hover": {
      background: tokens.color.surfaceAccent
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: tokens.focus.brandStrong
    }
  }
});

export const insertTargetText = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x2,
  minWidth: 0
});

export const insertTargetLabel = style({
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.25
});

export const insertTargetHint = style({
  color: tokens.color.textTertiary,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.3
});

export const messageHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x16,
  marginBottom: tokens.space.x14
});

export const messageHeaderMain = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  minWidth: 0
});

export const messageHeaderActions = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  flexShrink: 0
});

export const messageSelectionControl = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceMuted,
  cursor: "pointer",
  selectors: {
    "&:focus-within": {
      boxShadow: tokens.focus.brandStrong,
    },
  },
});

export const messageSelectionInput = style({
  width: 24,
  height: 24,
  margin: 0,
  accentColor: tokens.color.brand,
  cursor: "pointer",
});

export const messageTitle = style({
  minWidth: 0,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: tokens.color.textPrimary,
  fontSize: 18,
  fontWeight: 650,
  lineHeight: 1.3
});

export const timestamp = style({
  color: tokens.color.textTertiary,
  fontSize: 14,
  fontWeight: 550
});

export const fieldGrid = style({
  display: "grid",
  margin: 0,
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: tokens.space.x8,
  "@media": {
    "(min-width: 640px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "(min-width: 960px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
    "(min-width: 1200px)": { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }
  }
});

export const fieldShell = style({
  minWidth: 0,
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.md,
  background: tokens.color.surface,
  padding: `${tokens.space.x8} ${tokens.space.x10}`
});

export const fieldLabel = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `${tokens.space.x2} ${tokens.space.x6}`,
  minHeight: 18,
  marginBottom: tokens.space.x4,
  color: tokens.color.textTertiary,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.35
});

export const fieldValue = style({
  minWidth: 0,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.45,
  fontVariantNumeric: "tabular-nums"
});

export const virtualList = style({
  position: "relative",
  width: "100%"
});

export const virtualRow = style({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%"
});

export const emptyResult = style({
  borderRadius: tokens.radius.xxl,
  background: tokens.color.surface,
  padding: `${tokens.space.x32} ${tokens.space.x20}`,
  color: tokens.color.textTertiary,
  textAlign: "center",
  fontSize: 14,
  fontWeight: 600
});

export const messageScroll = style({
  maxHeight: "calc(100vh - 184px)",
  overflow: "auto"
});

export const messageMenuContent = style({
  zIndex: 60,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surface,
  padding: tokens.space.x6,
  boxShadow: tokens.color.shadowMenu
});

export const messageMenuItem = style({
  borderRadius: tokens.radius.sm,
  padding: `${tokens.space.x8} ${tokens.space.x12}`,
  color: tokens.color.textTertiary,
  fontSize: 14
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: tokens.color.scrim,
  padding: `${tokens.space.x24} ${tokens.space.x16}`
});

export const dialogContent = style({
  position: "fixed",
  top: "50%",
  left: "50%",
  zIndex: 51,
  display: "flex",
  width: "100%",
  maxWidth: 720,
  maxHeight: "86vh",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: tokens.radius.xxxl,
  background: tokens.color.surface,
  boxShadow: tokens.color.shadowDialog,
  transform: "translate(-50%, -50%)"
});

export const dialogHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x16,
  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: `${tokens.space.x16} ${tokens.space.x20}`
});

export const dialogTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 20,
  fontWeight: 650
});

export const dialogBody = style({
  overflowY: "auto",
  padding: `${tokens.space.x16} ${tokens.space.x20}`
});

export const dialogFooter = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: tokens.space.x8,
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  padding: `${tokens.space.x16} ${tokens.space.x20}`,
  "@media": { "(min-width: 640px)": { flexDirection: "row", justifyContent: "flex-end" } }
});

export const issueItem = style({
  border: `1px solid ${tokens.color.borderSubtle}`,
  borderRadius: tokens.radius.xl,
  background: tokens.color.surface,
  padding: tokens.space.x16,
  boxShadow: tokens.color.insetAccent
});

export const issueList = style({
  display: "grid",
  gap: tokens.space.x8
});

export const issueTitle = style({
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 700
});

export const issueDescription = style({
  margin: `${tokens.space.x4} 0 0`,
  color: tokens.color.textSecondary,
  fontSize: 14,
  fontWeight: 550
});

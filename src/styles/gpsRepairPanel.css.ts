import { style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x12,
  border: `1px solid ${tokens.color.borderSubtle}`,
  borderRadius: tokens.radius.xxxl,
  background:
    "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 242, 250, 0.96))",
  boxShadow: tokens.color.shadowSoft,
  padding: tokens.space.x16,
  "@media": {
    "(min-width: 640px)": {
      padding: tokens.space.x20,
    },
  },
});

export const panelHeader = style({
  display: "flex",
  justifyContent: "flex-end",
  minWidth: 0,
});

export const panelHeaderSettings = style({
  flexShrink: 0,
});

export const fitMessagePanel = style({
  display: "grid",
  gap: tokens.space.x12,
  minWidth: 0,
  borderRadius: tokens.radius.xl,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surface,
  padding: tokens.space.x12,
});

export const fitMessagePanelFlat = style({
  borderRadius: 0,
  border: 0,
  background: "transparent",
  padding: tokens.space.x12,
  selectors: {
    "& + &": {
      borderTop: `1px solid ${tokens.color.borderSubtle}`,
    },
  },
});

export const messageGroupList = style({
  display: "grid",
  gap: tokens.space.x8,
  minWidth: 0,
});

export const messageGroup = style({
  display: "grid",
  minWidth: 0,
  borderRadius: tokens.radius.xl,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: "rgba(255, 255, 255, 0.58)",
  overflow: "hidden",
});

export const messageGroupSummary = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x12,
  minWidth: 0,
  padding: `${tokens.space.x10} ${tokens.space.x12}`,
  cursor: "pointer",
  listStyle: "none",
  color: tokens.color.textPrimary,
  selectors: {
    "&::-webkit-details-marker": {
      display: "none",
    },
    "&:hover": {
      background: tokens.color.surfaceAccentHover,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: tokens.focus.brandStrong,
    },
  },
});

export const messageGroupSummaryText = style({
  display: "flex",
  alignItems: "baseline",
  gap: tokens.space.x8,
  minWidth: 0,
  flexWrap: "wrap",
});

export const messageGroupTitle = style({
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.35,
});

export const messageGroupMeta = style({
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.35,
});

export const messageGroupChevron = style({
  flexShrink: 0,
  color: tokens.color.textTertiary,
  transition: `transform ${tokens.motion.fast}`,
  selectors: {
    [`${messageGroup}[open] &`]: {
      transform: "rotate(180deg)",
    },
  },
});

export const messageGroupBody = style({
  display: "grid",
  gap: 0,
  minWidth: 0,
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surface,
  padding: 0,
});

export const denseMessageTableShell = style({
  display: "grid",
  gap: tokens.space.x8,
  minWidth: 0,
  padding: tokens.space.x8,
});

export const denseMessageTableScroller = style({
  minWidth: 0,
  overflowX: "auto",
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.borderSubtle}`,
});

export const denseMessageTable = style({
  width: "100%",
  minWidth: 760,
  borderCollapse: "collapse",
  background: tokens.color.surface,
  fontSize: 12,
  lineHeight: 1.35,
});

export const denseMessageTableHead = style({
  position: "sticky",
  top: 0,
  background: tokens.color.surfaceMuted,
  color: tokens.color.textTertiary,
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
});

export const denseMessageTableCell = style({
  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
  padding: `${tokens.space.x6} ${tokens.space.x8}`,
  color: tokens.color.textPrimary,
  whiteSpace: "nowrap",
  verticalAlign: "top",
});

export const denseMessageTableMutedCell = style({
  color: tokens.color.textTertiary,
});

export const denseMessagePager = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 600,
});

export const denseMessagePagerActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
});

export const denseMessagePagerButton = style({
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surface,
  color: tokens.color.textPrimary,
  padding: `${tokens.space.x4} ${tokens.space.x10}`,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.2,
  selectors: {
    "&:hover:not(:disabled)": {
      background: tokens.color.surfaceAccentHover,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.55,
    },
  },
});

export const sessionHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: tokens.space.x12,
  minWidth: 0,
});

export const sessionTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 16,
  fontWeight: 750,
  lineHeight: 1.25,
});

export const sessionMetricGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: `${tokens.space.x14} ${tokens.space.x18}`,
  margin: 0,
  "@media": {
    "(max-width: 920px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "(max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const sessionMetric = style({
  display: "grid",
  gap: tokens.space.x4,
  minWidth: 0,
});

export const sessionMetricLabel = style({
  color: tokens.color.textTertiary,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.25,
});

export const sessionMetricValue = style({
  display: "grid",
  gap: tokens.space.x4,
  margin: 0,
  minWidth: 0,
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.3,
  overflowWrap: "anywhere",
});

export const sessionFields = style({
  display: "grid",
  gap: tokens.space.x8,
  minWidth: 0,
});

export const sessionFieldsSummary = style({
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 22,
  cursor: "pointer",
  listStyle: "none",
  borderRadius: tokens.radius.md,
  color: tokens.color.textSecondary,
  selectors: {
    "&::-webkit-details-marker": {
      display: "none",
    },
    "&:hover": {
      background: tokens.color.surfaceAccentHover,
      color: tokens.color.textPrimary,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: tokens.focus.brandStrong,
    },
  },
});

export const sessionFieldsBody = style({
  display: "grid",
  gap: tokens.space.x10,
  minWidth: 0,
});

export const sessionFieldsChevron = style({
  flexShrink: 0,
  color: tokens.color.textTertiary,
  transition: `transform ${tokens.motion.fast}`,
  selectors: {
    [`${sessionFields}[open] &`]: {
      transform: "rotate(180deg)",
    },
  },
});

export const activitySummary = style({
  display: "grid",
  gap: tokens.space.x16,
  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
  paddingBottom: tokens.space.x16,
  "@media": {
    "(min-width: 760px)": {
      gridTemplateColumns: "minmax(180px, 0.8fr) minmax(0, 1.6fr)",
      alignItems: "end",
    },
  },
});

export const activitySummaryIdentity = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: tokens.space.x8,
  minWidth: 0,
});

export const activitySummaryTitle = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: tokens.space.x8,
  margin: 0,
  minWidth: 0,
  color: tokens.color.textPrimary,
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.16,
  textAlign: "left",
  overflowWrap: "anywhere",
});

export const activitySummaryIcon = style({
  flexShrink: 0,
  color: tokens.color.textSecondary,
});

export const activitySummaryGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: tokens.space.x12,
  margin: 0,
  "@media": {
    "(max-width: 639px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const activitySummaryMetric = style({
  display: "grid",
  gap: tokens.space.x4,
  minWidth: 0,
});

export const activitySummaryMetricLabel = style({
  color: tokens.color.textTertiary,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.3,
});

export const activitySummaryMetricValue = style({
  margin: 0,
  minWidth: 0,
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 650,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
});

export const activitySummaryMetricStack = style({
  display: "grid",
  gap: tokens.space.x4,
  margin: 0,
  minWidth: 0,
});

export const activitySummarySubMetric = style({
  display: "flex",
  alignItems: "baseline",
  gap: tokens.space.x6,
  flexWrap: "wrap",
  minWidth: 0,
});

export const activitySummarySubMetricLabel = style({
  color: tokens.color.textTertiary,
  fontSize: 11,
  fontWeight: 650,
  lineHeight: 1.3,
});

export const activitySummarySubMetricValue = style({
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const activitySummaryInlineButton = style({
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surface,
  color: tokens.color.textSecondary,
  padding: `${tokens.space.x2} ${tokens.space.x8}`,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.2,
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: tokens.color.brand,
      color: tokens.color.brand,
      background: tokens.color.surfaceAccentHover,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: tokens.focus.brandStrong,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.6,
    },
  },
});

export const activitySummaryValueDelta = style({
  display: "inline-flex",
  marginLeft: tokens.space.x6,
  borderRadius: tokens.radius.pill,
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning,
  padding: `${tokens.space.x2} ${tokens.space.x6}`,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.2,
});

export const activitySummaryData = style({
  display: "grid",
  gridColumn: "1 / -1",
  gap: tokens.space.x10,
  minWidth: 0,
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  paddingTop: tokens.space.x14,
});

export const activitySummaryDataHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: tokens.space.x10,
  flexWrap: "wrap",
  minWidth: 0,
});

export const activitySummaryMoreFields = style({
  display: "grid",
  gridColumn: "1 / -1",
  gap: tokens.space.x10,
  minWidth: 0,
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  paddingTop: tokens.space.x12,
});

export const activitySummaryMoreFieldsSummary = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x12,
  minWidth: 0,
  cursor: "pointer",
  listStyle: "none",
  selectors: {
    "&::-webkit-details-marker": {
      display: "none",
    },
    "&:focus-visible": {
      outline: 0,
      borderRadius: tokens.radius.md,
      boxShadow: tokens.focus.brandStrong,
    },
  },
});

export const activitySummaryMoreFieldsText = style({
  display: "inline-flex",
  alignItems: "baseline",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  minWidth: 0,
});

export const activitySummaryMoreFieldsBody = style({
  display: "grid",
  gap: tokens.space.x10,
  minWidth: 0,
});

export const activitySummaryMoreFieldsChevron = style({
  flexShrink: 0,
  color: tokens.color.textTertiary,
  transition: `transform ${tokens.motion.fast}`,
  selectors: {
    [`${activitySummaryMoreFields}[open] &`]: {
      transform: "rotate(180deg)",
    },
  },
});

export const settingsMenuContent = style({
  zIndex: 60,
  minWidth: 228,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surface,
  padding: tokens.space.x6,
  boxShadow: tokens.color.shadowMenu,
});

export const settingsMenuItem = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  borderRadius: tokens.radius.sm,
  color: tokens.color.textSecondary,
  padding: `${tokens.space.x8} ${tokens.space.x12}`,
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.3,
  selectors: {
    "&[data-highlighted]": {
      outline: 0,
      background: tokens.color.surfaceAccentHover,
      color: tokens.color.textPrimary,
    },
  },
});

export const settingsMenuIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  flexShrink: 0,
  color: tokens.color.brand,
});

export const workspace = style({
  display: "grid",
  gap: tokens.space.x16,
  gridTemplateColumns: "minmax(0, 1fr)",
  alignItems: "start",
});

export const mapColumn = style({
  display: "grid",
  gap: tokens.space.x12,
  minWidth: 0,
});

export const mapShell = style({
  position: "relative",
  minHeight: 640,
  overflow: "hidden",
  borderRadius: tokens.radius.xxl,
  border: `1px solid ${tokens.color.borderDefault}`,
  background:
    "linear-gradient(135deg, rgba(103, 80, 164, 0.12), rgba(255, 255, 255, 0.96) 44%, rgba(234, 221, 255, 0.8))",
  boxShadow: tokens.color.shadowSoft,
});

export const mapCanvas = style({
  position: "absolute",
  inset: 0,
});

export const mapSvgOverlay = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
});

export const mapSvgRouteGap = style({
  fill: "none",
  stroke: "transparent",
  strokeWidth: 16,
  strokeDasharray: "8 7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  pointerEvents: "stroke",
});

export const mapSvgRouteFixed = style({
  fill: "none",
  stroke: "transparent",
  strokeWidth: 16,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const mapToolBar = style({
  position: "absolute",
  top: tokens.space.x12,
  left: tokens.space.x12,
  right: tokens.space.x12,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  gap: tokens.space.x10,
  pointerEvents: "none",
});

export const mapToolGroup = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  pointerEvents: "auto",
});

export const mapToolButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.pill,
  background: "rgba(255, 255, 255, 0.9)",
  color: tokens.color.textPrimary,
  padding: `${tokens.space.x7} ${tokens.space.x12}`,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  boxShadow: tokens.color.shadowSoft,
  backdropFilter: "blur(8px)",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: tokens.color.brand,
      background: tokens.color.surfaceAccentHover,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: `${tokens.color.shadowSoft}, ${tokens.focus.brandStrong}`,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.65,
    },
  },
});

export const mapToolButtonActive = style({
  borderColor: tokens.color.brand,
  background: tokens.color.surfaceAccent,
  color: tokens.color.brand,
});

export const eraseSelectionPanel = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  maxWidth: "min(100%, 520px)",
  border: `1px solid ${tokens.color.borderDefault}`,
  borderRadius: tokens.radius.xl,
  background: "rgba(255, 255, 255, 0.92)",
  color: tokens.color.textPrimary,
  padding: tokens.space.x8,
  boxShadow: tokens.color.shadowSoft,
  backdropFilter: "blur(8px)",
  pointerEvents: "auto",
});

export const eraseSelectionText = style({
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const eraseSelectionActions = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x6,
});

export const mapLegend = style({
  position: "absolute",
  right: tokens.space.x12,
  bottom: tokens.space.x12,
  left: tokens.space.x12,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const mapLegendItem = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x4} ${tokens.space.x8}`,
  background: "rgba(255, 255, 255, 0.84)",
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 650,
  backdropFilter: "blur(8px)",
});

export const mapLegendMarker = style({
  width: 16,
  height: 0,
  borderTopWidth: 3,
  borderTopStyle: "solid",
  borderTopColor: "currentColor",
  flexShrink: 0,
});

export const mapLegendMarkerKnown = style({
  color: "#6750a4",
});

export const mapLegendMarkerMissing = style({
  color: "#ba1a1a",
  borderTopStyle: "dashed",
});

export const mapLegendMarkerFixed = style({
  color: tokens.color.textAccent,
});

export const mapLegendLabel = style({
  fontSize: 11,
  fontWeight: 650,
  lineHeight: 1.2,
});

export const dataSection = style({
  display: "grid",
  gap: tokens.space.x8,
  minWidth: 0,
});

export const dataPanel = style({
  display: "grid",
  gap: tokens.space.x8,
  minWidth: 0,
  borderRadius: tokens.radius.xl,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surface,
  padding: tokens.space.x12,
});

export const dataPanelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x12,
  flexWrap: "wrap",
});

export const dataPanelHeaderText = style({
  display: "grid",
  gap: tokens.space.x2,
  minWidth: 0,
});

export const dataSegmentedControl = style({
  display: "inline-grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  alignItems: "center",
  gap: tokens.space.x2,
  minWidth: 220,
  borderRadius: tokens.radius.pill,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: tokens.space.x2,
});

export const dataSegmentButton = style({
  border: 0,
  borderRadius: tokens.radius.pill,
  background: "transparent",
  color: tokens.color.textSecondary,
  padding: `${tokens.space.x7} ${tokens.space.x12}`,
  fontSize: 12,
  fontWeight: 750,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  selectors: {
    "&:hover": {
      color: tokens.color.textPrimary,
      background: tokens.color.surfaceAccentHover,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: tokens.focus.brand,
    },
  },
});

export const dataSegmentButtonActive = style({
  background: tokens.color.surface,
  color: tokens.color.textAccent,
  boxShadow: tokens.color.shadowSoft,
});

export const dataActionButton = style({
  border: 0,
  borderRadius: tokens.radius.pill,
  background: tokens.color.brand,
  color: tokens.color.textOnAccent,
  padding: `${tokens.space.x7} ${tokens.space.x14}`,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.2,
  boxShadow: tokens.color.shadowButton,
  selectors: {
    "&:hover:not(:disabled)": {
      background: tokens.color.brandHover,
    },
    "&:focus-visible": {
      outline: 0,
      boxShadow: `${tokens.color.shadowButton}, ${tokens.focus.brandStrong}`,
    },
    "&:disabled": {
      cursor: "not-allowed",
      boxShadow: "none",
      opacity: 0.65,
    },
  },
});

export const dataRowHeader = style({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: tokens.space.x10,
  flexWrap: "wrap",
});

export const dataRowTitle = style({
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35,
});

export const dataRowMeta = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
  flexWrap: "wrap",
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const detailColumn = style({
  display: "grid",
  gap: tokens.space.x12,
  minWidth: 0,
  gridTemplateColumns: "minmax(260px, 0.8fr) minmax(320px, 1.2fr)",
  "@media": {
    "(max-width: 799px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const detailDisclosure = style({
  display: "grid",
  gap: tokens.space.x12,
  borderRadius: tokens.radius.xxl,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: tokens.space.x12,
});

export const detailDisclosureTrigger = style({
  display: "flex",
  alignItems: "center",
  gap: tokens.space.x12,
  width: "100%",
  border: 0,
  background: "transparent",
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 650,
  textAlign: "left",
});

export const detailDisclosureTriggerMeta = style({
  marginLeft: "auto",
  color: tokens.color.textSecondary,
  fontSize: 13,
  fontWeight: 600,
});

export const detailDisclosureBody = style({
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  paddingTop: tokens.space.x12,
});

export const emptyState = style({
  borderRadius: tokens.radius.xl,
  border: `1px dashed ${tokens.color.borderDefault}`,
  background: tokens.color.surface,
  padding: `${tokens.space.x16} ${tokens.space.x14}`,
  color: tokens.color.textSecondary,
  textAlign: "center",
  fontSize: 13,
  lineHeight: 1.45,
});

export const sectionTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const metricPill = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x4} ${tokens.space.x10}`,
  background: tokens.color.surface,
  color: tokens.color.textSecondary,
  border: `1px solid ${tokens.color.borderDefault}`,
  fontSize: 12,
  fontWeight: 650,
});

export const list = style({
  display: "grid",
  gap: tokens.space.x8,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const listItemButton = style({
  width: "100%",
  display: "grid",
  gap: tokens.space.x8,
  textAlign: "left",
  borderRadius: tokens.radius.xl,
  border: `1px solid ${tokens.color.borderDefault}`,
  background: tokens.color.surface,
  padding: tokens.space.x12,
  color: tokens.color.textPrimary,
  transition: `border-color ${tokens.motion.fast}, background ${tokens.motion.fast}, box-shadow ${tokens.motion.fast}`,
  selectors: {
    "&:hover": {
      borderColor: tokens.color.brand,
      background: tokens.color.surfaceAccentHover,
    },
  },
});

export const listItemButtonSelected = style({
  borderColor: tokens.color.brand,
  background: tokens.color.surfaceAccent,
  boxShadow: tokens.color.insetAccent,
});

export const listItemHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x8,
  flexWrap: "wrap",
});

export const listItemTitle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
  minWidth: 0,
  color: tokens.color.textPrimary,
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const listItemMeta = style({
  color: tokens.color.textSecondary,
  fontSize: 12,
  lineHeight: 1.35,
});

export const selectedSpanScroll = style({
  maxHeight: "min(48vh, 360px)",
  overflow: "auto",
  paddingRight: tokens.space.x4,
});

export const selectedSpanList = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const missingItem = style({
  display: "grid",
  gap: tokens.space.x4,
  borderRadius: tokens.radius.lg,
  border: `1px solid ${tokens.color.borderDefault}`,
  background: tokens.color.surface,
  padding: tokens.space.x10,
});

export const missingItemHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: tokens.space.x8,
  flexWrap: "wrap",
});

export const missingItemTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const missingItemMeta = style({
  color: tokens.color.textSecondary,
  fontSize: 12,
  lineHeight: 1.35,
});

export const missingFlags = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x6,
});

export const missingFlag = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x2} ${tokens.space.x8}`,
  background: tokens.color.surfaceDangerStrong,
  color: tokens.color.textDanger,
  fontSize: 11,
  fontWeight: 650,
});

export const missingFlagMuted = style({
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning,
});

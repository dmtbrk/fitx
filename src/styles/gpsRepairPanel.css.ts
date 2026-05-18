import { style } from "@vanilla-extract/css";
import { tokens } from "./tokens.css";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.x16,
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

export const hidden = style({
  display: "none",
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: tokens.space.x12,
  flexWrap: "wrap",
});

export const titleWrap = style({
  minWidth: 0,
  display: "grid",
  gap: tokens.space.x4,
});

export const title = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 20,
  fontWeight: 650,
  lineHeight: 1.2,
});

export const headerCopy = style({
  margin: 0,
  color: tokens.color.textSecondary,
  fontSize: 14,
  lineHeight: 1.5,
  maxWidth: 720,
});

export const headerMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8,
  alignItems: "center",
  color: tokens.color.textSecondary,
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.35,
});

export const statusPill = style({
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.x6,
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x4} ${tokens.space.x10}`,
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent,
});

export const statusPillBusy = style({
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning,
});

export const statusPillError = style({
  background: tokens.color.surfaceDangerStrong,
  color: tokens.color.textDanger,
});

export const headerActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8,
  alignItems: "center",
  marginLeft: "auto",
});

export const stateBanner = style({
  borderRadius: tokens.radius.xl,
  padding: `${tokens.space.x12} ${tokens.space.x14}`,
  fontSize: 14,
  lineHeight: 1.5,
});

export const stateBannerLoading = style({
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning,
});

export const stateBannerError = style({
  background: tokens.color.surfaceDangerSoft,
  color: tokens.color.textDangerStrong,
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

export const mapBadgeRow = style({
  position: "absolute",
  top: tokens.space.x12,
  left: tokens.space.x12,
  right: tokens.space.x12,
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8,
  alignItems: "center",
});

export const mapBadge = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: tokens.radius.pill,
  padding: `${tokens.space.x4} ${tokens.space.x10}`,
  background: "rgba(255, 255, 255, 0.84)",
  color: tokens.color.textSecondary,
  fontSize: 12,
  fontWeight: 650,
  backdropFilter: "blur(8px)",
});

export const mapBadgeAccent = style({
  background: tokens.color.surfaceAccent,
  color: tokens.color.textAccent,
});

export const mapBadgeWarning = style({
  background: tokens.color.surfaceWarning,
  color: tokens.color.textWarning,
});

export const mapFootnote = style({
  position: "absolute",
  right: tokens.space.x12,
  bottom: tokens.space.x12,
  left: tokens.space.x12,
  display: "flex",
  justifyContent: "space-between",
  gap: tokens.space.x8,
  flexWrap: "wrap",
  color: tokens.color.textTertiary,
  fontSize: 12,
  fontWeight: 600,
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

export const card = style({
  display: "grid",
  gap: tokens.space.x12,
  borderRadius: tokens.radius.xxl,
  border: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: tokens.space.x14,
});

export const sectionTitle = style({
  margin: 0,
  color: tokens.color.textPrimary,
  fontSize: 15,
  fontWeight: 650,
  lineHeight: 1.35,
});

export const sectionCopy = style({
  margin: 0,
  color: tokens.color.textSecondary,
  fontSize: 13,
  lineHeight: 1.45,
});

export const metricsRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8,
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

export const missingList = style({
  display: "grid",
  gap: tokens.space.x8,
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

export const footer = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: tokens.space.x12,
  flexWrap: "wrap",
  borderTop: `1px solid ${tokens.color.borderSubtle}`,
  paddingTop: tokens.space.x14,
});

export const footerCopy = style({
  margin: 0,
  color: tokens.color.textTertiary,
  fontSize: 12,
  lineHeight: 1.45,
});

export const footerActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: tokens.space.x8,
  marginLeft: "auto",
  justifyContent: "flex-end",
});

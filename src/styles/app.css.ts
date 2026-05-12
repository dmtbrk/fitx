import { globalKeyframes, style } from "@vanilla-extract/css";

globalKeyframes("fitx-spin", {
  to: { transform: "rotate(360deg)" }
});

export const app = style({
  minHeight: "100vh",
  background: "#fffbfe",
  color: "#1d1b20"
});

export const topbar = style({
  display: "flex",
  alignItems: "center",
  gap: 16,
  width: "100%",
  maxWidth: 1152,
  margin: "0 auto",
  padding: "20px 16px",
  "@media": {
    "(min-width: 640px)": { padding: "20px 24px" },
    "(min-width: 1024px)": { padding: "20px 32px" }
  }
});

export const brandGroup = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
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
  borderRadius: 16,
  background: "#eaddff",
  color: "#4f378b"
});

export const title = style({
  margin: 0,
  flexShrink: 0,
  color: "#1d1b20",
  fontSize: 24,
  fontWeight: 650,
  lineHeight: 1.1
});

export const divider = style({
  display: "none",
  width: 1,
  height: 24,
  flexShrink: 0,
  background: "#cac4d0",
  "@media": { "(min-width: 640px)": { display: "block" } }
});

export const headerText = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#1d1b20",
  fontSize: 15,
  fontWeight: 600
});

export const mutedHeaderText = style({
  display: "none",
  flexShrink: 0,
  color: "#49454f",
  fontSize: 14,
  "@media": { "(min-width: 640px)": { display: "inline" } }
});

export const headerActions = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0
});

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  borderRadius: 999,
  border: "1px solid transparent",
  padding: "9px 16px",
  fontSize: 14,
  fontWeight: 650,
  transition: "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease"
});

export const primaryButton = style([
  button,
  {
    background: "#6750a4",
    color: "#fff",
    boxShadow: "0 1px 2px rgba(29, 27, 32, 0.12)",
    selectors: { "&:hover": { background: "#5b4698" } }
  }
]);

export const secondaryButton = style([
  button,
  {
    borderColor: "#79747e",
    background: "transparent",
    color: "#6750a4",
    selectors: { "&:hover": { background: "#f3edf7" } }
  }
]);

export const dangerButton = style([
  button,
  {
    background: "#ba1a1a",
    color: "#fff",
    selectors: { "&:hover": { background: "#9f1515" } }
  }
]);

export const iconOnlyButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  border: "1px solid transparent",
  borderRadius: 999,
  background: "transparent",
  color: "#6750a4",
  transition: "background 140ms ease",
  selectors: { "&:hover": { background: "#f3edf7" } }
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
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  "@media": { "(min-width: 640px)": { display: "inline-flex" } }
});

export const issuePill = style([
  pill,
  {
    background: "#ffdad6",
    color: "#ba1a1a",
    selectors: { "&:hover": { background: "#f9c7c1" } }
  }
]);

export const editPill = style([
  pill,
  {
    background: "#eaddff",
    color: "#4f378b"
  }
]);

export const filterWrap = style({
  width: "100%",
  maxWidth: 1152,
  margin: "0 auto",
  padding: "0 16px 12px",
  "@media": {
    "(min-width: 640px)": { padding: "0 24px 12px" },
    "(min-width: 1024px)": { padding: "0 32px 12px" }
  }
});

export const filterBar = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  borderRadius: 24,
  background: "#f7f2fa",
  padding: 8
});

export const filterButton = style({
  flexShrink: 0,
  minHeight: 36,
  border: 0,
  borderRadius: 999,
  padding: "7px 12px",
  background: "#fffbfe",
  color: "#49454f",
  fontSize: 14,
  fontWeight: 650,
  transition: "background 140ms ease, color 140ms ease",
  selectors: { "&:hover": { background: "#eaddff" } }
});

export const activeFilterButton = style({
  background: "#6750a4",
  color: "#fff",
  selectors: { "&:hover": { background: "#6750a4" } }
});

export const issueFilterButton = style({
  background: "#ffdad6",
  color: "#ba1a1a"
});

export const activeIssueFilterButton = style({
  background: "#ba1a1a",
  color: "#fff",
  selectors: { "&:hover": { background: "#ba1a1a" } }
});

export const filterCount = style({
  marginLeft: 6,
  minWidth: 12,
  color: "currentColor",
  opacity: 0.72,
  fontVariantNumeric: "tabular-nums"
});

export const content = style({
  width: "100%",
  maxWidth: 1152,
  margin: "0 auto",
  padding: "0 16px 56px",
  "@media": {
    "(min-width: 640px)": { padding: "0 24px 56px" },
    "(min-width: 1024px)": { padding: "0 32px 56px" }
  }
});

export const surface = style({
  width: "100%",
  borderRadius: 28,
  background: "#f7f2fa",
  padding: 12,
  "@media": { "(min-width: 640px)": { padding: 16 } }
});

export const statusPanel = style({
  display: "flex",
  width: "100%",
  minHeight: 168,
  border: "1px solid transparent",
  borderRadius: 28,
  background: "#f7f2fa",
  padding: "40px 24px",
  transition: "border 140ms ease, background 140ms ease",
  "@media": { "(min-width: 640px)": { padding: "48px 32px" } }
});

export const dragStatusPanel = style({
  borderColor: "#6750a4",
  borderStyle: "dashed"
});

export const errorStatusPanel = style({
  background: "#fceeee"
});

export const statusBody = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 16,
  "@media": { "(min-width: 640px)": { flexDirection: "row", alignItems: "center" } }
});

export const statusIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  flexShrink: 0,
  borderRadius: 16,
  background: "#eaddff",
  color: "#4f378b"
});

export const statusIconError = style({
  background: "#ffdad6",
  color: "#ba1a1a"
});

export const spin = style({
  animation: "fitx-spin 1s linear infinite"
});

export const statusTitle = style({
  margin: 0,
  color: "#1d1b20",
  fontSize: 24,
  fontWeight: 650,
  lineHeight: 1.18
});

export const statusCopy = style({
  margin: "8px 0 0",
  maxWidth: 760,
  color: "#49454f",
  fontSize: 16,
  lineHeight: 1.7
});

export const progressRow = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 20,
  color: "#79747e",
  fontSize: 14,
  fontWeight: 600
});

export const progressTrack = style({
  width: 176,
  height: 6,
  overflow: "hidden",
  borderRadius: 999,
  background: "#eaddff"
});

export const progressFill = style({
  width: "66%",
  height: "100%",
  borderRadius: 999,
  background: "#6750a4",
  animation: "fitx-spin 1.2s linear infinite"
});

export const messageStack = style({
  display: "grid",
  gap: 12
});

export const messageCard = style({
  border: "1px solid #e7e0ec",
  borderRadius: 24,
  background: "#fffbfe",
  padding: 16,
  boxShadow: "0 1px 2px rgba(29, 27, 32, 0.05)",
  "@media": { "(min-width: 640px)": { padding: 20 } }
});

export const insertTargetCard = style({
  border: "1px dashed #cac4d0",
  borderRadius: 24,
  background: "#fffbfe",
  padding: 10,
  boxShadow: "inset 3px 0 0 #eaddff",
  "@media": { "(min-width: 640px)": { padding: 12 } }
});

export const insertTargetButton = style({
  display: "flex",
  width: "100%",
  minHeight: 52,
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  border: 0,
  borderRadius: 18,
  background: "#f7f2fa",
  color: "#4f378b",
  padding: "14px 16px",
  textAlign: "left",
  transition: "background 140ms ease, box-shadow 140ms ease, transform 140ms ease",
  selectors: {
    "&:hover": {
      background: "#eaddff"
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 3px rgba(103, 80, 164, 0.16)"
    }
  }
});

export const insertTargetText = style({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0
});

export const insertTargetLabel = style({
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.25
});

export const insertTargetHint = style({
  color: "#79747e",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.3
});

export const messageHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14
});

export const messageTitle = style({
  minWidth: 0,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#1d1b20",
  fontSize: 18,
  fontWeight: 650,
  lineHeight: 1.3
});

export const timestamp = style({
  color: "#79747e",
  fontSize: 14,
  fontWeight: 550
});

export const fieldGrid = style({
  display: "grid",
  margin: 0,
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 8,
  "@media": {
    "(min-width: 640px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "(min-width: 960px)": { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
    "(min-width: 1200px)": { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }
  }
});

export const fieldShell = style({
  minWidth: 0,
  border: "1px solid #cac4d0",
  borderRadius: 14,
  background: "#fffbfe",
  padding: "8px 10px"
});

export const fieldLabel = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2px 6px",
  minHeight: 18,
  marginBottom: 4,
  color: "#79747e",
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.35
});

export const fieldValue = style({
  minWidth: 0,
  margin: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#1d1b20",
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
  borderRadius: 24,
  background: "#fffbfe",
  padding: "32px 20px",
  color: "#79747e",
  textAlign: "center",
  fontSize: 14,
  fontWeight: 600
});

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(29, 27, 32, 0.28)",
  padding: "24px 16px"
});

export const dialogContent = style({
  display: "flex",
  width: "100%",
  maxWidth: 720,
  maxHeight: "86vh",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 28,
  background: "#fffbfe",
  boxShadow: "0 24px 64px rgba(29, 27, 32, 0.24)"
});

export const dialogHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  borderBottom: "1px solid #e7e0ec",
  background: "#f7f2fa",
  padding: "16px 20px"
});

export const dialogTitle = style({
  margin: 0,
  color: "#1d1b20",
  fontSize: 20,
  fontWeight: 650
});

export const dialogBody = style({
  overflowY: "auto",
  padding: "16px 20px"
});

export const dialogFooter = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: 8,
  borderTop: "1px solid #e7e0ec",
  padding: "16px 20px",
  "@media": { "(min-width: 640px)": { flexDirection: "row", justifyContent: "flex-end" } }
});

export const issueItem = style({
  border: "1px solid #e7e0ec",
  borderRadius: 18,
  background: "#fffbfe",
  padding: 16,
  boxShadow: "inset 3px 0 0 #eaddff"
});

export const issueList = style({
  display: "grid",
  gap: 8
});

export const issueTitle = style({
  color: "#1d1b20",
  fontSize: 14,
  fontWeight: 700
});

export const issueDescription = style({
  margin: "4px 0 0",
  color: "#49454f",
  fontSize: 14,
  fontWeight: 550
});

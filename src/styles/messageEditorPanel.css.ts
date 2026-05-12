import { style } from "@vanilla-extract/css";

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(29, 27, 32, 0.28)",
  padding: 16,
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
  border: "1px solid #e7e0ec",
  borderRadius: 28,
  background: "#fffbfe",
  boxShadow: "0 24px 64px rgba(29, 27, 32, 0.24)",
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
  gap: 12,
  borderBottom: "1px solid #e7e0ec",
  background: "#f7f2fa",
  padding: "16px 20px",
  "@media": {
    "(min-width: 640px)": {
      padding: "18px 24px"
    }
  }
});

export const headerRow = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16
});

export const titleWrap = style({
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4
});

export const title = style({
  margin: 0,
  color: "#1d1b20",
  fontSize: 20,
  fontWeight: 650,
  lineHeight: 1.2
});

export const titleMeta = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  color: "#49454f",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4
});

export const titleMetaPill = style({
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  background: "#eaddff",
  color: "#4f378b",
  padding: "4px 10px"
});

export const description = style({
  margin: 0,
  color: "#49454f",
  fontSize: 14,
  lineHeight: 1.55
});

export const body = style({
  flex: 1,
  overflowY: "auto",
  padding: 16,
  "@media": {
    "(min-width: 640px)": {
      padding: 20
    }
  }
});

export const bodyStack = style({
  display: "grid",
  gap: 14
});

export const form = style({
  display: "flex",
  flex: 1,
  minHeight: 0,
  flexDirection: "column"
});

export const warningBanner = style({
  border: "1px solid #f2c1bc",
  borderRadius: 18,
  background: "#fff4f3",
  color: "#7d1d1d",
  padding: "12px 14px",
  fontSize: 14,
  lineHeight: 1.5
});

export const emptyState = style({
  borderRadius: 24,
  background: "#f7f2fa",
  padding: "28px 20px",
  color: "#79747e",
  textAlign: "center",
  fontSize: 14,
  fontWeight: 600
});

export const fieldList = style({
  display: "grid",
  gap: 12
});

export const fieldShell = style({
  minWidth: 0,
  border: "1px solid #cac4d0",
  borderRadius: 18,
  background: "#fffbfe",
  padding: 12,
  transition: "border-color 140ms ease, background 140ms ease, box-shadow 140ms ease"
});

export const fieldEdited = style({
  borderColor: "#e0d5f4",
  boxShadow: "inset 3px 0 0 #eaddff"
});

export const fieldInvalid = style({
  borderColor: "#ba1a1a",
  background: "#fff8f7"
});

export const fieldHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "6px 12px",
  marginBottom: 10
});

export const fieldLabel = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4px 6px",
  minWidth: 0,
  color: "#49454f",
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.35
});

export const fieldLabelName = style({
  color: "#1d1b20"
});

export const fieldMeta = style({
  color: "#79747e",
  fontWeight: 600
});

export const issueList = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  justifyContent: "flex-end"
});

export const issuePill = style({
  borderRadius: 999,
  background: "#ffdad6",
  color: "#ba1a1a",
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 650,
  lineHeight: 1.2
});

export const issuePillWarning = style({
  background: "#fff1d6",
  color: "#7a5200"
});

export const issuePillBlocking = style({
  background: "#ffd7d5",
  color: "#a61b1b"
});

export const valueStack = style({
  display: "grid",
  gap: 8
});

export const valueInput = style({
  width: "100%",
  minWidth: 0,
  border: "1px solid #cac4d0",
  borderRadius: 14,
  background: "#fffbfe",
  color: "#1d1b20",
  padding: "11px 12px",
  fontSize: 14,
  lineHeight: 1.45,
  fontVariantNumeric: "tabular-nums",
  transition: "border-color 140ms ease, background 140ms ease, box-shadow 140ms ease",
  selectors: {
    "&::placeholder": {
      color: "#b7b0bb"
    },
    "&:focus": {
      borderColor: "#6750a4",
      boxShadow: "0 0 0 3px rgba(103, 80, 164, 0.14)",
      outline: "none"
    }
  }
});

export const valueInputEdited = style({
  borderColor: "#e0d5f4",
  background: "#fdf7ff"
});

export const valueInputInvalid = style({
  borderColor: "#ba1a1a",
  background: "#fff8f7",
  color: "#7d1d1d",
  selectors: {
    "&:focus": {
      borderColor: "#ba1a1a",
      boxShadow: "0 0 0 3px rgba(186, 26, 26, 0.14)"
    }
  }
});

export const addFieldShell = style({
  background: "#faf5ff"
});

export const addFieldGrid = style({
  display: "grid",
  gap: 8,
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
  marginTop: 10
});

export const footer = style({
  display: "flex",
  flexDirection: "column-reverse",
  gap: 8,
  borderTop: "1px solid #e7e0ec",
  padding: 16,
  "@media": {
    "(min-width: 640px)": {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: "16px 20px"
    }
  }
});

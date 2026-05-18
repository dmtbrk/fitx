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
      padding: 0,
    },
  },
});

export const content = style({
  position: "fixed",
  left: "50%",
  top: "50%",
  zIndex: 51,
  display: "flex",
  width: "min(1240px, calc(100vw - 32px))",
  height: "min(92vh, 980px)",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${tokens.color.borderSubtle}`,
  borderRadius: tokens.radius.xxxl,
  background: tokens.color.surface,
  boxShadow: tokens.color.shadowDialog,
  outline: "none",
  transform: "translate(-50%, -50%)",
  "@media": {
    "(max-width: 639px)": {
      left: 0,
      top: 0,
      width: "100vw",
      height: "100dvh",
      transform: "none",
      border: 0,
      borderRadius: 0,
    },
  },
});

export const shell = style({
  display: "flex",
  minHeight: 0,
  flex: 1,
  flexDirection: "column",
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: tokens.space.x16,
  borderBottom: `1px solid ${tokens.color.borderSubtle}`,
  background: tokens.color.surfaceMuted,
  padding: `${tokens.space.x16} ${tokens.space.x20}`,
  "@media": {
    "(min-width: 640px)": {
      padding: `${tokens.space.x18} ${tokens.space.x24}`,
    },
  },
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

export const description = style({
  margin: 0,
  maxWidth: 760,
  color: tokens.color.textSecondary,
  fontSize: 14,
  lineHeight: 1.55,
});

export const headerActions = style({
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  gap: tokens.space.x8,
});

export const body = style({
  display: "flex",
  minHeight: 0,
  flex: 1,
  flexDirection: "column",
  gap: tokens.space.x14,
  overflow: "hidden",
  padding: tokens.space.x16,
  "@media": {
    "(min-width: 640px)": {
      padding: tokens.space.x20,
    },
  },
});

export const toolbarRegion = style({
  flex: "0 0 auto",
});

export const streamRegion = style({
  minHeight: 0,
  flex: 1,
  overflow: "hidden",
});

/** CRT tri-color tokens. Keep hex in sync with :root fallbacks in app/globals.css. */
export const PALETTE = {
  ink: "#0c100d",
  phosphor: "#9ade6c",
  amber: "#e6a23c",
  felt: "#17351c",
  feltMid: "#0f1c12",
  feltDeep: "#0a120c",
  bezel: "#1c2a1e",
  bezelOuter: "#0e130f",
  crtDim: "#5d7a52",
  crtLine: "#314833",
  halo: "#efe6d0",
} as const;

export const TOKEN = {
  ink: "var(--ink)",
  phosphor: "var(--phosphor)",
  amber: "var(--amber)",
  felt: "var(--felt)",
} as const;

export const PALETTE_CSS_VARS = {
  "--ink": PALETTE.ink,
  "--phosphor": PALETTE.phosphor,
  "--amber": PALETTE.amber,
  "--felt": PALETTE.felt,
  "--felt-mid": PALETTE.feltMid,
  "--felt-deep": PALETTE.feltDeep,
  "--bezel": PALETTE.bezel,
  "--bezel-outer": PALETTE.bezelOuter,
  "--crt-dim": PALETTE.crtDim,
  "--crt-line": PALETTE.crtLine,
  "--halo": PALETTE.halo,
} as const;

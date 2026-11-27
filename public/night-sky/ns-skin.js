// Night Sky skin: the ONE place for in-scene look (Leo's hook).
// Page (HTML) chrome uses CSS custom properties in ns-theme.css instead. Science constants do NOT live here
// (see ns-astro.js, ns-ephem.js and the CONFIG blocks in layers/*.js).
export const SKIN = {
  // Constellation art atlas slot. Swap `atlas` for a restyled atlas; rectangles come from data/constellations.json.
  art: {
    atlas: "data/art/constellations-atlas.webp",
    tint: [0.902, 0.902, 1.0], // display colour #E6E6FF (the art shader writes raw values, no sRGB step)
  },
  // Leo, ui/ui-spec.md section 5 (sky look). Fonts are Inter (ui/fonts), loaded before any label atlas is drawn.
  lines: { color: "#A6C9FF", opacity: 0.80, gapDeg: 0.35, node: { color: "#AACDFF", opacity: 0.8, radiusDeg: 0.2 } },
  names: { latinFont: "560 48px Inter, system-ui, sans-serif", englishFont: "500 28px Inter, system-ui, sans-serif", color: "rgba(255,255,255,0.92)", englishColor: "rgba(195,201,230,0.85)",
    uppercase: true, spacingEm: 0.25, shadow: "rgba(0,0,20,1)", shadowBlur: 4, capDeg: 2.5, belowDeg: 1.0 },
  starNames: { font: "500 30px Inter, system-ui, sans-serif", color: "#C3C9E6", capDeg: 1.1 },
  cardinals: { font: "600 64px Inter, system-ui, sans-serif", smallFont: "600 40px Inter, system-ui, sans-serif", color: "#C3C9E6", smallColor: "#A9B0D0", capDeg: 3.0 },
  grid: { altaz: "#8FB0D8", eq: "#9AA8F0", ecl: "#E0BC6A", opacity: 0.38, pole: "#D6DEF0" },
  ground: { inner: "#05060F", outer: "#0B0D1C", horizon: "#3A2E70", horizonOpacity: 0.6, seeThroughOpacity: 0.25 },
  sky: { zenith: "#04081A", mid: "#0C143A", horizon: "#2E1E5C", twilightZenith: "#16214F", twilight: "#35508F", twilightGlow: "#E08A66", day: "#4A7FC6", dayHorizon: "#B7CFEA" },
  highlight: { color: "#ffd45e" },
  planets: { mercury: "#d8cfc2", venus: "#fff4d8", mars: "#ff9a6a", jupiter: "#f3dcb6", saturn: "#eed9a0", sun: "#fff2c0", moon: "#e9e6dc" },
  // In-headset canvas panel (1024 x 1024). Leo: fonts and colors only, layout lives in ns-ui.js.
  panel: {
    bg: "rgba(18, 20, 26, 0.92)", fg: "#e9ecf2", dim: "#9aa3b2", accent: "#7fb0ff", on: "#2f5f9f", off: "#2a2e38",
    border: "#3a4150", font: "500 30px system-ui, sans-serif", small: "400 24px system-ui, sans-serif", big: "600 44px system-ui, sans-serif", radius: 18,
  },
  card: { bg: "rgba(14, 16, 22, 0.9)", fg: "#eef1f6", dim: "#a9b1c0", font: "600 34px system-ui, sans-serif", small: "400 24px system-ui, sans-serif" },
};

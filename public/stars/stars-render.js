// Build a Star: drawing. Canvas 2D only; reads physics results, never computes them.
// Art: Leo's grayscale masks in stars/assets, tinted here by temperature.
// Arrows, gauges, hourglass, the H-R plot and reaction labels are drawn in code.

const A = "stars/assets/";
export const ASSETS = {
  "cut-low-mass": ["cutaway-low-mass-1-core", "cutaway-low-mass-2-convective-zone", "cutaway-low-mass-3-surface-shell"],
  "cut-sun-like": ["cutaway-sun-like-1-core", "cutaway-sun-like-2-radiative-zone", "cutaway-sun-like-3-convective-zone", "cutaway-sun-like-4-surface-shell"],
  "cut-massive": ["cutaway-massive-1-core", "cutaway-massive-2-convective-zone", "cutaway-massive-3-radiative-zone", "cutaway-massive-4-surface-shell"],
  body: ["star-body-mask"], giant: ["red-giant-body-mask"], supergiant: ["red-supergiant-body-mask"],
  pp: ["fusion-pp-chain"], cno: ["fusion-cno-cycle"], alpha: ["fusion-triple-alpha"],
  walk: ["energy-photon-random-walk"], loop: ["energy-convection-loop"],
  wd: ["remnant-white-dwarf"], ns: ["remnant-neutron-star"], bh: ["remnant-black-hole"], pn: ["remnant-planetary-nebula"],
  sn: ["supernova-frame-1-core-collapse", "supernova-frame-2-shock", "supernova-frame-3-explosion", "supernova-frame-4-expanding-shell", "supernova-frame-5-remnant"]
};

const imgs = new Map();
/** Lazy image loader. Calls onload(name) when an image arrives. */
export function image(name, onload) {
  let im = imgs.get(name);
  if (!im) {
    im = new Image(); im.decoding = "async"; im.src = A + name + ".webp";
    im.addEventListener("load", () => onload && onload(name), { once: true });
    imgs.set(name, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}
export function preload(group, onload) { for (const n of ASSETS[group]) image(n, onload); }

// Palette: light by default; setTheme(true) swaps to the dark-mode values (stars-theme.css matches).
export let INK = "#1a1a1a", INK2 = "#4a4a4a", INK3 = "#6e6e6e", RULE = "#d6d6d6", GOLD = "#c9a13b";
let PAPER = "#ffffff", BAR_BG = "#e6e6e6", ZONE = { convective: "#c3c3c3", radiative: "#e1e1e1", core: "#f7f7f7" },
  FATE_FILLS = ["#f4f4f4", "#e4e4e4", "#cfcfcf", "#b0b0b0"];
export function setTheme(dark) {
  INK = dark ? "#ececec" : "#1a1a1a"; INK2 = dark ? "#bdbdbd" : "#4a4a4a"; INK3 = dark ? "#9a9a9a" : "#6e6e6e"; RULE = dark ? "#3a3d46" : "#d6d6d6";
  PAPER = dark ? "#16181d" : "#ffffff"; BAR_BG = dark ? "#2e313a" : "#e6e6e6";
  ZONE = dark ? { convective: "#4a4e5a", radiative: "#353842", core: "#262930" } : { convective: "#c3c3c3", radiative: "#e1e1e1", core: "#f7f7f7" };
  FATE_FILLS = dark ? ["#23262e", "#2e313a", "#3a3e48", "#4a4e5a"] : ["#f4f4f4", "#e4e4e4", "#cfcfcf", "#b0b0b0"];
}
export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mix = (c, d, k) => c.map((v, i) => Math.round(v + (d[i] - v) * k));
const WHITE = [255, 255, 255];

function mk(w, h) {
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
  return c;
}

// Tinted copies are cached by (image, color, size): static layers redraw only when the star changes.
const tintCache = new Map();
export function tinted(name, color, size, onload) {
  const im = image(name, onload);
  if (!im) return null;
  const s = Math.max(16, Math.round(size));
  const key = name + "|" + (color ? color.join(",") : "-") + "|" + s;
  let c = tintCache.get(key);
  if (c) return c;
  c = mk(s, s);
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(im, 0, 0, s, s);
  if (color) {
    g.globalCompositeOperation = "multiply"; g.fillStyle = rgb(color); g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = "destination-in"; g.drawImage(im, 0, 0, s, s);
  }
  if (tintCache.size > 120) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}

// Cutaway: all layers flattened once per (variant, color, size).
const cutCache = new Map();
export function cutaway(variant, color, size, onload) {
  const s = Math.round(size), key = variant + "|" + color.join(",") + "|" + s;
  if (cutCache.has(key)) return cutCache.get(key);
  const names = ASSETS["cut-" + variant];
  const layers = names.map((n) => {
    const core = /-1-core$/.test(n);
    return tinted(n, core ? mix(color, WHITE, 0.7) : color, s, onload);
  });
  if (layers.some((l) => !l)) return null;
  const c = mk(s, s), g = c.getContext("2d");
  for (const l of layers) g.drawImage(l, 0, 0);
  if (cutCache.size > 24) cutCache.delete(cutCache.keys().next().value);
  cutCache.set(key, c);
  return c;
}

export function arrow(g, x0, y0, x1, y1, w, color = null, head = 12) {
  color = color || INK;
  const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 2) return;
  const h = Math.min(head, len * 0.6);
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * h * 0.8, y1 - Math.sin(a) * h * 0.8); g.stroke();
  g.beginPath(); g.moveTo(x1, y1);
  g.lineTo(x1 - Math.cos(a - 0.45) * h, y1 - Math.sin(a - 0.45) * h);
  g.lineTo(x1 - Math.cos(a + 0.45) * h, y1 - Math.sin(a + 0.45) * h);
  g.closePath(); g.fill(); g.restore();
}

function text(g, s, x, y, { size = 13, weight = 500, color = null, align = "left", base = "alphabetic" } = {}) {
  g.font = `${weight} ${size}px Inter, system-ui, sans-serif`; g.fillStyle = color || INK; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y);
}

function contain(g, src, x, y, w, h) {
  if (!src) return;
  const sw = src.width, sh = src.height, k = Math.min(w / sw, h / sh);
  g.drawImage(src, x + (w - sw * k) / 2, y + (h - sh * k) / 2, sw * k, sh * k);
}

// ---------- main stage ----------

/** Draw the star (or remnant) for a stage into a square canvas of CSS size W. */
export function drawStage(g, W, view, onload) {
  g.clearRect(0, 0, W, W);
  const { stageId, color, variant, sn, squeeze = 0, dpr } = view;
  const px = W * dpr;
  if (stageId === "main-sequence") {
    const k = 1 + squeeze;
    const c = cutaway(variant, color, Math.min(1024, px), onload);
    if (c) { const s = W * k, o = (W - s) / 2; g.drawImage(c, o, o, s, s); }
    return;
  }
  const one = (name, col, scale = 1) => {
    const t = tinted(name, col, Math.min(1024, px * scale), onload);
    if (t) { const s = W * scale, o = (W - s) / 2; g.drawImage(t, o, o, s, s); }
  };
  switch (stageId) {
    case "red-giant": case "helium-burning": case "agb": one("red-giant-body-mask", color); break;
    case "red-supergiant": one("red-supergiant-body-mask", color); break;
    case "planetary-nebula": one("remnant-planetary-nebula", null); break;
    case "white-dwarf": one("remnant-white-dwarf", null); break;
    case "neutron-star": one("remnant-neutron-star", null); break;
    case "black-hole": one("remnant-black-hole", null); break;
    case "supernova": drawSupernova(g, W, sn, color, px, onload); break;
  }
}

// Supernova frames share center (512,512) and base radius 260 of 1024: draw them on the same square.
function drawSupernova(g, W, sn, color, px, onload) {
  const names = ASSETS.sn;
  const s = W * 0.92, o = (W - s) / 2;
  const fr = (i) => tinted(names[i], color, Math.min(1024, px), onload);
  const a = fr(sn.from), b = fr(sn.to);
  if (a && sn.mix < 1) { g.globalAlpha = 1 - sn.mix; g.drawImage(a, o, o, s, s); }
  if (b) { g.globalAlpha = sn.from === sn.to ? 1 : sn.mix; g.drawImage(b, o, o, s, s); }
  g.globalAlpha = 1;
  // Code-drawn arrows: inward while the core collapses, outward once the shock turns around.
  const cx = W / 2, R = s * 260 / 1024;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + Math.PI / 8, c = Math.cos(t), si = Math.sin(t);
    if (sn.to === 0) arrow(g, cx + c * R * 0.62, cx + si * R * 0.62, cx + c * R * 0.22, cx + si * R * 0.22, 2.5, INK, 10);
    else if (sn.to === 1) arrow(g, cx + c * R * 0.3, cx + si * R * 0.3, cx + c * R * 0.68, cx + si * R * 0.68, 2.5, INK, 10);
    else if (sn.to === 2) arrow(g, cx + c * R * 1.65, cx + si * R * 1.65, cx + c * R * 1.8, cx + si * R * 1.8, 2.5, INK, 10);
  }
}

// ---------- reaction strip (top of the controls) ----------
export function drawReaction(g, W, H, fusionKind, cnoShare, onload, dpr) {
  g.clearRect(0, 0, W, H);
  const name = fusionKind === "helium" ? "fusion-triple-alpha" : fusionKind === "none" ? null : cnoShare > 0.5 ? "fusion-cno-cycle" : "fusion-pp-chain";
  if (name) contain(g, tinted(name, null, Math.min(512, H * dpr * 2.2), onload), 0, 0, H * 1.6, H);
  const label = fusionKind === "helium" ? "Triple-alpha: 3 \u2074He \u2192 \u00b9\u00b2C + \u03b3"
    : fusionKind === "none" ? "No fusion"
    : cnoShare > 0.5 ? "CNO cycle: 4 \u00b9H \u2192 \u2074He (C, N, O as catalysts)" : "Proton-proton chain (ppI only, the main branch in the Sun): 4 \u00b9H \u2192 \u2074He";
  text(g, label, name ? H * 1.6 + 10 : 0, H / 2, { size: 14, weight: 600, base: "middle" });
}

// ---------- detail panels ----------

export function drawHR(g, W, H, d) {
  g.clearRect(0, 0, W, H);
  const L = 44, R = W - 12, T = 10, B = H - 32;
  const lt0 = Math.log10(50000), lt1 = Math.log10(2300), ll0 = -4.5, ll1 = 7;
  const X = (t) => L + (Math.log10(t) - lt0) / (lt1 - lt0) * (R - L);
  const Y = (l) => B - (Math.log10(l) - ll0) / (ll1 - ll0) * (B - T);
  g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(L, T, R - L, B - T);
  for (const e of [-4, -2, 0, 2, 4, 6]) { text(g, e === 0 ? "1" : "10" + sup(e), L - 6, Y(Math.pow(10, e)) + 4, { size: 11, align: "right", color: INK2 }); }
  for (const t of [40000, 20000, 10000, 5000, 3000]) { text(g, (t / 1000) + "k", X(t), B + 15, { size: 11, align: "center", color: INK2 }); }
  text(g, "Surface temperature (K), hotter to the left", (L + R) / 2, H - 3, { size: 11, align: "center", color: INK2 });
  g.save(); g.translate(11, (T + B) / 2); g.rotate(-Math.PI / 2); text(g, "L (L\u2609)", 0, 0, { size: 11, align: "center", color: INK2 }); g.restore();
  g.save(); g.beginPath(); g.rect(L, T, R - L, B - T); g.clip();
  g.strokeStyle = INK3; g.lineWidth = 6; g.lineCap = "round"; g.globalAlpha = 0.35; g.beginPath();
  d.msLine.forEach((p, i) => (i ? g.lineTo(X(p.teff), Y(p.L)) : g.moveTo(X(p.teff), Y(p.L)))); g.stroke(); g.globalAlpha = 1;
  text(g, "main sequence", X(d.msLine[2].teff) + 10, Y(d.msLine[2].L) + 4, { size: 11, color: INK3 });
  g.setLineDash([4, 4]); g.strokeStyle = INK2; g.lineWidth = 1.2; g.beginPath();
  d.track.forEach((p, i) => (i ? g.lineTo(X(p.teff), Y(p.L)) : g.moveTo(X(p.teff), Y(p.L)))); g.stroke(); g.setLineDash([]);
  if (d.here) {
    const x = X(d.here.teff), y = Y(d.here.L);
    g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fillStyle = rgb(d.color); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  }
  g.restore();
  if (!d.here) text(g, "Off the diagram: no light of its own to plot", (L + R) / 2, (T + B) / 2, { size: 13, align: "center", color: INK2 });
}
const SUP = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export const sup = (n) => String(n).split("").map((c) => SUP[c] || c).join("");

/** Hydrostatic gauge: inward gravity, outward pressure, both drawn and scaled live. */
export function drawEquilibrium(g, W, H, d) {
  g.clearRect(0, 0, W, H);
  const narrow = W < 480;
  const cx = narrow ? W * 0.3 : Math.min(W * 0.32, H * 0.55 + 20), cy = narrow ? H * 0.3 : H / 2;
  const r0 = narrow ? H * 0.22 : Math.min(H * 0.33, W * 0.2);
  const r = r0 * (1 + d.x);
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = rgb(mix(d.color, WHITE, 0.35)); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  // A parcel of gas halfway out, with the two arrows acting on it.
  const px = cx + r * 0.62, py = cy - r * 0.0;
  const base = d.scale * r0 * 1.1;
  const gl = base * d.gravity, pl = base * d.pressure;
  arrow(g, px + 12 + gl, py - 16, px + 12, py - 16, 4, INK, 14);
  arrow(g, px + 12, py + 16, px + 12 + pl, py + 16, 4, INK2, 14);
  g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(px - 9, py - 9, 18, 18); g.strokeRect(px - 9, py - 9, 18, 18);
  const tx = narrow ? 12 : Math.max(cx + r0 * 1.9, px + base * 1.5 + 18);
  const ty = narrow ? H - 84 : cy;
  text(g, "Gravity (inward)", tx, ty - 40 + (narrow ? 20 : 0), { size: 14, weight: 700 });
  text(g, "Pressure (outward)", narrow ? tx + 140 : tx, ty - 10 + (narrow ? -10 : 0), { size: 14, weight: 700, color: INK2 });
  const ratio = d.pressure / d.gravity;
  const state = Math.abs(ratio - 1) < 0.02 ? "Balanced: hydrostatic equilibrium" : ratio > 1 ? "Pressure wins: the star pushes back out" : "Gravity wins: the star falls back in";
  text(g, state, tx, ty + 22 - (narrow ? 8 : 0), { size: 13 });
  // Balance needle.
  const nx = tx, ny = ty + 52 - (narrow ? 12 : 0), nw = Math.min(180, W - tx - 12);
  g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + nw, ny); g.stroke();
  g.beginPath(); g.moveTo(nx + nw / 2, ny - 6); g.lineTo(nx + nw / 2, ny + 6); g.stroke();
  const k = Math.max(-1, Math.min(1, Math.log(ratio) * 3));
  g.beginPath(); g.arc(nx + nw / 2 + k * nw / 2, ny, 6, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  text(g, "gravity", nx, ny + 18, { size: 11, color: INK2 }); text(g, "pressure", nx + nw, ny + 18, { size: 11, color: INK2, align: "right" });
}

/** pp vs CNO split bar plus the reaction steps, labeled in code. */
export function drawFusion(g, W, H, d, onload, dpr) {
  g.clearRect(0, 0, W, H);
  let y = 8;
  if (d.fusion === "hydrogen" && d.where === "core") {
    const bw = W - 20, pp = 1 - d.cno;
    text(g, `pp chain ${pct(pp)}`, 10, y + 12, { size: 13, weight: 700 });
    text(g, `CNO cycle ${pct(d.cno)}`, W - 10, y + 12, { size: 13, weight: 700, align: "right" });
    y += 20;
    g.fillStyle = BAR_BG; g.fillRect(10, y, bw, 14); g.fillStyle = rgb(d.color); g.fillRect(10, y, bw * pp, 14);
    g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(10, y, bw, 14);
    g.beginPath(); g.moveTo(10 + bw * pp, y - 3); g.lineTo(10 + bw * pp, y + 17); g.stroke();
    y += 30;
    const steps = d.cno > 0.5
      ? ["\u00b9\u00b2C + p \u2192 \u00b9\u00b3N + \u03b3", "\u00b9\u00b3N \u2192 \u00b9\u00b3C + e\u207a + \u03bd", "\u00b9\u00b3C + p \u2192 \u00b9\u2074N + \u03b3", "\u00b9\u2074N + p \u2192 \u00b9\u2075O + \u03b3", "\u00b9\u2075O \u2192 \u00b9\u2075N + e\u207a + \u03bd", "\u00b9\u2075N + p \u2192 \u00b9\u00b2C + \u2074He"]
      : ["1. p + p \u2192 \u00b2H + e\u207a + \u03bd", "2. \u00b2H + p \u2192 \u00b3He + \u03b3", "3. \u00b3He + \u00b3He \u2192 \u2074He + 2p", "Net: 4p \u2192 \u2074He + 2e\u207a + 2\u03bd + energy", "ppI only, the main branch in the Sun"];
    drawSteps(g, W, H, y, steps, d.cno > 0.5 ? "fusion-cno-cycle" : "fusion-pp-chain", onload, dpr);
  } else if (d.fusion === "helium") {
    if (d.where === "shell") { text(g, "Core: inert carbon and oxygen. Helium and hydrogen burn in shells.", 10, y + 12, { size: 13, weight: 700 }); y += 22; }
    drawSteps(g, W, H, y + 6, ["1. \u2074He + \u2074He \u21cc \u2078Be", "2. \u2078Be + \u2074He \u2192 \u00b9\u00b2C + \u03b3", "Then \u00b9\u00b2C + \u2074He \u2192 \u00b9\u2076O + \u03b3", "Needs about 100 million K"], "fusion-triple-alpha", onload, dpr);
  } else if (d.fusion === "hydrogen") {
    text(g, "Core: inert helium, contracting and heating.", 10, y + 12, { size: 13, weight: 700 });
    drawSteps(g, W, H, y + 30, ["Hydrogen burns in a shell", "around the core (pp + CNO).", "Helium ash piles onto the core", "until it reaches about 100 MK."], "fusion-pp-chain", onload, dpr);
  } else {
    text(g, "No fusion now.", 10, y + 14, { size: 14, weight: 700 });
  }
}
const pct = (f) => (f < 0.001 ? "<0.1" : f > 0.999 ? ">99.9" : (f * 100).toFixed(f < 0.1 || f > 0.9 ? 1 : 0)) + "%";
function drawSteps(g, W, H, y, steps, art, onload, dpr) {
  const aw = Math.min(W * 0.4, H - y - 4);
  contain(g, tinted(art, null, Math.min(512, aw * dpr), onload), W - aw - 6, y, aw, aw);
  steps.forEach((s, i) => text(g, s, 10, y + 16 + i * 22, { size: 14, weight: i === steps.length - 1 && /Net|Needs|ppI/.test(s) ? 700 : 500 }));
}

/** Zone diagram: radius from center to surface with each zone labeled. */
export function drawTransport(g, W, H, d, onload, dpr) {
  g.clearRect(0, 0, W, H);
  const zones = d.zones, x0 = 12, x1 = W - 12, y = 26, h = 26;
  for (const z of zones) {
    const a = x0 + z.from * (x1 - x0), b = x0 + z.to * (x1 - x0);
    g.fillStyle = ZONE[z.kind] || ZONE.core;
    g.fillRect(a, y, b - a, h); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(a, y, b - a, h);
    if (b - a > 60) text(g, z.label, (a + b) / 2, y + h / 2 + 1, { size: 12, weight: 600, align: "center", base: "middle" });
  }
  text(g, "center", x0, y - 8, { size: 11, color: INK2 }); text(g, "surface", x1, y - 8, { size: 11, color: INK2, align: "right" });
  const show = [];
  if (zones.some((z) => z.kind === "radiative")) show.push(["energy-photon-random-walk", "Radiative zone: photons random-walk outward, absorbed and re-emitted countless times."]);
  if (zones.some((z) => z.kind === "convective")) show.push(["energy-convection-loop", "Convective zone: hot gas rises, cools, and sinks, like a boiling pot."]);
  const cw = (W - 12) / show.length, top = y + h + 12, ah = H - top - 46;
  show.forEach(([art, cap], i) => {
    contain(g, tinted(art, null, Math.min(512, ah * dpr * 1.6), onload), 6 + i * cw, top, cw - 6, ah);
    wrap(g, cap, 10 + i * cw, top + ah + 14, cw - 16, 15, 12);
  });
}
function wrap(g, s, x, y, w, lh, size) {
  g.font = `500 ${size}px Inter, system-ui, sans-serif`; g.fillStyle = INK2; g.textAlign = "left"; g.textBaseline = "alphabetic";
  let line = "", yy = y;
  for (const word of s.split(" ")) {
    const t = line ? line + " " + word : word;
    if (g.measureText(t).width > w && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = t;
  }
  g.fillText(line, x, yy);
}

/** Lifetime hourglass, drawn in code. sand = fraction of main-sequence fuel left (0..1). */
export function drawHourglass(g, W, H, d) {
  g.clearRect(0, 0, W, H);
  const hh = H - 24, hw = Math.min(hh * 0.62, W * 0.3), cx = 12 + hw / 2, top = 10, mid = top + hh / 2, bot = top + hh;
  const neck = 5;
  const half = (y0, y1) => { g.beginPath(); g.moveTo(cx - hw / 2, y0); g.lineTo(cx + hw / 2, y0); g.lineTo(cx + neck, y1); g.lineTo(cx - neck, y1); g.closePath(); };
  const col = rgb(d.color);
  // Upper sand: a triangle-ish fill whose height is sqrt(fraction) of the bulb (volume ~ height^2).
  const up = Math.sqrt(Math.max(0, d.sand)), uh = (mid - top) * up;
  g.save(); half(top, mid); g.clip();
  g.fillStyle = col; g.fillRect(cx - hw, mid - uh, hw * 2, uh); g.restore();
  const lowF = 1 - d.sand, lh = (bot - mid) * (1 - Math.sqrt(1 - lowF));
  g.save(); half(bot, mid); g.clip(); g.fillStyle = col; g.fillRect(cx - hw, bot - lh, hw * 2, lh); g.restore();
  if (d.flowing && d.sand > 0) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, mid); g.lineTo(cx, bot - lh); g.stroke(); }
  g.lineWidth = 2.5; g.strokeStyle = INK; half(top, mid); g.stroke(); half(bot, mid); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(cx - hw / 2 - 8, top); g.lineTo(cx + hw / 2 + 8, top); g.moveTo(cx - hw / 2 - 8, bot); g.lineTo(cx + hw / 2 + 8, bot); g.stroke();
  // Stage timeline beside it.
  const tx = 12 + hw + 28, tw = W - tx - 10;
  text(g, d.title, tx, top + 14, { size: 15, weight: 700 });
  wrap(g, d.sub, tx, top + 34, tw, 16, 13);
  const ty = top + 92;
  d.stages.forEach((s, i) => {
    const yy = ty + i * 22, on = i === d.index;
    g.beginPath(); g.arc(tx + 6, yy - 4, 5, 0, Math.PI * 2); g.fillStyle = on ? col : i < d.index ? INK3 : PAPER; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    text(g, s.name, tx + 18, yy, { size: 13, weight: on ? 700 : 500, color: on ? INK : INK2 });
    text(g, s.dur, W - 10, yy, { size: 12, align: "right", color: INK2 });
  });
}

/** Fate map: a log-mass axis split at the fate thresholds, with this star's marker. */
export function drawFateMap(g, W, H, d) {
  g.clearRect(0, 0, W, H);
  const x0 = 12, x1 = W - 12, y = 40, h = 34;
  const X = (m) => x0 + Math.log(m / 0.08) / Math.log(100 / 0.08) * (x1 - x0);
  const fills = FATE_FILLS;
  d.bands.forEach((b, i) => {
    const a = X(b.from), c = X(b.to);
    g.fillStyle = fills[i]; g.fillRect(a, y, c - a, h); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(a, y, c - a, h);
    wrap(g, b.label, a + 4, y + h + 16, Math.max(40, c - a - 6), 14, 11);
  });
  for (const t of d.ticks) { g.strokeStyle = INK; g.beginPath(); g.moveTo(X(t), y - 4); g.lineTo(X(t), y); g.stroke(); text(g, String(t), X(t), y - 8, { size: 11, align: "center", color: INK2 }); }
  text(g, "Initial mass (M\u2609)", x0, 14, { size: 12, weight: 700 });
  const mx = X(d.mass);
  g.beginPath(); g.moveTo(mx, y + 2); g.lineTo(mx - 8, y - 12 + 2); g.lineTo(mx + 8, y - 12 + 2); g.closePath();
  g.beginPath(); g.arc(mx, y + h / 2, 9, 0, Math.PI * 2); g.fillStyle = rgb(d.color); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  wrap(g, d.summary, x0, y + h + 70, x1 - x0, 17, 14);
}

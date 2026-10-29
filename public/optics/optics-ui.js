// Optics: page wiring and the scenes for each mode.
// Physics and data: optics-physics.js. Drawing helpers: optics-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, ready, readTokens, fitView, mkView, line, text, angleArc, drawRays, fillPoly, mediumAlpha, planeMirror, sprite, lamp
} from "./optics-render.js";
import {
  MATERIALS, MEDIA_IDS, SOLID_IDS, PRISM_IDS, BANDS, N_AIR, indexOf, speedIn, criticalAngle, imageInfo, principalRays,
  prismPath, minDeviation, PRISM_APEX, GRAZING, trace, rectPts, prismPts, reflectionScene, refractionScene, tirScene, TIR_R,
  prismScene, BENCH, SLIDERS, fromSlider, toSlider, shown, MODES, parseQuery, sig, degs, cm, times
} from "./optics-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.optics.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(() => { dirty = true; });

const st = {
  mode: q.mode,
  reflection: { angle: 35 },
  refraction: { angle: 40, top: "air", bottom: "water" },
  tir: { angle: 35, mat: "glass" },
  lenses: { dObj: 40, f: 10, kind: q.mode === "lenses" && q.kind === "diverging" ? "diverging" : "converging", object: "candle" },
  mirrors: { dObj: 40, f: 10, kind: q.mode === "mirrors" && q.kind === "convex" ? "convex" : "concave", object: "candle" },
  dispersion: { angle: 50, mat: "glass" },
  sandbox: { items: [], sel: null, nextId: 1 }
};
const snap = (name, v) => fromSlider(name, toSlider(name, v));
for (const k of ["lenses", "mirrors"]) { st[k].dObj = snap("dObj", st[k].dObj); st[k].f = snap("f", st[k].f); }

// ---------- theme ----------
function applyTheme(t, save) {
  document.documentElement.setAttribute("data-theme", t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  $("themeBtn").setAttribute("aria-pressed", String(t === "dark"));
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  T = readTokens(); dirty = true;
}
$("themeBtn").addEventListener("click", () => applyTheme(T.dark ? "light" : "dark", true));
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
darkMQ.addEventListener?.("change", (e) => {
  let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (!saved) applyTheme(e.matches ? "dark" : "light", false);
});
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

// ---------- sandbox items ----------
const ITEM_TYPES = {
  raybox: "Ray box", point: "Point source", convex: "Converging lens", concave: "Diverging lens",
  plane: "Plane mirror", cmirror: "Concave mirror", vmirror: "Convex mirror", block: "Block", prism: "Prism", screen: "Screen"
};
const SB_BOUNDS = [-50, -28, 50, 28];
const MAX_ITEMS = 16;
function newItem(type, x = 0, y = 0) {
  const it = { id: st.sandbox.nextId++, type, x, y, ang: 0, f: 10, mat: "glass", white: false };
  if (type === "plane" || type === "cmirror" || type === "vmirror") it.ang = Math.PI;
  return it;
}
function sandboxDefaults() {
  st.sandbox.items = []; st.sandbox.nextId = 1;
  const a = newItem("raybox", -40, 0), b = newItem("convex", -10, 0), c = newItem("screen", 30, 0);
  b.f = 10;
  st.sandbox.items.push(a, b, c); st.sandbox.sel = b.id;
}
sandboxDefaults();
const selItem = () => st.sandbox.items.find((i) => i.id === st.sandbox.sel) || null;
function itemElements(it) {
  const c = [it.x, it.y];
  switch (it.type) {
    case "convex": return [{ type: "lens", c, ang: it.ang, half: 6, f: it.f }];
    case "concave": return [{ type: "lens", c, ang: it.ang, half: 6, f: -it.f }];
    case "plane": return [{ type: "mirror", c, ang: it.ang, half: 6, f: Infinity }];
    case "cmirror": return [{ type: "mirror", c, ang: it.ang, half: 6, f: it.f }];
    case "vmirror": return [{ type: "mirror", c, ang: it.ang, half: 6, f: -it.f }];
    case "block": return [{ type: "poly", pts: rectPts(it.x, it.y, 12, 7, it.ang), mat: it.mat }];
    case "prism": return [{ type: "poly", pts: prismPts(it.x, it.y, 11, it.ang), mat: it.mat }];
    case "screen": return [{ type: "screen", c, ang: it.ang, half: 7 }];
    default: return [];
  }
}
function itemRays(it) {
  const out = [], bands = it.white ? BANDS.map((b, k) => k) : [null];
  if (it.type === "raybox") {
    const d = [Math.cos(it.ang), Math.sin(it.ang)], e = [-d[1], d[0]];
    for (let k = -2; k <= 2; k++) for (const band of bands) out.push({ p: [it.x + e[0] * k * 0.9, it.y + e[1] * k * 0.9], d, band });
  } else if (it.type === "point") {
    for (let k = -5; k <= 5; k++) { const a = it.ang + (k * 5 * Math.PI) / 180; for (const band of bands) out.push({ p: [it.x, it.y], d: [Math.cos(a), Math.sin(a)], band }); }
  }
  return out;
}
function sandboxTrace() {
  const els = st.sandbox.items.flatMap(itemElements), rays = st.sandbox.items.flatMap(itemRays);
  return trace(els, rays, SB_BOUNDS, { maxSegs: 3000 });
}

// ---------- controls built per mode ----------
const SLIDER_UI = {
  reflection: [["angle", "Angle of incidence \u03b8\u1d62"]],
  refraction: [["angle", "Angle of incidence \u03b8\u2081"]],
  tir: [["angle", "Angle inside the block \u03b8\u2081"]],
  lenses: [["dObj", "Object distance d\u2092"], ["f", "Focal length |f|"]],
  mirrors: [["dObj", "Object distance d\u2092"], ["f", "Focal length |f|"]],
  dispersion: [["prism", "Angle of incidence \u03b8\u2081"]],
  sandbox: [["f", "Focal length |f|"]]
};
const get = {
  angle: () => st[st.mode].angle, prism: () => st.dispersion.angle, dObj: () => st[st.mode].dObj,
  f: () => (st.mode === "sandbox" ? (selItem()?.f ?? 10) : st[st.mode].f)
};
const set = {
  angle: (v) => { st[st.mode].angle = v; }, prism: (v) => { st.dispersion.angle = v; }, dObj: (v) => { st[st.mode].dObj = v; },
  f: (v) => { if (st.mode === "sandbox") { const it = selItem(); if (it) it.f = v; } else st[st.mode].f = v; }
};
const sliderText = {
  angle: (v) => degs(v, 1), prism: (v) => degs(v, 1), dObj: cm,
  f: (v) => {
    const it = selItem(), neg = (st.mode === "lenses" && st.lenses.kind === "diverging") || (st.mode === "mirrors" && st.mirrors.kind === "convex") ||
      (st.mode === "sandbox" && it && (it.type === "concave" || it.type === "vmirror"));
    return (neg ? "f = " + cm(-v) : "f = " + cm(v));
  }
};
function button(host, text, onClick, data = {}) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = text;
  for (const [k, v] of Object.entries(data)) b.dataset[k] = v;
  b.addEventListener("click", onClick); host.appendChild(b); return b;
}
function buildControls() {
  const host = $$("[data-sliders]")[0];
  host.innerHTML = "";
  for (const [k, label] of SLIDER_UI[st.mode]) {
    const lab = document.createElement("label"); lab.className = "slider"; lab.dataset.wrap = k;
    const sp = document.createElement("span"); sp.textContent = label;
    const out = document.createElement("output"); out.dataset.out = k;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = String(SLIDERS[k].steps); inp.step = "1"; inp.dataset.slider = k;
    inp.setAttribute("aria-label", label);
    inp.addEventListener("input", () => { set[k](fromSlider(k, Number(inp.value))); sync(); });
    lab.append(sp, out, inp); host.appendChild(lab);
  }
  const rows = $$("[data-choices]")[0]; rows.innerHTML = "";
  const group = (label, items, isOn, pick) => {
    const g = document.createElement("div"); g.className = "group";
    const h = document.createElement("p"); h.className = "group-label"; h.textContent = label; g.appendChild(h);
    const r = document.createElement("div"); r.className = "row"; r.setAttribute("role", "group"); r.setAttribute("aria-label", label);
    for (const [val, text] of items) { const b = button(r, text, () => { pick(val); sync(); }); b.dataset.choice = label; b.dataset.val = val; b._on = () => isOn(val); }
    g.appendChild(r); rows.appendChild(g);
  };
  const mats = (ids) => ids.map((id) => [id, MATERIALS[id].name]);
  if (st.mode === "refraction") {
    group("Top medium (light starts here)", mats(MEDIA_IDS), (v) => st.refraction.top === v, (v) => { st.refraction.top = v; });
    group("Bottom medium", mats(MEDIA_IDS), (v) => st.refraction.bottom === v, (v) => { st.refraction.bottom = v; });
  } else if (st.mode === "tir") {
    group("Block material", mats(SOLID_IDS), (v) => st.tir.mat === v, (v) => { st.tir.mat = v; });
  } else if (st.mode === "lenses") {
    group("Lens", [["converging", "Converging"], ["diverging", "Diverging"]], (v) => st.lenses.kind === v, (v) => { st.lenses.kind = v; });
    group("Object", [["candle", "Candle"], ["figure", "Figure"]], (v) => st.lenses.object === v, (v) => { st.lenses.object = v; });
  } else if (st.mode === "mirrors") {
    group("Mirror", [["concave", "Concave"], ["convex", "Convex"]], (v) => st.mirrors.kind === v, (v) => { st.mirrors.kind = v; });
    group("Object", [["candle", "Candle"], ["figure", "Figure"]], (v) => st.mirrors.object === v, (v) => { st.mirrors.object = v; });
  } else if (st.mode === "dispersion") {
    group("Prism material", mats(PRISM_IDS), (v) => st.dispersion.mat === v, (v) => { st.dispersion.mat = v; });
  } else if (st.mode === "sandbox") {
    group("Add", Object.entries(ITEM_TYPES), () => false, (type) => {
      if (st.sandbox.items.length >= MAX_ITEMS) return;
      const n = st.sandbox.items.length, it = newItem(type, -20 + (n % 5) * 10, 14 - Math.floor(n / 5) * 9);
      if (type === "raybox" || type === "point") it.x = -42;
      st.sandbox.items.push(it); st.sandbox.sel = it.id; buildControls();
    });
    const it = selItem();
    if (it) {
      group("Selected: " + ITEM_TYPES[it.type], [["left", "Rotate 15\u00b0 left"], ["right", "Rotate 15\u00b0 right"], ["delete", "Remove"]], () => false, (v) => {
        if (v === "delete") { st.sandbox.items = st.sandbox.items.filter((x) => x !== it); st.sandbox.sel = null; buildControls(); }
        else it.ang += (v === "left" ? 1 : -1) * Math.PI / 12;
      });
      if (it.type === "block" || it.type === "prism") group("Material", mats(PRISM_IDS), (v) => it.mat === v, (v) => { it.mat = v; });
      if (it.type === "raybox" || it.type === "point") group("Light", [["mono", "One color"], ["white", "White light"]], (v) => (v === "white") === it.white, (v) => { it.white = v === "white"; });
    }
    group("Bench", [["clear", "Clear all"], ["reset", "Reset"]], () => false, (v) => {
      if (v === "clear") { st.sandbox.items = []; st.sandbox.sel = null; } else sandboxDefaults();
      buildControls();
    });
    const fWrap = $$('[data-wrap="f"]')[0];
    if (fWrap) fWrap.hidden = !(it && ["convex", "concave", "cmirror", "vmirror"].includes(it.type));
  }
}

// ---------- readouts ----------
const TITLES = {
  reflection: "Law of reflection", refraction: "Refraction: Snell's law", tir: "Total internal reflection",
  lenses: "Thin lenses", mirrors: "Curved mirrors", dispersion: "Dispersion in a prism", sandbox: "Sandbox"
};
const NOTES = {
  reflection: "A ray from the lamp hits a flat mirror. Angles are measured from the normal, the dashed line at right angles to the mirror. The reflected ray leaves on the other side of the normal at the same angle: angle of incidence = angle of reflection.",
  refraction: "Light changes speed when it enters a new material, so it bends at the boundary. Going into a material with a larger index n it slows and bends toward the normal; going into a smaller n it speeds up and bends away. Some light is always reflected too (the faint ray). Try light going from diamond or glass into air at a large angle.",
  tir: "The ray enters the curved side of the half-disc aimed at the center, so it hits the curved face straight on and does not bend there. At the flat face it goes from a high index into air. Past the critical angle no light gets out: all of it reflects. Optical fibers and the sparkle of diamonds use this.",
  lenses: "A converging lens brings parallel rays together at the focal point F. Three easy rays find the image: one parallel to the axis bends through F, one through the center goes straight, and one through F on the near side leaves parallel. Where the rays meet is a real image you can catch on a screen. If they spread apart, trace them back (dashed) to find a virtual image you can see by looking through the lens. The vertical scale is stretched (see the corner of the picture) to make the rays easier to see.",
  mirrors: "A concave mirror brings parallel rays together at its focal point F, halfway between the mirror and its center of curvature C (f = R/2). A convex mirror spreads them out as if they came from a point F behind it, so it always makes a smaller, upright, virtual image, like a car's side mirror. The vertical scale is stretched (see the corner of the picture) to make the rays easier to see.",
  dispersion: "White light is a mix of colors. The prism's index of refraction is a little larger for violet light than for red, so violet bends more and the colors fan out into a spectrum. Diamond bends light so much that in a 60\u00b0 prism the light is trapped by total internal reflection.",
  sandbox: "Add lamps, lenses, mirrors, blocks and prisms, then drag them around. Tap an item to select it; rotate it, change its material or focal length, or remove it. With the scene focused, arrow keys move the selected item and [ and ] rotate it. Lenses and curved mirrors are ideal thin ones (no aberration)."
};
function readout() {
  const m = st.mode, v = shown(m, st[m]);
  if (m === "reflection") return `\u03b8\u1d62 = ${degs(v.thetaI)}\n\u03b8\u1d63 = ${degs(v.thetaR)}\nLaw of reflection: \u03b8\u1d63 = \u03b8\u1d62`;
  if (m === "refraction") {
    const s = st.refraction, a = MATERIALS[s.top], b = MATERIALS[s.bottom];
    const lines = [`n\u2081 = ${a.n} (${a.name.toLowerCase()}), n\u2082 = ${b.n} (${b.name.toLowerCase()})`, `n\u2081 sin \u03b8\u2081 = n\u2082 sin \u03b8\u2082`, `\u03b8\u2081 = ${degs(v.theta1)}`];
    if (v.theta2 === null) lines.push(`\u03b8\u2082: no refracted ray. Past the critical angle ${degs(criticalAngle(v.n1, v.n2))}, all light reflects.`);
    else lines.push(`\u03b8\u2082 = ${degs(v.theta2)} (${v.theta2 < v.theta1 - 0.05 ? "toward" : v.theta2 > v.theta1 + 0.05 ? "away from" : "along"} the normal)`);
    if (v.reflectPct === null) lines.push("Same material on both sides: no boundary, so no bending and no reflection.");
    else lines.push(`Reflected: ${sig(v.reflectPct, 2)}% of the light`);
    if (s.top !== "air" || s.bottom !== "air") lines.push(`Speed of light: ${(speedIn(v.n1) / 1e8).toFixed(2)} \u00d7 10\u2078 m/s on top, ${(speedIn(v.n2) / 1e8).toFixed(2)} \u00d7 10\u2078 m/s below`);
    return lines.join("\n");
  }
  if (m === "tir") {
    const lines = [`n\u2081 = ${v.n1} (${MATERIALS[st.tir.mat].name.toLowerCase()}), n\u2082 = ${N_AIR} (air)`, `Critical angle \u03b8c = sin\u207b\u00b9(n\u2082/n\u2081) = ${degs(v.critical)}`, `\u03b8\u2081 = ${degs(v.theta)}`];
    if (v.theta2 === null) lines.push("\u03b8\u2081 > \u03b8c: total internal reflection, 100% reflected");
    else lines.push(`\u03b8\u2082 = ${degs(v.theta2)} in air, ${sig(v.reflectPct, 2)}% reflected`);
    return lines.join("\n");
  }
  if (m === "lenses" || m === "mirrors") {
    const s = st[m], lines = [`d\u2092 = ${cm(v.dObj)}, f = ${cm(v.f)}`, "1/f = 1/d\u2092 + 1/d\u1d62,  m = \u2212d\u1d62/d\u2092"];
    if (v.di === null) lines.push(`d\u1d62: the image is very far away (more than 150 cm). The object is at or near F.`);
    else {
      const im = imageInfo(v.f, v.dObj);
      lines.push(`d\u1d62 = ${cm(v.di)}, m = ${times(v.m)}`);
      lines.push(`${im.real ? "Real" : "Virtual"}, ${im.upright ? "upright" : "inverted"}, ${im.size === "same size" ? "same size" : im.size + " than the object"}`);
      lines.push(im.real ? (m === "lenses" ? "Forms on a screen behind the lens." : "Forms in front of the mirror.") : (m === "lenses" ? "Seen by looking through the lens." : "Seen behind the mirror."));
    }
    return lines.join("\n");
  }
  if (m === "dispersion") {
    const s = st.dispersion, out = [`${MATERIALS[s.mat].name} prism, apex ${PRISM_APEX}\u00b0, \u03b8\u2081 = ${degs(s.angle)}`];
    for (const [k, b] of [[0, BANDS[0]], [5, BANDS[5]]]) {
      const p = prismPath(indexOf(s.mat, k), PRISM_APEX, s.angle);
      const what = p.dev === null ? "trapped (total internal reflection at the second face)" : p.e >= GRAZING ? "leaves almost along the face (grazing)" : `deviated ${degs(p.dev)}`;
      out.push(`${b.name} ${b.nm} nm, n = ${indexOf(s.mat, k).toFixed(3)}: ${what}`);
    }
    if (v.spread !== null) out.push(`Spread of the colors: ${degs(v.spread, 2)}`);
    const nm = indexOf(s.mat, 2) / N_AIR;
    if (nm * Math.sin((PRISM_APEX / 2) * Math.PI / 180) < 1) out.push(`Minimum deviation (yellow): ${degs(minDeviation(indexOf(s.mat, 2), PRISM_APEX))}`);
    return out.join("\n");
  }
  const it = selItem();
  const lines = [`${st.sandbox.items.length} item${st.sandbox.items.length === 1 ? "" : "s"} on the bench`];
  if (it) {
    lines.push("Selected: " + ITEM_TYPES[it.type]);
    if (["convex", "cmirror"].includes(it.type)) lines.push(`f = ${cm(it.f)}`);
    if (["concave", "vmirror"].includes(it.type)) lines.push(`f = ${cm(-it.f)}`);
    if (["block", "prism"].includes(it.type)) lines.push(`${MATERIALS[it.mat].name}, n = ${MATERIALS[it.mat].n}, critical angle ${degs(criticalAngle(MATERIALS[it.mat].n, N_AIR))}`);
  } else lines.push("Tap an item to select it.");
  return lines.join("\n");
}

// ---------- mode switching, URL ----------
function setMode(m) {
  st.mode = m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildControls(); sync();
}
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function sync() {
  $("panelTitle").textContent = TITLES[st.mode];
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider, v = get[k]();
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`)[0]; if (out) out.textContent = sliderText[k](v);
  }
  for (const b of $$("[data-choice]")) if (b._on) b.setAttribute("aria-pressed", String(b._on()));
  $("readout").textContent = readout();
  $("note").textContent = NOTES[st.mode];
  sc.setAttribute("aria-label", TITLES[st.mode] + ". " + readout().replace(/\n/g, ". "));
  writeUrl();
  dirty = true;
}

// ---------- canvas ----------
const sc = $("scene"), ctx = sc.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);
const size = { w: 1, h: 1 };
function resize() {
  const a = sc.getBoundingClientRect();
  const w = Math.max(1, Math.round(a.width)), h = Math.max(1, Math.round(a.height));
  if (w !== size.w || h !== size.h) { size.w = w; size.h = h; sc.width = Math.round(w * dpr); sc.height = Math.round(h * dpr); dirty = true; }
}
let view = null;
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, size.w, size.h);
  const m = st.mode;
  if (m === "reflection") drawReflection();
  else if (m === "refraction") drawRefraction();
  else if (m === "tir") drawTir();
  else if (m === "lenses" || m === "mirrors") drawBench(m);
  else if (m === "dispersion") drawDispersion();
  else drawSandbox();
}
const normalLine = (V, a, b) => line(ctx, V, a, b, T.normal, 1.5, [6, 5]);
function drawReflection() {
  const s = st.reflection, sc0 = reflectionScene(s.angle), V = fitView(size.w, size.h, sc0.bounds);
  planeMirror(ctx, V, T, sc0.els[0]);
  normalLine(V, [0, 0], [0, 16]);
  drawRays(ctx, V, T, trace(sc0.els, sc0.rays, sc0.bounds));
  lamp(ctx, V, img, sc0.lamp.p, sc0.lamp.d);
  const r = Math.min(70, 9 * V.sx);
  angleArc(ctx, V, [0, 0], 90, 90 + s.angle, r, T.ray, "\u03b8\u1d62");
  angleArc(ctx, V, [0, 0], 90 - s.angle, 90, r * 0.8, T.accent, "\u03b8\u1d63");
  text(ctx, "normal", V.X(0) + 6, V.Y(15.5), T.dim, "left", 12);
  text(ctx, "mirror", V.X(17), V.Y(0) + 18, T.dim, "right", 12);
}
function mediumFill(V, y0, y1, id) {
  if (id === "air") return;
  fillPoly(ctx, V, [[-30, y0], [30, y0], [30, y1], [-30, y1]], T.glass, mediumAlpha(MATERIALS[id].n));
}
function drawRefraction() {
  const s = st.refraction, sc0 = refractionScene(s.top, s.bottom, s.angle), V = fitView(size.w, size.h, sc0.bounds);
  mediumFill(V, 0, 20, s.top); mediumFill(V, -20, 0, s.bottom);
  line(ctx, V, [-30, 0], [30, 0], T.ink, 1.5);
  normalLine(V, [0, -14], [0, 14]);
  drawRays(ctx, V, T, trace(sc0.els, sc0.rays, sc0.bounds));
  lamp(ctx, V, img, sc0.lamp.p, sc0.lamp.d);
  const v = shown("refraction", s), r = Math.min(70, 8 * V.sx);
  angleArc(ctx, V, [0, 0], 90, 90 + s.angle, r, T.ray, "\u03b8\u2081");
  if (v.theta2 !== null) angleArc(ctx, V, [0, 0], -90, -90 + v.theta2, r, T.accent, "\u03b8\u2082");
  text(ctx, `${MATERIALS[s.top].name}, n = ${MATERIALS[s.top].n}`, V.X(20.5), V.Y(13.5), T.ink, "right", 13, 600);
  text(ctx, `${MATERIALS[s.bottom].name}, n = ${MATERIALS[s.bottom].n}`, V.X(20.5), V.Y(-13.5), T.ink, "right", 13, 600);
}
function drawTir() {
  const s = st.tir, sc0 = tirScene(s.mat, s.angle), V = fitView(size.w, size.h, sc0.bounds);
  fillPoly(ctx, V, sc0.els[0].pts, T.glass, mediumAlpha(MATERIALS[s.mat].n), T.ink);
  normalLine(V, [0, -13], [0, 13]);
  const v = shown("tir", s), r = Math.min(70, 7 * V.sx);
  // where the critical angle is
  const tc = v.critical * Math.PI / 180;
  line(ctx, V, [0, 0], [-Math.sin(tc) * 12, -Math.cos(tc) * 12], T.dim, 1.5, [2, 4]);
  text(ctx, "\u03b8c", V.X(-Math.sin(tc) * 13), V.Y(-Math.cos(tc) * 13), T.dim, "center", 12, 600);
  drawRays(ctx, V, T, trace(sc0.els, sc0.rays, sc0.bounds));
  lamp(ctx, V, img, sc0.lamp.p, sc0.lamp.d);
  angleArc(ctx, V, [0, 0], -90 - s.angle, -90, r, T.ray, "\u03b8\u2081");
  if (v.theta2 !== null) angleArc(ctx, V, [0, 0], 90 - v.theta2, 90, r, T.accent, "\u03b8\u2082");
  text(ctx, `Air, n = ${N_AIR}`, V.X(20.5), V.Y(13.5), T.ink, "right", 13, 600);
  text(ctx, `${MATERIALS[s.mat].name}, n = ${MATERIALS[s.mat].n}`, V.X(20.5), V.Y(-13.5), T.ink, "right", 13, 600);
}
function drawDispersion() {
  const s = st.dispersion, sc0 = prismScene(s.mat, s.angle), V = fitView(size.w, size.h, sc0.bounds);
  const pts = sc0.els[0].pts;
  fillPoly(ctx, V, pts, T.glass, mediumAlpha(MATERIALS[s.mat].n), T.ink);
  const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  const nrm = [Math.cos(Math.PI * 150 / 180), Math.sin(Math.PI * 150 / 180)];
  normalLine(V, [mid[0] - nrm[0] * 6, mid[1] - nrm[1] * 6], [mid[0] + nrm[0] * 8, mid[1] + nrm[1] * 8]);
  // the white beam before the prism, then the colors
  line(ctx, V, sc0.lamp.p, mid, T.ink, 3.5, null, 0.85);
  const segs = trace(sc0.els, sc0.rays, sc0.bounds).filter((g) => !(Math.abs(g.a[0] - sc0.lamp.p[0]) < 1e-9 && Math.abs(g.a[1] - sc0.lamp.p[1]) < 1e-9 && g.w === 1));
  drawRays(ctx, V, T, segs, { width: 2.5 });
  lamp(ctx, V, img, sc0.lamp.p, sc0.lamp.d);
  angleArc(ctx, V, mid, 150, 150 + s.angle, Math.min(60, 5 * V.sx), T.ink, "\u03b8\u2081");
  text(ctx, `${MATERIALS[s.mat].name} prism, ${PRISM_APEX}\u00b0`, V.X(0), V.Y(-7.5), T.ink, "center", 13, 600);
}

// ---------- optical bench (lenses and mirrors) ----------
const OBJ_ART = { candle: { name: "candle", top: 59, bottom: 966 }, figure: { name: "object-figure", top: 56, bottom: 966 } };
function benchView() {
  const mode = st.mode, [vx0, vx1] = BENCH.view[mode];
  const sx = (size.w - 20) / (vx1 - vx0);
  const rail = img["optical-bench-rail"];
  const rs = Math.min((size.w - 10) / 1024, (size.h * 0.2) / 121);
  const railTop = size.h - 121 * rs - 4;
  const ch = Math.min(size.h * 0.13, 70);
  const carrierTop = railTop - ch;
  const sy = Math.min(sx * (size.w < 600 ? 6 : 4), (carrierTop - 10 - 34) / (2 * BENCH.lensHalf));
  const axisY = carrierTop - 10 - BENCH.lensHalf * sy;
  const V = mkView(sx, sy, 10 - vx0 * sx, axisY);
  return { V, rs, railTop, ch, carrierTop, rail };
}
function carrier(B, x) {
  const k = B.ch / 212;
  sprite(ctx, img["bench-carrier"], 128, 24, k, 0, x, B.carrierTop);
}
function rod(B, x, yTop) {
  ctx.save(); ctx.fillStyle = T.rod; ctx.fillRect(x - 3, yTop, 6, B.carrierTop - yTop + 2); ctx.restore();
}
function drawBench(mode) {
  const s = st[mode], B = benchView(), V = B.V;
  view = V;
  const f = s.kind === "diverging" || s.kind === "convex" ? -s.f : s.f, h = BENCH.objH, im = imageInfo(f, s.dObj, h);
  const sgn = mode === "lenses" ? 1 : -1; // outgoing light travels +x through a lens, -x off a mirror
  const ax = (u) => sgn * u; // distance past the element to world x
  // rail
  if (ready(B.rail)) sprite(ctx, B.rail, 512, 120, B.rs, 0, size.w / 2, B.railTop);
  else { ctx.fillStyle = T.rod; ctx.fillRect(10, B.railTop, size.w - 20, 14); }
  // the element
  const ek = (2 * BENCH.lensHalf * V.sy) / 640;
  carrier(B, V.X(0)); rod(B, V.X(0), V.Y(-BENCH.lensHalf));
  const elImg = mode === "lenses" ? img[s.kind === "diverging" ? "lens-diverging" : "lens-converging"] : img[s.kind === "convex" ? "mirror-convex" : "mirror-concave"];
  // screen for a real lens image on the bench
  const imgX = ax(im.di);
  const onBench = !im.far && imgX > BENCH.view[mode][0] && imgX < BENCH.view[mode][1];
  const useScreen = mode === "lenses" && im.real && onBench;
  if (useScreen) {
    const top = V.Y(BENCH.lensHalf * 1.05), k = (B.carrierTop - top) / (932 - 152);
    carrier(B, V.X(imgX));
    sprite(ctx, img.screen, 512, 932, k, 0, V.X(imgX), B.carrierTop, false, false, 0.7);
  }
  if (ready(elImg)) sprite(ctx, elImg, 512, 512, ek, 0, V.X(0), V.Y(0));
  else line(ctx, V, [0, -BENCH.lensHalf], [0, BENCH.lensHalf], T.ink, 3);
  // axis
  line(ctx, V, [BENCH.view[mode][0], 0], [BENCH.view[mode][1], 0], T.dim, 1);
  // focal points
  const marks = mode === "lenses" ? [[f, "F\u2032"], [-f, "F"], [2 * f, "2F\u2032"], [-2 * f, "2F"]] : [[-f, "F"], [-2 * f, "C"]];
  for (const [x, lab] of marks) {
    if (x < BENCH.view[mode][0] || x > BENCH.view[mode][1]) continue;
    ctx.save(); ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(V.X(x), V.Y(0), 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
    text(ctx, lab, V.X(x), V.Y(0) + 14, T.ink, "center", 13, 600);
  }
  // object
  const art = OBJ_ART[s.object], oimg = img[art.name], ok = (h * V.sy) / (art.bottom - art.top), ox = V.X(-s.dObj);
  carrier(B, ox); rod(B, ox, V.Y(0));
  sprite(ctx, oimg, 512, art.bottom, ok, 0, ox, V.Y(0));
  // rays
  const rays = principalRays(f, s.dObj, h), xEnd = useScreen ? im.di : (mode === "lenses" ? BENCH.view.lenses[1] : -BENCH.view.mirrors[0]);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, size.w, B.carrierTop); ctx.clip();
  const segs = [];
  for (const r of rays) {
    segs.push({ a: [-s.dObj, h], b: [0, r.y], w: 1, band: null });
    segs.push({ a: [0, r.y], b: [ax(xEnd), r.y + r.t2 * xEnd], w: 1, band: null });
  }
  drawRays(ctx, V, T, segs);
  if (!im.far && !im.real) for (const r of rays) line(ctx, V, [0, r.y], [ax(im.di), r.y + r.t2 * im.di], T.ray, 1.5, [5, 5], 0.9);
  // image
  if (!im.far) {
    const top = h * im.m, alpha = im.real ? 0.9 : 0.45;
    const k2 = (Math.abs(top) * V.sy) / (art.bottom - art.top);
    sprite(ctx, oimg, 512, art.bottom, k2, 0, V.X(imgX), V.Y(0), false, top < 0, alpha);
    line(ctx, V, [imgX, 0], [imgX, top], T.accent, 2.5, im.real ? null : [5, 4]);
    text(ctx, im.real ? "real image" : "virtual image", V.X(imgX) + 8, V.Y(top) + (top < 0 ? 14 : -12), T.accent, "left", 13, 600);
  }
  ctx.restore();
  // an eye looks at a virtual image through the lens or into the mirror
  if (!im.far && !im.real) {
    const ex = mode === "lenses" ? V.X(BENCH.view.lenses[1]) - 46 : V.X(BENCH.view.mirrors[0]) + 46, k = 86 / 916;
    sprite(ctx, img["eye-cross-section"], 512, 511, k, 0, ex, V.Y(0), mode === "mirrors");
  }
  text(ctx, "object", ox, V.Y(h) - 14, T.ink, "center", 13, 600);
  text(ctx, `vertical scale \u00d7${sig(V.sy / V.sx, 2)}`, 12, 16, T.dim, "left", 12);
}

// ---------- sandbox ----------
const SPRITE_FOR = { convex: "lens-converging", concave: "lens-diverging", cmirror: "mirror-concave", vmirror: "mirror-convex" };
function drawSandbox() {
  const V = fitView(size.w, size.h, SB_BOUNDS, 8);
  view = V;
  // grid every 10 cm
  ctx.save(); ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  for (let x = -50; x <= 50; x += 10) { ctx.beginPath(); ctx.moveTo(V.X(x), V.Y(-28)); ctx.lineTo(V.X(x), V.Y(28)); ctx.stroke(); }
  for (let y = -20; y <= 20; y += 10) { ctx.beginPath(); ctx.moveTo(V.X(-50), V.Y(y)); ctx.lineTo(V.X(50), V.Y(y)); ctx.stroke(); }
  ctx.restore();
  text(ctx, "grid: 10 cm", V.X(-49), V.Y(26.5), T.dim, "left", 12);
  for (const it of st.sandbox.items) {
    const els = itemElements(it), X = V.X(it.x), Y = V.Y(it.y);
    if (it.type === "block" || it.type === "prism") fillPoly(ctx, V, els[0].pts, T.glass, mediumAlpha(MATERIALS[it.mat].n), T.ink);
    else if (it.type === "plane") planeMirror(ctx, V, T, els[0]);
    else if (it.type === "screen") {
      const ex = -Math.sin(it.ang), ey = Math.cos(it.ang);
      line(ctx, V, [it.x - ex * 7, it.y - ey * 7], [it.x + ex * 7, it.y + ey * 7], T.ink, 6); }
    else if (SPRITE_FOR[it.type]) {
      const k = (12 * V.sx) / 640, rot = -(it.type === "cmirror" || it.type === "vmirror" ? it.ang - Math.PI : it.ang);
      sprite(ctx, img[SPRITE_FOR[it.type]], 512, 512, k, rot, X, Y);
    }
  }
  drawRays(ctx, V, T, sandboxTrace(), { width: 2 });
  for (const it of st.sandbox.items) {
    const X = V.X(it.x), Y = V.Y(it.y);
    if (it.type === "raybox") lamp(ctx, V, img, [it.x, it.y], [Math.cos(it.ang), Math.sin(it.ang)], 8);
    if (it.type === "point") {
      const k = (5 * V.sx) / 907;
      sprite(ctx, img.candle, 512, 59, k, 0, X, Y);
    }
    if (it.id === st.sandbox.sel) {
      ctx.save(); ctx.strokeStyle = T.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(X, Y, Math.max(22, 7.5 * V.sx), 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    }
  }
  if (!st.sandbox.items.length) text(ctx, "Empty bench: add an item from the panel.", size.w / 2, size.h / 2, T.dim, "center", 15);
}
function pickItem(wx, wy) {
  let best = null, bd = Infinity;
  for (const it of st.sandbox.items) {
    const d = Math.hypot(wx - it.x, wy - it.y);
    if (d < bd) { bd = d; best = it; }
  }
  const tol = Math.max(7, 26 / (view?.sx || 1));
  return bd <= tol ? best : null;
}
let drag = null;
sc.addEventListener("pointerdown", (e) => {
  if (st.mode !== "sandbox" || !view) return;
  const r = sc.getBoundingClientRect(), wx = view.wx(e.clientX - r.left), wy = view.wy(e.clientY - r.top);
  const it = pickItem(wx, wy);
  if (it) {
    st.sandbox.sel = it.id; drag = { id: it.id, dx: it.x - wx, dy: it.y - wy };
    sc.setPointerCapture(e.pointerId); e.preventDefault();
  } else st.sandbox.sel = null;
  buildControls(); sync();
});
sc.addEventListener("pointermove", (e) => {
  if (!drag || st.mode !== "sandbox") return;
  const r = sc.getBoundingClientRect(), it = selItem();
  if (!it) return;
  it.x = Math.max(-49, Math.min(49, view.wx(e.clientX - r.left) + drag.dx));
  it.y = Math.max(-27, Math.min(27, view.wy(e.clientY - r.top) + drag.dy));
  dirty = true;
});
const endDrag = () => { if (drag) { drag = null; sync(); } };
sc.addEventListener("pointerup", endDrag); sc.addEventListener("pointercancel", endDrag);
sc.addEventListener("keydown", (e) => {
  if (st.mode !== "sandbox") return;
  const it = selItem();
  if (!it) return;
  const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
  if (mv) { it.x = Math.max(-49, Math.min(49, it.x + mv[0])); it.y = Math.max(-27, Math.min(27, it.y + mv[1])); }
  else if (e.key === "[" || e.key === "]") it.ang += (e.key === "[" ? 1 : -1) * Math.PI / 12;
  else if (e.key === "Delete" || e.key === "Backspace") { st.sandbox.items = st.sandbox.items.filter((x) => x !== it); st.sandbox.sel = null; buildControls(); }
  else return;
  e.preventDefault(); sync();
});

// ---------- loop ----------
// Nothing moves on its own, so the page only redraws when something changes
// (no animation, which also suits reduced motion).
function frame() {
  if (dirty) { dirty = false; resize(); draw(); }
  requestAnimationFrame(frame);
}
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
if (reducedMotion) document.documentElement.classList.add("reduced-motion");
window.addEventListener("resize", () => { dpr = Math.min(2, window.devicePixelRatio || 1); size.w = 0; resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(sc);
setMode(MODES.includes(st.mode) ? st.mode : "reflection");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__optics = { state: st, shown: () => shown(st.mode, st[st.mode]) };

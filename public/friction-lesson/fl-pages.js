// Dimitry's Friction Lesson v2: 26 pages in Leo's final order (spec.md, v2 ruling). Times are seconds from page enter.
// Interactive pages (6, 8, 9, 12, 14) add their own animations through the page timeline T, so Pause still holds them.
import { h, at, img, fx, needleX, STATIC_BOX as SB, EASE } from "./fl-engine.js";

export const LAB_URL = "https://popboard.us/study-friction";
const SWATCHES = ["felt", "cork", "plastic", "paper", "cloth", "cardboard", "aluminum"];
// Page 8 toggle labels: one constant so they can be relabeled in one place.
export const TEST_LABELS = ["Test A", "Test B", "Test C"];
// Materials photo slots (page 4). Drop Dimitry's photos at these paths (webp, about 800 px wide) and set the value;
// null keeps the pencil art.
export const PHOTOS = { carpet: null, scale: null, masses: null, cart: null }; // e.g. "friction-lesson/photos/carpet.webp"
// Spring scale readings read off friction-drop.mp4 (felt cart, all weights), seconds -> newtons, about +/- 0.5 N.
export const VIDEO_READINGS = [[0, 12.4], [0.5, 14.0], [1.0, 15.4], [1.5, 15.6], [1.75, 16.5], [2.0, 17.8], [2.5, 18.1], [2.8, 18.4], [3.0, 17.0], [3.1, 16.2], [3.2, 14.3], [3.3, 12.6], [3.4, 12.0], [4.0, 12.0], [5.0, 12.0]];
export const VIDEO_ZONES = { static: [0, 2.8], threshold: [2.8, 3.1], kinetic: [3.1, 5] };
export function readingAt(t, R = VIDEO_READINGS) {
  if (t <= R[0][0]) return R[0][1];
  for (let i = 1; i < R.length; i++) if (t <= R[i][0]) { const [t0, v0] = R[i - 1], [t1, v1] = R[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); }
  return R[R.length - 1][1];
}
// Sample kinetic data (page 8 and 9): grams on the 90 g cart, normal force, sample scale reading.
export const KDATA = [{ g: ["1000"], mass: 1090, FN: 10.7, Ff: 4.3 }, { g: ["1000", "500"], mass: 1590, FN: 15.6, Ff: 6.2 }, { g: ["1000", "500", "200"], mass: 1790, FN: 17.5, Ff: 7.0 }];
export const PEAKS = [7.8, 7.6, 8.0];
const sub = (s) => s.replace(/F_(\w+)/g, "F<sub>$1</sub>").replace(/μ_(\w)/g, "μ<sub>$1</sub>");

/* ---------- shared pieces ---------- */
/* ---------- shared pieces ---------- */
function card(scene, x, y, w, { keep = false, tilt = "" } = {}) {
  return at(scene, h("div", "card" + (keep ? " keep" : "") + (tilt ? " " + tilt : "")), x, y, w);
}
function say(scene, html, x, y, w, cls = "") { return at(scene, h("div", "say " + cls, fx(html)), x, y, w); }
function tag(parent, text, x, y, cls = "") { return at(parent, h("div", "tag " + cls, fx(text)), x, y); }

// Stack graph layers in one box so they register. names: draw order bottom to top.
function layers(parent, names) {
  const box = h("div", "layers");
  const L = {};
  names.forEach((n) => { L[n] = img(n); box.appendChild(L[n]); });
  parent.appendChild(box);
  return L;
}
const STATIC_ORDER = ["static_band_static", "static_band_threshold", "static_band_kinetic", "static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot", "static_label_max", "static_label_kinetic_eq", "region_label_static", "region_label_threshold", "region_label_kinetic", "region_tag_1", "region_tag_2", "region_tag_3"];
function staticGraph(parent, want) { return layers(parent, STATIC_ORDER.filter((n) => want.includes(n))); }

// Cream taped-in card behind a page's art (dark mode reads like v1).
function stage(scene) { scene.classList.add("staged"); const c = h("div", "card keep stage"); scene.prepend(c); return c; }
// Free-body arrows spread around the cart: pull off the hook side, friction off the back, mg below, F_N up beside the weights.
function fbd(sledG) {
  const pt = (l, b) => { const p = h("div", "p", null, { position: "absolute", left: l + "cqw", bottom: b + "cqw" }); sledG.appendChild(p); return p; };
  const A = [farrow(pt(33, 9.5), 0, 0, 7, 0, "#2F6DB5", sub("F_pull"), { top: "-5.3cqw", left: "0" }), farrow(pt(0.3, 0.8), 0, 0, 8, 180, "#B8322A", sub("F_friction"), { top: "1.4cqw", left: "0" }), farrow(pt(12, -0.5), 0, 0, 7, 90, "#6B6B6B", "mg", { top: "1.5cqw", left: "2cqw" }), farrow(pt(25, 10.6), 0, 0, 8, -90, "#2F7A40", sub("F_N"), { top: "1.5cqw", left: "2cqw" })];
  A[2].querySelector(".fl").classList.add("mg-l"); return A;
}
function carpet(scene, x, y, w) { const c = at(scene, img("carpet_strip", "cut carpet"), x, y, w); return c; }

// Force arrow growing from a point (x,y in % of parent), length in cqw, angle in deg.
function farrow(parent, x, y, len, deg, color, label, lpos = {}) {
  const a = at(parent, h("div", "farrow"), x, y);
  a.style.width = len + "cqw"; a.style.color = color; a.style.rotate = deg + "deg"; a.style.translate = "0 -50%";
  if (label) { const l = h("span", "fl", fx(label)); Object.assign(l.style, { color, ...lpos }); if (Math.abs(deg) === 180) l.style.rotate = "180deg"; if (deg === 90 || deg === -90) l.style.rotate = (-deg) + "deg"; a.appendChild(l); }
  return a;
}
function swatchRow(scene, x, y, w, { labels = true, size = 0.11 } = {}) {
  const row = at(scene, h("div", "", null, { display: "flex", justifyContent: "space-between", alignItems: "flex-end" }), x, y, w);
  const items = SWATCHES.map((s) => {
    const it = h("div", "", null, { width: size * 100 + "%" });
    it.appendChild(img("swatch_" + s));
    if (labels) it.appendChild(h("div", "lbl", s.toUpperCase()));
    row.appendChild(it);
    return it;
  });
  return { row, items };
}

function hookPage(n, title, hook, tryIt, wonder, art, extra = {}) {
  return {
    title, kicker: `ENRICHMENT (OPTIONAL) · FRICTION MYSTERY ${n} OF 7`,
    side: `<p class="wonder-row"><b><span class="ic">!</span> HOOK</b> ${hook}</p><p class="wonder-row side-only"><b><span class="ic">+</span> TRY IT</b> ${tryIt}</p><p class="wonder-row"><b class="q"><span class="ic">?</span> WONDER</b> <span class="q">${wonder}</span></p>${extra.side || ""}`,
    cap: wonder,
    build(scene, T) {
      const rows = [...document.querySelectorAll("#flSide .wonder-row")];
      [0, 1.2, 2.4].forEach((t, i) => rows[i] && T.fadeUp(rows[i], t, 0.5));
      art(scene, T);
    },
  };
}

// Leo's v2 weights: sizes in proportion (rendered width in cqw of the rig box), labels drawn in code.
const WEIGHTS = { "1000": ["weight_1kg", 11, 379 / 339, "1 kg"], "500": ["weight_500g", 8.6, 323 / 266, "500 g"], "200": ["weight_200g", 6.75, 264 / 208, "200 g"], "100": ["weight_100g", 4.6, 196 / 142, "100 g"] };
function weightEl(g, unit = "cqw") {
  const [name, w, ar, label] = WEIGHTS[g];
  const d = h("div", "wt", null, { width: w + unit });
  d.append(img(name), h("span", "wt-l", label));
  d.dataset.g = g; d._h = w * ar;
  return d;
}
// Stack weights on the sled top, centered at cx (cqw). Each cylinder sits into the top ellipse of the one below.
function stack(parent, list, cx = 16, base = 10.6) {
  const W = {}; let b = base;
  list.forEach((g) => { const d = weightEl(g); d.classList.add("r"); d.style.left = (cx - WEIGHTS[g][1] / 2) + "cqw"; d.style.bottom = b + "cqw"; parent.appendChild(d); W[g] = d; b += d._h * 0.78; });
  return W;
}
// Code-drawn tick strip that sits over the blank tube of hand_pull_with_scale (0 N near the hand, 20 N near the hook).
function strip() {
  const s = h("div", "strip");
  const ticks = Array.from({ length: 21 }, (_, n) => { const x = needleX(n); return `<line x1="${x}" x2="${x}" y1="${n % 4 ? 62 : 48}" y2="100" />` + (n % 4 ? "" : `<text x="${x}" y="40">${n}</text>`); }).join("");
  s.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${ticks}</svg><span class="s-unit">N</span>`;
  const needle = h("div", "needle"); s.appendChild(needle);
  return { s, needle };
}
// Sled + weights + string + Leo's hand-and-scale piece, with soft pencil shadows. The hand is scaled to the sled height.
function rig(scene, x, y, w, { weights = ["1000"], reading = false, hand = true } = {}) {
  const r = at(scene, h("div", "rig"), x, y, w);
  const sledG = h("div", "r", null, { inset: "0" });
  sledG.append(h("div", "r pshadow", null, { left: "-1cqw", bottom: "-1.6cqw", width: "36cqw" }));
  const sled = img("sled", "cut r sled"); sledG.appendChild(sled);
  const W = stack(sledG, weights);
  const pull = h("div", "r", null, { inset: "0" });
  let needle = null, scale = null, readEl = null;
  if (hand) {
    pull.append(h("div", "r pshadow", null, { left: "41cqw", bottom: "-1.6cqw", width: "40cqw" }), h("div", "r string"));
    scale = h("div", "r scale2"); scale.appendChild(img("hand_pull_with_scale", "cut", "Hand pulling a spring scale"));
    const st = strip(); scale.appendChild(st.s); needle = st.needle; needle.style.left = needleX(0) + "%";
    pull.appendChild(scale);
    if (reading) { readEl = h("div", "r reading", "0.0 N"); pull.appendChild(readEl); }
  }
  r.append(sledG, pull);
  return { r, sledG, sled, W, pull, needle, scale, readEl };
}
// Small presenter button placed in the scene.
function sbtn(scene, label, x, y, onClick, cls = "") {
  const b = at(scene, h("button", "pencil-btn sbtn " + cls, label), x, y); b.type = "button"; b.onclick = onClick; return b;
}

function video() {
  const v = h("video", "vid");
  Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: "auto", poster: "friction-lesson/media/friction-drop-poster.webp" });
  v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-label", "Video: felt on carpet, full weights on the cart");
  v.src = "friction-lesson/media/friction-drop.mp4";
  const p = v.play(); if (p && p.catch) p.catch(() => {});
  return v;
}

/* ---------- page 6: asperities model (pure, exported for tests) ---------- */
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
export function profiles() {
  const r = rand(7), top = [], bot = [];
  for (let x = 0; x <= 1000; x += 25) { const tip = (x / 25) % 2 === 1; top.push([x, tip ? 150 + 20 + r() * 34 : 140 + r() * 6]); }
  for (let x = 12; x <= 1012; x += 25) { const tip = ((x - 12) / 25) % 2 === 1; bot.push([x, tip ? 250 - 20 - r() * 34 : 256 - r() * 6]); }
  return { top, bot };
}
const lerpY = (P, x) => { for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return P[P.length - 1][1]; };
export function gapMin(P = profiles()) { let m = 1e9; for (let x = 15; x <= 995; x += 1) m = Math.min(m, lerpY(P.bot, x) - lerpY(P.top, x)); return m; }
// Squeeze depth for a load in grams: the block's own weight just closes the gap, extra load presses deeper.
export function squeeze(grams, P = profiles()) { return gapMin(P) + 2 + 26 * Math.sqrt(Math.min(grams, 1800) / 1800); }
export function contactFraction(d, P = profiles()) { let n = 0, c = 0; for (let x = 15; x <= 995; x += 2) { n++; if (lerpY(P.top, x) + d > lerpY(P.bot, x)) c++; } return c / n; }

/* ---------- page 9: graph helpers ---------- */
export function fitLine(pts) { const n = pts.length, sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0), sxx = pts.reduce((a, p) => a + p[0] * p[0], 0), sxy = pts.reduce((a, p) => a + p[0] * p[1], 0); const m = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { m, b: (sy - m * sx) / n }; }
const PENCIL = `<filter id="pencilF" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>`;

const GUIDE = {}; // page number -> guide text shown when narration is off

/* ---------- the pages ---------- */
export const PAGES = [
  { // 1 cover
    title: "Friction Lab:", kicker: "PHYSICS I", noKicker: true, centered: true,
    cap: "WHICH SURFACE GRABS HARDEST?",
    guide: "Jasper pushes a heavy crate. His push points one way, and friction pushes back the other way. Today: which surface grabs hardest?",
    build(scene, T) {
      const c = card(scene, 17, 21, 66); c.classList.add("cover-card"); const pic = img("cover_jasper_push", "cut", "Jasper the wildcat pushing a wooden crate; push arrow forward, friction arrow back");
      c.appendChild(pic);
      T.fade(c, 0, 0.8); T.A(c, [{ transform: "rotate(2deg) scale(.96)" }, { transform: "rotate(0deg) scale(1)" }], 0, 0.9);
      T.A(pic, [{ transform: "scale(1)" }, { transform: "scale(1.035) translateX(-.6%)" }, { transform: "scale(1)" }], 1, 9, EASE.inout, { iterations: Infinity });
      const ft = at(scene, h("div", "say big cover-t", "<span class='kicker cover-k'>PHYSICS I</span><br>Friction Lab: <span class='t-head'>WHICH SURFACE GRABS HARDEST?</span>"), 4, 1, 92);
      ft.style.textAlign = "center";
      T.wipe(ft, 0.6, 1.0, 0, 1, EASE.out);
    },
  },
  { // 2 learning targets on black
    title: "LEARNING TARGETS", kicker: "TODAY · WHAT YOU WILL BE ABLE TO DO", centered: true, black: true,
    cap: "Three targets for today.",
    guide: "Learning Targets: by the end of class you can measure friction and normal force, find μk from a graph, and measure μs and compare it with μk.",
    build(scene, T) {
      const g = at(scene, img("learning_targets", "cut", "Learning Targets: an arrow in a bullseye"), 5, 6, 29); T.pop(g, 0, 0.6);
      T.A(g, [{ transform: "rotate(0)" }, { transform: "rotate(-1.5deg)" }, { transform: "rotate(0)" }], 0.8, 0.6, EASE.inout);
      const rows = ["I can measure friction force and normal force.", "I can find the coefficient of kinetic friction (μk) from a graph.", "I can measure the coefficient of static friction (μs) and compare it with μk."];
      rows.forEach((t, i) => {
        const r = at(scene, h("div", "lt-row", `<span class="lt-n">${i + 1}</span><span>${fx(t)}</span>`), 40, 16 + i * 24, 56);
        T.slideIn(r, 0.8 + i * 0.9, 0.6, 4, 0);
      });
    },
  },
  { // 3 lab groups
    title: "FORM LAB GROUPS", kicker: "SET UP · TEAMS", centered: true,
    cap: "Split into lab groups of 2 to 4. Three is ideal.",
    guide: "Lab groups: get into a group of 2 to 4 people. Three is ideal: one pulls, one reads the scale, one records.",
    build(scene, T) {
      const hd = say(scene, "Split into lab groups of 2 to 4", 6, 4, 88, "big"); hd.style.textAlign = "center"; T.wipe(hd, 0, 0.8, 0, 1, EASE.out);
      const groups = [[2, 6], [3, 37], [4, 70]];
      groups.forEach(([n, x], gi) => {
        const tbl = at(scene, h("div", "grp" + (n === 3 ? " ideal" : "")), x, 18, 26);
        tbl.innerHTML = `<svg viewBox="0 0 260 200" aria-label="${n} students around a lab bench">${PENCIL}<g filter="url(#pencilF)"><ellipse cx="130" cy="150" rx="110" ry="30" fill="#E9D9B8" stroke="#24339E" stroke-width="3"/>${Array.from({ length: n }, (_, i) => { const cx = 130 + (i - (n - 1) / 2) * 56, col = ["#2F6DB5", "#B8322A", "#2F7A40", "#D9822B"][i]; return `<g class="kid"><circle cx="${cx}" cy="60" r="20" fill="#F4D7B5" stroke="#3D3D3D" stroke-width="3"/><path d="M${cx - 26} 128 Q${cx} 70 ${cx + 26} 128Z" fill="${col}" fill-opacity=".75" stroke="#3D3D3D" stroke-width="3"/></g>`; }).join("")}</g></svg><div class="lbl grp-n">${n} students</div>`;
        T.fade(tbl, 0.6 + gi * 0.5, 0.4);
        tbl.querySelectorAll(".kid").forEach((k, i) => { k.style.transformBox = "fill-box"; k.style.transformOrigin = "50% 100%"; T.pop(k, 0.8 + gi * 0.5 + i * 0.15); });
      });
      const star = at(scene, h("div", "chip ideal-chip", "★ 3 is ideal"), 41, 62); T.pop(star, 2.6); T.wiggle(star, 3.0, 4, 0.8);
      const roles = at(scene, h("div", "roles", "<span>puller</span><span>scale reader</span><span>recorder</span>"), 30, 74, 40); T.fadeUp(roles, 3.4);
      [2, 4].forEach((n, i) => { const t = at(scene, h("div", "lbl t-aside ok-l", "OK"), [14, 79][i], 62); T.fade(t, 2.2); });
    },
  },
  { // 4 materials per group
    title: "MATERIALS PER GROUP", kicker: "SET UP · FROM THE FRICTION ACTIVITY SHEET",
    side: `<p>Each group gets:</p><ul><li>Carpet: use the floor strip</li><li>Spring scale, 0 to 20 N</li><li>Mass set: 1000 g, 500 g, 200 g</li><li>Your cart: choose a station cart</li></ul><p class="aside">Plus your Friction Activity sheet and a pencil.</p>`,
    cap: "Carpet · Spring scale (0 to 20 N) · Mass set · Your station cart",
    guide: "Materials: each group needs the carpet strip, one spring scale that reads 0 to 20 N, the 1000 g, 500 g and 200 g masses, and one station cart.",
    build(scene, T) {
      const items = [["carpet", "Carpet", "Use the floor", "carpet_strip"], ["scale", "Spring Scale", "0 to 20 N", "spring_scale"], ["masses", "Mass Set", "1000 g · 500 g · 200 g", null], ["cart", "Your Cart", "Choose a station cart", "sled"]];
      items.forEach(([key, name, note, art], i) => {
        const c = card(scene, 3 + (i % 2) * 49, 14 + Math.floor(i / 2) * 43, 45, { keep: true }); c.classList.add("mat-card"); c.style.rotate = (i % 2 ? 1.2 : -1.2) + "deg";
        const ph = h("div", "mat-pic"); ph.dataset.slot = "photos/" + key;
        if (PHOTOS[key]) { const im = new Image(); im.src = PHOTOS[key]; im.alt = name; im.className = "cut photo"; ph.appendChild(im); }
        else if (art) ph.appendChild(img(art, "cut", name));
        else { const row = h("div", "mass-row"); ["1000", "500", "200"].forEach((g) => { const w = weightEl(g, "cqw"); w.style.width = WEIGHTS[g][1] * 0.75 + "cqw"; row.appendChild(w); }); ph.appendChild(row); }
        c.append(ph, h("div", "mat-name", name), h("div", "mat-note", note));
        T.drop(c, 0.3 + i * 0.45, 6, 0.5);
      });
      const pc = card(scene, 36, 1, 28, { keep: true }); pc.classList.add("stamp-card"); const per = h("div", "stamp", "× 1 PER GROUP"); pc.appendChild(per); T.pop(pc, 2.4);
    },
  },
  { // 5 surface materials + predict (v1 pages 3 and 6)
    title: "PREDICT & CLAIM YOUR STATION", kicker: "ENGAGE · SEVEN SURFACE MATERIALS",
    side: `<p>7 stations: felt, cork, plastic, paper, cloth, cardboard, aluminum, all pulled across the same carpet.</p><p class="q" id="p5q">Predict: which needs the MOST force to pull? The LEAST? Write down why.</p><p>▲▼ Claim the station you predict is highest OR lowest. First come, first served.</p><p id="p5r">↺ If yours is taken, pick from what is left.</p>`,
    cap: "Predict: which needs the MOST force to pull? The LEAST? Write down why.",
    guide: "Seven cart bottoms, one carpet. Predict which material needs the most force to pull and which needs the least, write down why, then claim a station.",
    build(scene, T) {
      const cp = carpet(scene, 2, 70, 96); T.wipe(cp, 0, 0.8, 0, 1, EASE.out);
      const { items } = swatchRow(scene, 4, 34, 92, { size: 0.12 });
      items.forEach((it, i) => { const n = h("div", "lbl t-title", String(i + 1)); n.style.fontSize = "2.4cqw"; it.prepend(n); T.drop(it, 0.6 + i * 0.22, 3); });
      const most = at(scene, h("div", "chip red", "MOST force?"), 6, 6); most.style.fontSize = "2.6cqw"; T.pop(most, 2.6);
      const least = at(scene, h("div", "chip", "LEAST force?"), 30, 6); least.style.fontSize = "2.6cqw"; T.pop(least, 3.0);
      const why = at(scene, h("div", "sticky", "Write down WHY."), 58, 3, 20); T.pop(why, 3.4); T.wiggle(why, 3.8, 3, 0.6);
      const q = say(scene, "?", 83, 2, 6, "big"); q.style.fontSize = "7cqw"; q.style.color = "var(--red)"; T.fade(q, 3.6, 0.2); T.wiggle(q, 3.8, 6, 0.6);
      T.fade(document.getElementById("p5q"), 2.6); T.fade(document.getElementById("p5r"), 4.2);
      const first = at(scene, h("div", "chip", "▲▼ claim highest OR lowest · first come, first served"), 14, 90); first.style.fontSize = "1.9cqw"; T.pop(first, 4.4);
    },
  },
  { // 6 interactive asperities
    title: "WHY SURFACES GRIP", kicker: "EXPLORE · ASPERITIES",
    side: `<p>Even smooth-looking surfaces are mountain ranges at the microscopic scale. These tiny peaks are called asperities.</p><p id="p6a"><b>1.</b> Drag the magnifying glass over the block to zoom in.</p><p id="p6b"><b>2.</b> Drag weights onto the block (or tap them). Watch the tips squash and merge.</p><p class="q">More load (bigger FN): more real contact, more friction.</p>`,
    cap: "Drag the magnifier over the block, then load it with weights.",
    guide: "Asperities: drag the magnifier over the block to zoom in. Only the tips touch. Add weights and the tips squash together, so there is more real contact and more friction.",
    build(scene, T) {
      stage(scene); const P = profiles();
      carpet(scene, 6, 70.8, 88);
      const R = rig(scene, 20, 12.6, 88, { weights: [], hand: false });
      R.r.classList.add("p6-rig");
      T.fade(R.r, 0, 0.4);
      const zone = at(R.sledG, h("div", "dropzone"), 0, null); zone.style.cssText += "left:2cqw;bottom:10cqw;width:30cqw;height:26cqw;";
      const tray = at(scene, h("div", "tray"), 74, 46, 20); tray.innerHTML = `<div class="lbl">weights</div>`;
      const tr = h("div", "tray-row"); tray.appendChild(tr);
      ["100", "200", "500", "1000"].forEach((g) => { const w = weightEl(g); w.style.width = WEIGHTS[g][1] * 0.42 + "cqw"; w.classList.add("drag"); w.tabIndex = 0; w.setAttribute("role", "button"); w.setAttribute("aria-label", "Add " + WEIGHTS[g][3]); tr.appendChild(w); });
      T.fade(tray, 0.6);
      const mag = at(scene, h("div", "mag"), 56, 3, 13); mag.appendChild(img("magnifying_glass", "cut", "Magnifying glass: drag it over the block")); mag.tabIndex = 0; mag.setAttribute("role", "button"); mag.setAttribute("aria-label", "Zoom in on the block");
      T.pop(mag, 0.8); T.A(mag, [{ transform: "translate(0,0)" }, { transform: "translate(-1cqw,1cqw)" }, { transform: "translate(0,0)" }], 1.4, 1.2, EASE.inout, { iterations: 2 });
      const hint = h("div", "chip drag-cue", "drag me ↙"); mag.appendChild(hint); T.pop(hint, 1.2); T.loop(hint, [{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(-.6cqw,.4cqw) rotate(-4deg)" }, { transform: "translate(0,0) rotate(0)" }], 1.8, 1.2);
      // zoom view
      const zv = at(scene, h("div", "zoomv"), 50, 1, 27); zv.style.opacity = 0; zv.style.pointerEvents = "none";
      const path = (pts, close) => "M" + pts.map((p) => p.join(" ")).join(" L") + close;
      const topD = path(P.top, " L1000 0 L0 0Z"), botD = path(P.bot, " L1012 400 L12 400Z");
      zv.innerHTML = `<div class="lens"><svg viewBox="300 20 400 360" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Magnified view: block asperities above, carpet asperities below">
        <defs>${PENCIL}<pattern id="woodH" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><line x1="0" y1="0" x2="0" y2="10" stroke="#8B5A2B" stroke-width="2" opacity=".5"/></pattern>
        <pattern id="carpH" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="8" stroke="#4C5D78" stroke-width="2" opacity=".45"/></pattern>
        <clipPath id="blkClip"><path class="blkmove" d="${topD}"/></clipPath></defs>
        <rect width="1000" height="400" fill="#FFFDF6"/>
        <g filter="url(#pencilF)"><path d="${botD}" fill="#B9C2CF"/><path d="${botD}" fill="url(#carpH)" stroke="#3D4A60" stroke-width="3"/>
        <g class="blkmove"><path d="${topD}" fill="#D9AE78"/><path d="${topD}" fill="url(#woodH)" stroke="#6B4320" stroke-width="3"/></g>
        <g clip-path="url(#blkClip)"><path d="${botD}" fill="#B8322A" fill-opacity=".8"/></g></g>
        <text x="500" y="118" text-anchor="middle" class="zt">wood block</text><text x="500" y="318" text-anchor="middle" class="zt">carpet</text></svg></div><div class="lens-h"></div>
        <div class="zread"><span>real contact</span><i><b></b></i><span class="zpct"></span></div><div class="zload chip">load: block only</div>`;
      const movers = [...zv.querySelectorAll(".blkmove")], bar = zv.querySelector(".zread b"), pct = zv.querySelector(".zpct"), loadC = zv.querySelector(".zload");
      let grams = 0, d = squeeze(0, P) - 6, zoomed = false, stackTop = 10.6;
      const setD = (nd, dur) => { movers.forEach((m) => T.A(m, [{ transform: `translateY(${d}px)` }, { transform: `translateY(${nd}px)` }], 0, dur, EASE.inout, { fill: "forwards" })); d = nd; const f = contactFraction(nd, P); T.A(bar, [{ width: bar.style.width || "0%" }, { width: (f * 100).toFixed(0) + "%" }], 0, dur, EASE.inout, { fill: "forwards" }); bar.style.width = (f * 100).toFixed(0) + "%"; pct.textContent = Math.round(f * 100) + "%"; };
      movers.forEach((m) => { m.style.transform = `translateY(${d}px)`; });
      function zoom() {
        if (zoomed) return; zoomed = true; zv.style.pointerEvents = "";
        const ZD = 1.75; // slowed zoom, seconds
        zv.style.transformOrigin = "70% 20%";
        T.A(zv, [{ opacity: 0 }, { opacity: 1 }], 0, 0.5);
        T.A(zv, [{ transform: "scale(.12)" }, { transform: "scale(1)" }], 0, ZD, EASE.inout);
        T.A(mag, [{ opacity: 1 }, { opacity: 0 }], 0, 0.6);
        if (T.reduced) { zv.style.opacity = 1; mag.style.opacity = 0; const b6 = document.getElementById("p6b"); if (b6) b6.style.opacity = 1; zv.getAnimations().concat(mag.getAnimations()).forEach((a) => { try { a.finish(); } catch {} }); }
        setTimeout(() => setD(squeeze(grams, P), 0.9), T.reduced ? 0 : ZD * 1000);
        if (T.reduced) setD(squeeze(grams, P), 0.01);
        if (!T.reduced) T.fade(document.getElementById("p6b"), 1.0);
      }
      function add(g) {
        if (grams + +g > 2400) return;
        if (!zoomed) zoom();
        grams += +g; const w = weightEl(g); w.classList.add("r"); w.style.left = (16 - WEIGHTS[g][1] / 2) + "cqw"; w.style.bottom = stackTop + "cqw"; stackTop += w._h * 0.78; R.sledG.appendChild(w); T.drop(w, 0, 6, 0.4);
        loadC.textContent = "load: block + " + (grams >= 1000 ? (grams / 1000).toFixed(1) + " kg" : grams + " g");
        setD(squeeze(grams, P), 0.8);
      }
      // dragging: pointer events on the scene, positions in scene percent
      const rect = () => scene.getBoundingClientRect();
      const over = (el, x, y, pad = 0) => { const b = el.getBoundingClientRect(); return x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad; };
      function draggable(el, { onMove, onDrop, onTap }) {
        el.addEventListener("pointerdown", (e) => {
          e.preventDefault(); el.setPointerCapture(e.pointerId);
          const sx = e.clientX, sy = e.clientY, ghost = el === mag ? mag : el.cloneNode(true); let moved = false;
          if (ghost !== mag) { ghost.classList.add("ghost"); scene.appendChild(ghost); ghost.style.width = el.getBoundingClientRect().width / rect().width * 100 + "%"; }
          const start = el === mag ? [parseFloat(mag.style.left), parseFloat(mag.style.top)] : null;
          const mv = (ev) => {
            const r = rect(), dx = (ev.clientX - sx) / r.width * 100, dy = (ev.clientY - sy) / r.height * 100; if (Math.abs(dx) + Math.abs(dy) > 0.8) moved = true;
            if (start) { mag.style.left = start[0] + dx + "%"; mag.style.top = start[1] + dy + "%"; }
            else { ghost.style.left = (ev.clientX - r.left) / r.width * 100 - 3 + "%"; ghost.style.top = (ev.clientY - r.top) / r.height * 100 - 5 + "%"; }
            onMove && onMove(ev);
          };
          const up = (ev) => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); if (ghost !== mag) ghost.remove(); if (!moved) onTap && onTap(); else onDrop && onDrop(ev); };
          el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up);
        });
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onTap && onTap(); } });
      }
      draggable(mag, { onMove: (ev) => { const lens = mag.getBoundingClientRect(); const cx = lens.left + lens.width * 0.37, cy = lens.top + lens.height * 0.37; if (over(R.sled, cx, cy)) zoom(); }, onTap: zoom });
      tr.querySelectorAll(".wt").forEach((w) => draggable(w, { onDrop: (ev) => { if (over(zone, ev.clientX, ev.clientY, 40) || over(R.sled, ev.clientX, ev.clientY, 40)) add(w.dataset.g); }, onTap: () => add(w.dataset.g) }));
      sbtn(scene, "↺ Reset", 87, 92, () => window.__fl.render(window.__fl.state.i));
      T.fade(document.getElementById("p6a"), 0.8);
      return { demo() { zoom(); ["1000", "500", "200"].forEach(add); if (T.reduced) scene.getAnimations({ subtree: true }).forEach((an) => { try { if (an.effect.getTiming().iterations !== Infinity) an.finish(); } catch {} }); } };
    },
  },
  { // 7 constant-velocity pull loop (v1 pages 5 and 7)
    title: "PULL AT CONSTANT SPEED", kicker: "EXPLAIN · FORCES ON THE CART",
    side: `<p>Four forces: F_pull forward, F_friction backward, gravity (mg) down, F_N up.</p><p id="p7a" class="t-head">Level surface: F_N = mg</p><p id="p7b" class="t-head">Constant velocity: F_friction = F_pull</p><p id="p7c">Pull at constant speed, i.e. a constant force reading on the spring scale.</p>`,
    cap: "Constant velocity: F_friction = F_pull",
    guide: "The cart slides at a constant speed. The scale reading stays the same, so the pull balances friction. On a level surface F_N = mg.",
    build(scene, T) {
      stage(scene); carpet(scene, 0, 55, 100);
      const R = rig(scene, 9, 12, 60, { weights: ["1000"] });
      T.fade(R.r, 0, 0.4);
      T.needle(R.needle, 0.3, 0.6, 0, 4.3, EASE.out);
      T.A(R.needle, [{ translate: "-50% 0" }, { translate: "-40% 0" }, { translate: "-58% 0" }, { translate: "-50% 0" }], 1, 0.9, EASE.inout, { iterations: Infinity });
      T.A(R.r, [{ transform: "translateX(0)" }, { transform: "translateX(36cqw)" }], 1, 5, EASE.linear, { iterations: Infinity });
      T.A(R.r, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.92 }, { opacity: 0, offset: 1 }], 1, 5, EASE.linear, { iterations: Infinity });
      const arrows = fbd(R.sledG);
      arrows.forEach((a, i) => T.grow(a, 0.4 + i * 0.3, 0.4));
      const lines = ["Level surface: F_N = mg", "Constant velocity: F_friction = F_pull", "Pull at constant speed, i.e. a constant force reading on the spring scale."];
      lines.forEach((l, i) => { const n = at(scene, h("div", "say eqline" + (i === 2 ? " small" : ""), sub(l)), 4, 2 + i * 7, 60); T.fadeUp(n, 2 + i * 0.9); });
      ["p7a", "p7b", "p7c"].forEach((id, i) => T.fade(document.getElementById(id), 2 + i * 0.9));
      const steady = at(scene, h("div", "chip", "steady reading 4.3 N (sample)"), 64, 24); T.pop(steady, 1.6);
    },
  },
  { // 8 Test A / B / C toggles
    title: "PART 1: KINETIC FRICTION", kicker: "EXPLORE · COLLECT",
    side: `<p>Collect: pull your station cart with 3 weight loads at a steady speed.</p><ul><li>${TEST_LABELS[0]}: 1000 g + 90 g cart</li><li>${TEST_LABELS[1]}: 1000 g + 500 g + 90 g cart</li><li>${TEST_LABELS[2]}: 1000 g + 500 g + 200 g + 90 g cart</li></ul><p>Record total mass, F_N, and F_pull = Ff,kinetic. Trial as many times as needed.</p><p class="aside">Hard to read? Do another trial.</p><p><a class="lab-link" href="${LAB_URL}" target="_blank" rel="noopener">Online Friction Lab ↗</a></p>`,
    cap: "Pull at a steady speed and record the reading for each test.",
    guide: "Three tests: tap a test to load the cart. Pull at a steady speed and read the scale. Heavier load, bigger normal force, bigger reading. Numbers shown are a sample.",
    build(scene, T) {
      stage(scene); carpet(scene, 0, 59, 100);
      const R = rig(scene, 9, 18, 60, { weights: [] }); T.fade(R.r, 0, 0.4);
      fbd(R.sledG).forEach((a, i) => T.grow(a, 0.4 + i * 0.2, 0.4));
      const info = at(scene, h("div", "chip test-info"), 4, 88); info.style.opacity = 0;
      let W = {}, mine = [], cur = -1, prev = 0;
      const btns = TEST_LABELS.map((l, i) => { const b = sbtn(scene, l, 4 + i * 15, 4, () => select(i), "toggle"); b.setAttribute("aria-pressed", "false"); return b; });
      function select(i) {
        if (i === cur) return; cur = i;
        mine.forEach((a) => a && a.cancel()); mine = [];
        Object.values(W).forEach((w) => w.remove());
        btns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
        const k = KDATA[i]; W = stack(R.sledG, k.g);
        k.g.forEach((g, j) => mine.push(T.drop(W[g], 0.1 + j * 0.35, 10, 0.4)));
        info.innerHTML = `${TEST_LABELS[i]}: ${k.g.map((g) => g + " g").join(" + ")} + 90 g cart = ${k.mass} g · ${fx("FN")} = ${k.FN} N · reading ${k.Ff.toFixed(1)} N <span class="t-aside">sample</span>`;
        mine.push(T.pop(info, 0.2));
        const t0 = 0.3 + k.g.length * 0.35;
        mine.push(T.needle(R.needle, t0, 0.5, prev, k.Ff, EASE.out)); prev = k.Ff;
        mine.push(T.A(R.r, [{ transform: "translateX(0)" }, { transform: "translateX(36cqw)" }], t0 + 0.4, 5, EASE.linear, { iterations: Infinity }));
        mine.push(T.A(R.r, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.92 }, { opacity: 0, offset: 1 }], t0 + 0.4, 5, EASE.linear, { iterations: Infinity }));
      }
      select(0);
      return { demo() { select(2); } };
    },
  },
  { // 9 graph, proportionality walkthrough, y = mx + b
    title: "GRAPH IT & FIND THE EQUATION", kicker: "EXPLAIN · F_f VS F_N",
    side: `<p>x-axis F_N (N), y-axis F_f (N).</p><p>Use the buttons: <b>Plot points</b>, <b>Plot best fit</b>, then <b>Zoom out</b> to see where the line goes.</p><p>Then press <b>Next →</b> to build the equation step by step.</p><p class="q" id="p9q" style="opacity:0">What does the slope tell you about your material?</p>`,
    cap: "Plot points · Plot best fit · Zoom out · Next → builds the equation",
    guide: "Graph: friction force against normal force for the three tests. The best-fit line passes through (0, 0), so friction is directly proportional to F_N. Next steps turn that into F_f = μk F_N.",
    build(scene, T) {
      const c = card(scene, 2, 3, 42, { keep: true }); c.style.rotate = "-.8deg"; c.classList.add("p9-graph");
      const svg = h("div", "graph"); c.appendChild(svg); T.fade(c, 0, 0.4);
      const pts = KDATA.map((k) => [k.FN, k.Ff]), fit = fitLine(pts);
      const st = { v: [9, 19, 3, 8], pts: false, line: 0, origin: false };
      const X0 = 70, X1 = 585, Y0 = 380, Y1 = 18;
      function draw() {
        const [a, b, c2, d2] = st.v, sx = (x) => X0 + (x - a) / (b - a) * (X1 - X0), sy = (y) => Y0 - (y - c2) / (d2 - c2) * (Y0 - Y1);
        const stepX = (b - a) > 12 ? 2 : 1, stepY = (d2 - c2) > 6 ? 1 : 0.5; let g = "";
        for (let x = Math.ceil(a / stepX) * stepX; x <= b + 1e-9; x += stepX) g += `<line x1="${sx(x)}" x2="${sx(x)}" y1="${Y1}" y2="${Y0}" class="gl"/><text x="${sx(x)}" y="${Y0 + 22}" class="gt">${+x.toFixed(1)}</text>`;
        for (let y = Math.ceil(c2 / stepY) * stepY; y <= d2 + 1e-9; y += stepY) g += `<line x1="${X0}" x2="${X1}" y1="${sy(y)}" y2="${sy(y)}" class="gl"/><text x="${X0 - 8}" y="${sy(y) + 5}" class="gt" text-anchor="end">${+y.toFixed(1)}</text>`;
        const L = st.line ? (() => { const xa = Math.max(a, 0), xb = xa + (b - xa) * st.line; return `<line x1="${sx(xa)}" y1="${sy(fit.m * xa + fit.b)}" x2="${sx(xb)}" y2="${sy(fit.m * xb + fit.b)}" class="fit"/>`; })() : "";
        const P = st.pts ? pts.map(([x, y], i) => `<circle cx="${sx(x)}" cy="${sy(y)}" r="9" class="dot"/><text x="${sx(x) + 12}" y="${sy(y) - 12}" class="dl">${"ABC"[i]}</text>`).join("") : "";
        const O = st.origin ? `<circle cx="${sx(0)}" cy="${sy(0)}" r="16" class="oring"/><text x="${sx(0) + 30}" y="${sy(0) - 40}" class="dl">(0, 0)</text>` : "";
        svg.innerHTML = `<svg viewBox="0 0 600 440" role="img" aria-label="Graph of friction force against normal force">${PENCIL}<rect x="${X0}" y="${Y1}" width="${X1 - X0}" height="${Y0 - Y1}" fill="#FFFDF6"/><g filter="url(#pencilF)">${g}<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" class="ax"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" class="ax"/>${L}${P}${O}</g><text x="${(X0 + X1) / 2}" y="434" class="axl">F<tspan baseline-shift="sub" font-size="70%">N</tspan> (N)</text><text x="18" y="${(Y0 + Y1) / 2}" class="axl" transform="rotate(-90 18 ${(Y0 + Y1) / 2})">F<tspan baseline-shift="sub" font-size="70%">f</tspan> (N)</text></svg>`;
      }
      draw();
      const tween = (dur, f, done) => { if (T.reduced) { f(1); done && done(); return; } const t0 = performance.now(); const tick = (now) => { if (!svg.isConnected) return; const p = Math.min(1, (now - t0) / (dur * 1000)); f(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2); if (p < 1) requestAnimationFrame(tick); else done && done(); }; requestAnimationFrame(tick); };
      const plot = () => { st.pts = true; draw(); svg.querySelectorAll(".dot").forEach((d, i) => { d.style.transformBox = "fill-box"; d.style.transformOrigin = "center"; T.A(d, [{ transform: "scale(0)" }, { transform: "scale(1)" }], i * 0.35, 0.35, EASE.back); }); };
      const best = () => { if (!st.pts) plot(); tween(1.2, (p) => { st.line = p; draw(); }); };
      const zoomOut = () => { if (!st.line) { st.pts = true; st.line = 1; } const v0 = st.v.slice(), v1 = [0, 20, 0, 10]; tween(2.2, (p) => { st.v = v0.map((x, i) => x + (v1[i] - x) * p); st.line = 1; draw(); }, () => { st.origin = true; draw(); const o = svg.querySelector(".oring"); if (o) { o.style.transformBox = "fill-box"; o.style.transformOrigin = "center"; T.pulse(o, 0, 1.4, 0.6, 2); } }); };
      const brow = at(scene, h("div", "btnrow"), 2, 89, 96); [["● Plot points", plot], ["╱ Plot best fit", best], ["⤢ Zoom out", zoomOut]].forEach(([l, fn]) => { const b = h("button", "pencil-btn sbtn", l); b.type = "button"; b.onclick = fn; brow.appendChild(b); });
      const panel = at(scene, h("div", "proof"), 46, 2, 52); const trail = h("div", "trail"); const summary = h("div", "summary card keep"); panel.append(trail);
      const L = [
        "The points line up on a straight line through (0, 0): a <b>directly proportional</b> linear relationship.",
        `<span class="big-eq">F<sub>f</sub> ∝ F<sub>N</sub></span>`,
        `Add a constant of proportionality to make an equality: <span class="big-eq">F<sub>f</sub> = μ<sub>k</sub> F<sub>N</sub></span>`,
        "μ<sub>k</sub> is the <b>coefficient of kinetic friction</b>.",
        `Solve for μ<sub>k</sub> and plug in values: <span class="big-eq">μ<sub>k</sub> = F<sub>f</sub> / F<sub>N</sub></span> = 7.0 N / 17.5 N = <b>0.40</b> <span class="t-aside">(sample, Test C)</span>`,
        `<b>Another method:</b> y = m x + b. With y = F<sub>f</sub>, m = μ<sub>k</sub> (the slope), x = F<sub>N</sub>, and b = 0 (the line passes through zero): <span class="big-eq">F<sub>f</sub> = μ<sub>k</sub> F<sub>N</sub></span> again.`,
        `<span class="q">What does the slope tell you about your material?</span>`,
      ].map((t, i) => { const p = h("p", "pf" + (i === 5 ? " alt" : ""), t); p.style.opacity = 0; panel.appendChild(p); return p; });
      panel.appendChild(summary);
      const SHORT = ["linear through (0, 0)", "F<sub>f</sub> ∝ F<sub>N</sub>", "F<sub>f</sub> = μ<sub>k</sub> F<sub>N</sub>", "μ<sub>k</sub> = coefficient of kinetic friction", "μ<sub>k</sub> = 0.40", "y = mx + b, m = μ<sub>k</sub>", "slope = your material"];
      const CHAIN = [1, 2, 4];
      const mark = (i) => { L.forEach((p, k) => { p.classList.toggle("done", k < i); p.classList.toggle("cur", k === i); }); trail.innerHTML = CHAIN.filter((k) => k < i).map((k) => SHORT[k]).join(" → "); if (i === L.length - 1) { panel.classList.add("final"); summary.innerHTML = `<div class="lbl">The whole chain</div><p>${SHORT.slice(0, 6).join(" → ")}</p>`; } };
      const nb = h("button", "pencil-btn sbtn next", `Next → (1/${L.length})`); nb.type = "button"; nb.onclick = () => window.__fl.go(1); brow.appendChild(nb);
      const steps = L.map((p, i) => (T2) => { if (i === 0 && !st.origin) zoomOut(); mark(i); T2.fadeUp(p, 0, 0.5); nb.textContent = `Next → (${Math.min(i + 2, L.length)}/${L.length})`; panel.scrollTop = panel.scrollHeight; if (i === 2 || i === 5) T2.pulse(p.querySelector(".big-eq"), 0.5, 1.12, 0.5); if (i === L.length - 1) { T2.fade(document.getElementById("p9q"), 0); nb.remove(); } });
      return { steps, demo() { st.pts = true; st.line = 1; st.v = [0, 20, 0, 10]; st.origin = true; draw(); L.forEach((p) => { p.style.opacity = 1; }); mark(L.length - 1); } };
    },
  },
  { // 10 name it (v1 page 12)
    title: "NAME IT", kicker: "EXPLAIN · THE COEFFICIENT",
    side: `<p id="p10a">That slope is the coefficient of kinetic friction, μk.</p><p>It has no units.</p><p id="p10b">You just discovered the equation.</p>`,
    cap: "μk is the slope. It has no units.",
    guide: "μk is the slope. It has no units and belongs to a pair of surfaces, like felt on carpet. Add your group's μk to the board.",
    build(scene, T) {
      T.fade(document.getElementById("p10a"), 0, 0.5);
      const mu = at(scene, img("term_muk"), 4, 6, 24); T.pop(mu, 0.8);
      const pair = at(scene, h("div"), 4, 50, 30);
      const cp = img("carpet_strip"); const sw = img("swatch_felt"); sw.style.cssText = "position:absolute;width:28%;left:36%;bottom:55%";
      pair.style.position = "absolute"; pair.append(sw, cp);
      at(pair, h("div", "", null, { border: ".3cqw solid var(--navy)", borderTop: 0, height: "2cqw", top: "105%", borderRadius: "0 0 1cqw 1cqw" }), 0, null, 100);
      const pl = at(pair, h("div", "lbl", "a pair of surfaces"), 22, null); pl.style.top = "125%"; pl.style.fontSize = "2.2cqw";
      T.fade(pair, 1.6, 0.6); T.A(sw, [{ transform: "translateX(-3cqw)" }, { transform: "translateX(3cqw)" }], 1.8, 1.6, EASE.inout, { iterations: Infinity, direction: "alternate" });
      const sb = at(scene, h("div", "starburst"), 40, 6, 54); sb.style.aspectRatio = "1.35";
      sb.innerHTML = `<svg viewBox="-110 -80 220 160" aria-hidden="true"><path d="${star(110, 80, 70, 52, 18)}" fill="#F0B23A" fill-opacity=".55" stroke="#C98A1E" stroke-width="2.5" stroke-linejoin="round"/></svg><span>So<br><b>${fx("Ff,kinetic = μk FN")}</b></span>`;
      T.pop(sb, 2.6, 0.5);
      const st = say(scene, "μk belongs to a pair of specific surface materials! Add yours to the board!", 36, 74, 62); st.classList.add("callout");
      T.fade(st, 3.4, 0.3); T.wiggle(st, 3.4, 2, 0.8); T.fade(document.getElementById("p10b"), 3.8);
    },
  },
  { // 11 did you notice? then the video
    title: "DID YOU NOTICE SOMETHING?", kicker: "PART 2 · FROM KINETIC TO STATIC",
    side: `<p>You might have noticed that it took a bit more force to get your cart to START moving than to KEEP it moving!</p><p class="q" id="p11p">Watch the scale. What did the reading do?</p><p id="p11c">That extra grip before sliding is static friction.</p>`,
    cap: "It took more force to START it moving than to KEEP it moving.",
    guide: "Video: felt on carpet with all the weights. Watch the scale climb while the cart holds still, then drop once it slides. That extra grip before sliding is static friction.",
    build(scene, T) {
      const hd = say(scene, "Did you notice something?", 4, 2, 70, "big"); T.wipe(hd, 0, 0.8, 0, 1, EASE.out);
      const c = card(scene, 6, 15, 86, { tilt: "tilt-l" });
      const v = video(); c.appendChild(v);
      T.fade(c, 0.3, 0.6);
      const lbl = at(c, h("div", "photo-credit", "Video: felt on carpet, full weights on the cart"), 0, null, 100); lbl.style.position = "relative";
      T.fade(document.getElementById("p11p"), 2); T.fade(document.getElementById("p11c"), 5);
      return { video: v };
    },
  },
  { // 12 button-paced static trials
    title: "PART 2: STATIC FRICTION", kicker: "EXPLORE · THE PEAK",
    side: `<p>Challenge: find μs for your material.</p><ol><li>Use ${TEST_LABELS[2]} (1790 g, F_N = 17.5 N).</li><li>Pull slowly and steadily from rest.</li><li>Watch for the PEAK: the highest reading just before the cart starts moving.</li><li>3 trials (peaks vary), then average.</li></ol>`,
    cap: "Press Test 1, Test 2, Test 3. Watch for the PEAK.",
    guide: "Three slow trials: the reading climbs while the cart holds still, peaks, then drops when it slides. Each peak is recorded, then averaged. Values are a sample.",
    build(scene, T) {
      stage(scene); carpet(scene, 0, 65, 100);
      const R = rig(scene, 1, 26, 58, { weights: ["1000", "500", "200"], reading: true }); T.fade(R.r, 0, 0.4);
      const peak = tag(R.pull, "PEAK", 52, 4, "red"); peak.style.opacity = 0;
      const got = [];
      const chart = card(scene, 66, 30, 31, { keep: true }); chart.style.opacity = 0; chart.style.visibility = "hidden"; chart.innerHTML = `<div class="lbl">peaks (N)</div><svg viewBox="0 0 300 200" class="bars" aria-label="Bar chart of three peak readings"></svg>`;
      let busy = false;
      const play = (i, b, slot) => {
        if (busy || got[i] != null || (i > 0 && got[i - 1] == null)) return; busy = true; b.setAttribute("aria-pressed", "true");
        const pk = PEAKS[i], up = 4.0;
        T.needle(R.needle, 0, up, 0, pk, EASE.inQuad); T.text(R.readEl, 0, up, 0, pk);
        T.A(peak, [{ opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }], up, 1.2);
        T.needle(R.needle, up + 0.5, 0.5, pk, 7.0); T.text(R.readEl, up + 0.5, 0.5, pk, 7.0);
        T.A(R.r, [{ transform: "translateX(0)" }, { transform: "translateX(6cqw)" }], up + 0.5, 1.4, EASE.linear);
        setTimeout(() => { if (!slot.isConnected) return; got[i] = pk; slot.textContent = pk.toFixed(1) + " N"; T.pop(slot, 0); busy = false; R.needle.getAnimations().forEach((a) => a.cancel()); R.r.getAnimations().forEach((a) => a.cancel()); R.needle.style.left = needleX(0) + "%"; R.readEl.textContent = "0.0 N"; if (btns[i + 1]) { btns[i + 1][0].disabled = false; btns[i + 1][1].textContent = "..."; } if (got[2] != null) showChart(); }, T.reduced ? 0 : (up + 2) * 1000);
      };
      const btns = [0, 1, 2].map((i) => { const col = at(scene, h("div", "trial"), 4 + i * 20, 3, 17); const b = h("button", "pencil-btn sbtn", `▶ Test ${i + 1}`); b.type = "button"; const slot = h("div", "trial-v", i ? "after Test " + i : "..."); b.disabled = i > 0; col.append(b, slot); b.onclick = () => play(i, b, slot); T.pop(col, 0.4 + i * 0.2); return [b, slot]; });
      function showChart() {
        const avg = PEAKS.reduce((a, b) => a + b, 0) / 3, sy = (v) => 180 - v / 10 * 160;
        chart.querySelector("svg").innerHTML = PEAKS.map((v, i) => `<rect x="${30 + i * 85}" y="${sy(v)}" width="55" height="${180 - sy(v)}" fill="#2F6DB5" fill-opacity=".55" stroke="#24339E" stroke-width="3"/><text x="${57 + i * 85}" y="${sy(v) - 8}" text-anchor="middle" class="gt">${v.toFixed(1)}</text><text x="${57 + i * 85}" y="198" text-anchor="middle" class="gt">Test ${i + 1}</text>`).join("") + `<line x1="15" x2="290" y1="${sy(avg)}" y2="${sy(avg)}" stroke="#B8322A" stroke-width="3" stroke-dasharray="8 6"/><text x="290" y="${sy(avg) - 30}" text-anchor="end" class="gt red">average ${avg.toFixed(1)} N</text>`;
        chart.style.visibility = ""; T.fade(chart, 0, 0.5); T.wipeUp(chart.querySelector("svg"), 0.2, 0.8);
      }
      return { demo() { btns.forEach(([b, slot], i) => { got[i] = PEAKS[i]; slot.textContent = PEAKS[i].toFixed(1) + " N"; }); showChart(); } };
    },
  },
  { // 13 calculate μs (v1 page 15) with more guide text
    title: "Calculate μs", kicker: "EXPLAIN · STATIC FRICTION",
    side: `<p>Static friction grows to match your pull, up to a maximum:</p><p id="p13a"><span class="t-head">Ff,static ≤ μs FN</span></p><p>At the peak, Ff,static (max) = μs FN, so</p><p id="p13b"><span class="boxed">μs = peak reading / FN</span></p><p class="guide-x">Graph: rise, peak, drop, flat.</p><p class="q" id="p13c">Compare: is your μs bigger or smaller than your μk?</p>`,
    cap: "μs = peak reading / FN",
    guide: "Rise while still, peak at max static friction, drop, then flat at kinetic. μs = peak / F_N.",
    build(scene, T) {
      const c = card(scene, 8, 3, 62, { keep: true });
      const L = staticGraph(c, ["static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot", "static_label_max", "static_label_kinetic_eq"]);
      T.fade(c, 0, 0.4);
      T.wipe(L.static_seg1_rise, 0.5, 1.6, ...SB.seg1_rise);
      T.pop(L.static_peak_dot, 2.1); L.static_peak_dot.style.transformOrigin = `${SB.peak[0] * 100}% ${SB.peak[1] * 100}%`;
      T.wipe(L.static_label_max, 2.1, 0.5, ...SB.label_max);
      T.wipe(L.static_seg2_drop, 2.7, 0.3, ...SB.seg2_drop, EASE.inQuad);
      T.wipe(L.static_seg3_kinetic, 3.0, 1.2, ...SB.seg3_kinetic);
      T.fade(L.static_label_kinetic_eq, 3.6, 0.5);
      T.fade(document.getElementById("p13a"), 4.4); T.pop(document.getElementById("p13b"), 5.0); T.fade(document.getElementById("p13c"), 5.8);
      const fs = at(scene, h("div", "fs-only chip", fx("Ff,static ≤ μs FN")), 74, 30); fs.style.fontSize = "2.4cqw"; T.fade(fs, 4.4);
      const ex = at(c, h("div", "chip ex-chip", fx("Example: μs = 7.8 N / 17.5 N ≈ 0.45 (sample)")), 4, 100); ex.style.position = "relative"; ex.style.fontSize = "2cqw"; T.fade(ex, 5.4);
    },
  },
  { // 14 video + synced force vs time graph
    title: "WATCH THE SCALE, WATCH THE GRAPH", kicker: "EXPLAIN · STATIC, THRESHOLD, KINETIC",
    side: `<p>The graph is drawn from the real scale readings in the video (slowed to half speed).</p><p><b style="color:#2F6DB5">Static:</b> the cart holds still and friction matches the growing pull.</p><p><b style="color:#C98A1E">Threshold:</b> the peak, the most static friction can give (Ff,s(max) = μs FN).</p><p><b style="color:#B8322A">Kinetic:</b> it slides, friction drops and stays about the same (Ff,k = μk FN).</p><p class="q">Why is starting harder than sliding?</p>`,
    cap: "Static · Threshold · Kinetic",
    guide: "The video and the graph play together. The force climbs while the cart is stuck (static), peaks (threshold), then drops and stays flat while it slides (kinetic).",
    build(scene, T) {
      const vc = card(scene, 1, 6, 46, { keep: true, tilt: "tilt-l" }); vc.classList.add("vid-card"); const v = video(); v.loop = true; vc.appendChild(v); T.fade(vc, 0, 0.5);
      const gc = card(scene, 50, 4, 48, { keep: true }); gc.style.rotate = ".8deg"; const g = h("div", "graph"); gc.appendChild(g);
      const X0 = 60, X1 = 585, Y0 = 360, Y1 = 20, sx = (t) => X0 + t / 5 * (X1 - X0), sy = (f) => Y0 - f / 20 * (Y0 - Y1);
      const Z = VIDEO_ZONES, band = (z, col, label, ly = Y1 + 26) => `<rect x="${sx(z[0])}" y="${Y1}" width="${sx(z[1]) - sx(z[0])}" height="${Y0 - Y1}" fill="${col}" fill-opacity=".16"/><text x="${(sx(z[0]) + sx(z[1])) / 2}" y="${ly}" text-anchor="middle" class="zl" fill="${col}">${label}</text>`;
      let grid = ""; for (let f = 0; f <= 20; f += 4) grid += `<line x1="${X0}" x2="${X1}" y1="${sy(f)}" y2="${sy(f)}" class="gl"/>`;
      g.innerHTML = `<svg viewBox="0 0 600 410" role="img" aria-label="Force against time graph drawn in step with the video">${PENCIL}${band(Z.static, "#2F6DB5", "static")}${band(Z.threshold, "#C98A1E", "threshold", Y0 - 14)}${band(Z.kinetic, "#B8322A", "kinetic")}<g filter="url(#pencilF)">${grid}<line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" class="ax"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" class="ax"/><polyline class="trace" points=""/></g><circle class="now" r="8"/><text x="${(X0 + X1) / 2}" y="404" class="axl">time in the video (s)</text><text x="16" y="190" class="axl" transform="rotate(-90 16 190)">scale reading (N)</text></svg>`;
      const trace = g.querySelector(".trace"), dot = g.querySelector(".now");
      const drawTo = (t) => { const pts = []; for (let s = 0; s <= t; s += 0.05) pts.push(`${sx(s).toFixed(1)},${sy(readingAt(s)).toFixed(1)}`); pts.push(`${sx(t).toFixed(1)},${sy(readingAt(t)).toFixed(1)}`); trace.setAttribute("points", pts.join(" ")); dot.setAttribute("cx", sx(t)); dot.setAttribute("cy", sy(readingAt(t))); };
      v.addEventListener("loadedmetadata", () => { v.playbackRate = 0.5; });
      v.playbackRate = 0.5;
      const loop = () => { if (!v.isConnected) return; drawTo(Math.min(5, v.currentTime || 0)); requestAnimationFrame(loop); };
      if (T.reduced) drawTo(5); else requestAnimationFrame(loop);
      const pb = sbtn(scene, "❚❚ Pause video + graph", 50, 64, () => { if (v.paused) { v.play().catch(() => {}); } else v.pause(); });
      pb.classList.add("big-play"); v.addEventListener("play", () => { pb.textContent = "❚❚ Pause video + graph"; }); v.addEventListener("pause", () => { pb.textContent = "▶ Play video + graph"; });
      return { video: v, demo() { v.pause(); v.currentTime = 4.9; drawTo(5); } };
    },
  },
  { // 15 leaderboard
    title: "LEADERBOARD", kicker: "EVALUATE · ALL 7 MATERIALS",
    side: `<p class="aside">Use the board to fill in EVIDENCE.</p>`,
    cap: "Which material required the most force of friction? Least? How does μk compare to μs?",
    guide: "Leaderboard: each group adds its μk and μs. Find the material with the most and the least friction, and compare μk with μs for each material.",
    build(scene, T) {
      stage(scene); const hd = say(scene, "Leaderboard: Which material required the most force of friction? Least? Do you notice any patterns in how μk compares to μs for the same material type?", 4, 1, 92); hd.classList.add("lb-q"); T.fade(hd, 0, 0.5);
      const c = card(scene, 8, 26, 76, { keep: true });
      const tb = h("table", "lb-table", `<thead><tr><th>Material</th><th>kinetic friction ${fx("μk")}</th><th>static friction ${fx("μs")}</th></tr></thead><tbody>${SWATCHES.map(() => `<tr><td></td><td></td><td></td></tr>`).join("")}</tbody>`);
      c.appendChild(tb); T.wipe(tb, 0.3, 0.6, 0, 1, EASE.out); T.fade(c, 0.3, 0.3);
      [...tb.querySelectorAll("tbody td:nth-child(1)")].forEach((td, i) => {
        const s = h("span", "", null, { display: "inline-flex", alignItems: "center" }); s.append(img("swatch_" + SWATCHES[i], ""), document.createTextNode(SWATCHES[i]));
        td.appendChild(s); T.slideIn(s, 0.9 + i * 0.15, 0.4, -4, 0);
      });
    },
  },
  { // 16 exit ticket
    title: "EXIT TICKET", kicker: "EVALUATE · ON YOUR OWN",
    side: `<p>Tear off the Exit Ticket strip. Individual.</p>`,
    cap: "Tear off the Exit Ticket strip. Individual.",
    guide: "Exit Ticket: tear off the strip and answer on your own. Turn it in at the door.",
    build(scene, T) {
      stage(scene); const t = say(scene, "EXIT TICKET", 8, 6, 50, "big"); t.style.fontSize = "6cqw"; T.wipe(t, 0, 0.8, 0, 1, EASE.out);
      const note = at(scene, h("div", "sticky", `<div class="p23-formula">${fx("Ff,kinetic = μk FN")}<br>${fx("Ff,static ≤ μs FN")}</div>`), 20, 32, 46);
      T.slideIn(note, 1.4, 0.6, 0, 12);
      const fc = at(note, h("div", "stamp p23-fc", "INDIVIDUAL"), 74, -12); fc.style.rotate = "8deg"; T.pop(fc, 1.9);
      const ans = say(scene, "Answer on your strip", 70, 40, 26); ans.classList.add("strip-note"); T.fade(ans, 2.0);
      const door = tag(note, "COLLECT AT THE DOOR", 52, 96, "red"); door.classList.add("door-tag"); T.pop(door, 2.4);
    },
  },
  { // 17 (v1 page 24)
    title: "WORKED EXAMPLE", kicker: "IF TIME · EXAMPLE PROBLEM · WORK IT IN YOUR NOTES BOX",
    side: `<p id="w0">A 3.0 kg box, μs = 0.35, μk = 0.25, pushed horizontally on a level surface.</p><p id="w1">FN = 3.0 × 9.8 = 29.4 N.</p><p id="w2">Max static = 0.35 × 29.4 = 10.3 N.</p><p id="w3">Push 6 N: does not move; Ff,static = 6 N, not 10.3 N.</p><p id="w4">Push 12 N: it slides; Ff,kinetic = 0.25 × 29.4 = 7.35 N; net force = 12 - 7.35 = 4.65 N; a = 4.65 / 3.0 = 1.55, about 1.6 m/s².</p><p class="aside"><b>YOU TRY:</b> a 5.0 kg box, μs = 0.45, pushed horizontally on level ground. What push just starts it moving?</p>`,
    cap: "", capSteps: true,
    build(scene, T) {
      carpet(scene, 9, 78.3, 56);
      const box = at(scene, h("div"), 8, 61, 30); box.appendChild(img("sled"));
      const kg = at(box, h("div", "chip", "3.0 kg"), 30, -30);
      const c = card(scene, 60, 4, 38, { keep: true });
      const L = staticGraph(c, ["static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot"]);
      L.static_peak_dot.style.transformOrigin = `${SB.peak[0] * 100}% ${SB.peak[1] * 100}%`;
      T.fade(box, 0, 0.5); T.fade(c, 0, 0.5);
      const cap = document.getElementById("flCapQ");
      const lines = ["w0", "w1", "w2", "w3", "w4"].map((id) => document.getElementById(id));
      const times = [0, 1.0, 2.2, 3.4, 5.0];
      lines.forEach((l, i) => i === 0 ? T.fade(l, 0) : T.wipe(l, times[i], 0.8, 0, 1, EASE.out));
      if (cap) times.forEach((t, i) => setTimeout(() => { if (cap.isConnected && document.body.dataset.page === "17") cap.innerHTML = lines[i].innerHTML; }, T.reduced ? 0 : t * 1000));
      T.pulse(L.static_peak_dot, 2.2, 1.6, 0.6, 2);
      const a6 = at(box, img("pull_arrow"), 91, 52, 20); a6.style.translate = "0 -50%"; const l6 = at(box, h("div", "chip", "6 N"), 100, 10);
      T.wipe(a6, 3.4, 0.3); T.pop(l6, 3.4); T.fadeOut(a6, 4.8); T.fadeOut(l6, 4.8);
      const a12 = at(box, img("pull_arrow"), 91, 52, 43); a12.style.translate = "0 -50%"; const l12 = at(box, h("div", "chip red", "12 N"), 112, 10);
      T.wipe(a12, 5.0, 0.3); T.pop(l12, 5.0);
      T.A(box, [{ transform: "translateX(0)" }, { transform: "translateX(14cqw)" }], 5.2, 1.6, EASE.inQuad);
      T.wipe(L.static_seg1_rise, 0.4, 1.4, ...SB.seg1_rise); T.fade(L.static_peak_dot, 1.8, 0.2);
      T.wipe(L.static_seg2_drop, 5.0, 0.3, ...SB.seg2_drop); T.wipe(L.static_seg3_kinetic, 5.3, 1.2, ...SB.seg3_kinetic);
    },
  },
  { // 18 (v1 page 25)
    title: "Collect tickets first!", kicker: "EVALUATE · BEFORE THE ANSWERS", centered: true,
    side: `<p>Pass every Exit Ticket to the front before we look at the answers.</p>`,
    cap: "Pass every Exit Ticket to the front before we look at the answers.",
    build(scene, T) {
      const t = say(scene, "Collect tickets first!", 10, 14, 80, "big"); t.style.fontSize = "7cqw"; t.style.textAlign = "center"; T.wipe(t, 0, 0.8, 0, 1, EASE.out);
      const s = say(scene, "Pass every Exit Ticket to the front before we look at the answers.", 14, 38, 72); s.style.textAlign = "center"; s.style.fontSize = "2.8cqw"; T.fade(s, 1.0);
      const pf = at(scene, h("div", "pass-fwd", `<svg viewBox="0 0 120 120" class="tix" aria-hidden="true">${PENCIL}<g filter="url(#pencilF)"><path d="M20 40 h80 v12 a8 8 0 0 0 0 16 v12 h-80 v-12 a8 8 0 0 0 0 -16z" fill="#FBE7A1" stroke="#24339E" stroke-width="4"/><line x1="44" y1="44" x2="44" y2="76" stroke="#24339E" stroke-width="3" stroke-dasharray="5 4"/><text x="72" y="66" text-anchor="middle" font-family="Architects Daughter" font-size="14" fill="#B8322A">EXIT</text></g></svg><svg viewBox="0 0 60 120" class="uparrow" aria-hidden="true">${PENCIL}<g filter="url(#pencilF)"><path d="M30 8 L52 40 L38 40 L38 112 L22 112 L22 40 L8 40Z" fill="#2F6DB5" fill-opacity=".35" stroke="#24339E" stroke-width="4" stroke-linejoin="round"/><path d="M26 50 l8 -6 M26 64 l8 -6 M26 78 l8 -6 M26 92 l8 -6" stroke="#24339E" stroke-width="2"/></g></svg><span class="pf-l">Pass forward</span>`), 26, 64, 48); T.fadeUp(pf, 1.4, 0.5);
      T.loop(pf.querySelector(".uparrow"), [{ transform: "translateY(0)" }, { transform: "translateY(-1.2cqw)" }, { transform: "translateY(0)" }], 1.9, 1.0);
    },
  },
  { // 19 (v1 page 26)
    title: "Exit Ticket: Answers", kicker: "EVALUATE · CHECK YOUR WORK",
    side: `<p>Front of the ticket (Name, favorite part, still confusing): those are your own answers. Any honest answer counts.</p>`,
    cap: "",
    build(scene, T) {
      const A = [
        [`1. A 2 kg box is pulled horizontally on a level floor. A group's graph of friction force against ${fx("FN")} has a slope of 0.3. What is the sliding friction force on the box?`, `${fx("Ff,k")} = 5.9 N`, `${fx("FN")} = 2 × 9.8 = 19.6 N, so ${fx("Ff,k")} = 0.3 × 19.6 = 5.88, about 5.9 N`],
        [`2. For the same box, ${fx("μs")} = 0.4. What is the most static friction can be?`, `${fx("Ff,s")} max = 7.8 N`, `${fx("Ff,s")} max = 0.4 × 19.6 = 7.84, about 7.8 N`],
        [`3. Is it harder to start the box moving or to keep it sliding? Why?`, `Harder to start it moving.`, `The maximum static friction (7.8 N) is bigger than kinetic friction (5.9 N) because ${fx("μs")} is bigger than ${fx("μk")}. At rest, the tiny touching points have time to stick together; once the block slides, they keep breaking apart before they can stick as strongly.`],
      ];
      const col = h("div", "ans-col"); scene.appendChild(col);
      A.forEach(([q, a, w], i) => { const c = h("div", "card keep ans-card", `<p class="ans-q">${q}</p><p class="ans-a">${a}</p><p class="ans-w">${w}</p>`); c.style.rotate = (i % 2 ? .5 : -.5) + "deg"; col.appendChild(c); T.fadeUp(c, 0.3 + i * 0.8, 0.5); });
      const g = h("div", "card keep ans-graph", `<img src="friction-lesson/art/static_e.webp" alt="Static graph: the peak sits higher than the kinetic plateau"><div class="lbl">the static peak sits above the kinetic plateau</div>`); scene.appendChild(g); T.fade(g, 0, 0.5);
    },
  },
  hookPage(1, "GRAPHITE AS A LUBRICANT",
    "Pencil “lead” is graphite: stacked sheets of carbon that slide over each other easily, so graphite works as a dry lubricant. Note: true superlubricity, with almost no friction, needs atomically flat graphite sheets rotated out of line with each other.",
    "Shade a patch of paper with a soft pencil. Slide a coin across bare paper, then across the graphite patch. Which is easier? That is dry lubrication.",
    "Why might atoms that line up like egg-carton bumps grip more than atoms that do not line up?",
    (scene, T) => {
      const c = card(scene, 14, 12, 60, { keep: true }); T.fade(c, 0, 0.5);
      const box = h("div", "", null, { position: "relative", height: "22cqw" }); c.appendChild(box);
      [0, 1, 2].forEach((i) => {
        const bar = at(box, h("div", "", null, { height: "4.5cqw", background: "repeating-linear-gradient(-28deg, rgba(40,40,48,.55) 0 .18cqw, transparent .18cqw .55cqw), repeating-linear-gradient(32deg, rgba(40,40,48,.25) 0 .12cqw, transparent .12cqw .7cqw), #A7A9AE", border: ".25cqw solid #3D3D3D", borderRadius: ".6cqw" }), 8, 10 + i * 28, 80);
        T.loop(bar, [{ transform: "translateX(0)" }, { transform: `translateX(${i % 2 ? -2 : 2}cqw)` }, { transform: "translateX(0)" }], 0.5 + i * 0.2, 1.5);
      });
      const lb = at(c, h("div", "lbl", "graphite sheets"), 0, null, 100); lb.style.position = "relative"; lb.style.fontSize = "2.2cqw";
    }),
  hookPage(2, "GECKO FEET",
    "A gecko can run up glass. Each foot carries over a million tiny hairs (setae), and each seta splits into hundreds to about a thousand even tinier tips. Weak van der Waals attraction at all those contact points adds up.",
    "Stick a sticky note to a window. Pull it straight off, then peel it from one corner. Geckos peel their toes to let go.",
    "Why does more real contact area mean more adhesion?",
    (scene, T) => {
      const wrap = at(scene, h("figure", "", null, { margin: 0 }), 18, 2, 58);
      wrap.appendChild(img("gecko_photo", "cut", "Close-up photo of a gecko foot with rows of tiny ridges on each toe"));
      const cr = h("figcaption", "photo-credit", "Photo: B. C. Tørrissen, CC BY-SA 3.0"); cr.style.cssText = "position:absolute;left:12%;right:6%;bottom:6.5%;font-size:1.5cqw;color:#24339E";
      wrap.appendChild(cr); wrap.style.rotate = "-1.5deg";
      T.fade(wrap, 0, 0.6); T.A(wrap, [{ transform: "scale(1.04)" }, { transform: "scale(1)" }], 0, 1.4);
    }),
  hookPage(3, "STICK-SLIP",
    "A violin bow, squeaky sneakers on a gym floor, and a creaking door all sing for the same reason: the surfaces stick, then slip, then stick again, many times a second.",
    "Pull a rubber eraser slowly across a desk with a rubber band. Watch it jerk forward in steps instead of gliding.",
    "Stick-slip happens when friction drops as sliding starts. Why does that make the motion jerky?",
    (scene, T) => {
      const c = card(scene, 4, 10, 88, { keep: true }); T.fade(c, 0, 0.4);
      const row = h("div", "", null, { display: "flex" }); c.appendChild(row);
      const L0 = SB.seg1_rise[0], R0 = SB.seg2_drop[1];
      for (let i = 0; i < 4; i++) {
        // crop the canvas to the rise+drop pair and tile it
        const cell = h("div", "", null, { flex: "1", overflow: "hidden", position: "relative", aspectRatio: `${(R0 - L0) * 1680} / ${(1000 - 300) * 1}` });
        ["static_seg1_rise", "static_seg2_drop"].forEach((n, k) => {
          const im = img(n); im.style.cssText = `position:absolute;width:${100 / (R0 - L0)}%;max-width:none;left:${-L0 / (R0 - L0) * 100}%;top:${-300 / 700 * 100}%`;
          cell.appendChild(im);
          T.wipe(im, 0.4 + i * 0.5 + k * 0.38, k ? 0.12 : 0.38, k ? SB.seg2_drop[0] : SB.seg1_rise[0], k ? SB.seg2_drop[1] : SB.seg1_rise[1]);
        });
        row.appendChild(cell);
      }
      const lb = h("div", "lbl", "stick, slip, stick…"); lb.style.fontSize = "2.6cqw"; c.appendChild(lb); T.fade(lb, 2.4);
    }),
  hookPage(4, "INTERLEAVED PHONE BOOKS",
    "Shuffle the pages of two phone books together. On MythBusters, people and even two cars could not pull them apart; it took two military vehicles and about 8,000 pounds of force.",
    "Interleave the pages of two old paperbacks or notebooks, 50 pages or more. Two students try to pull them apart. Then try with only 10 pages.",
    "Pulling on the spines squeezes the pages together. Why does that make friction grow?",
    (scene, T) => {
      const c = card(scene, 10, 8, 70, { keep: true }); T.fade(c, 0, 0.5);
      const lines = Array.from({ length: 14 }, (_, i) => { const y = 12 + i * 5.5; return i % 2 ? `<line x1="30" y1="${y}" x2="88" y2="${y}" stroke="#2F6DB5" stroke-width="1.2"/>` : `<line x1="12" y1="${y}" x2="70" y2="${y}" stroke="#B8322A" stroke-width="1.2"/>`; }).join("");
      c.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 100 92" style="width:100%;display:block" aria-label="Two book spines with interleaved pages"><rect x="4" y="6" width="9" height="80" rx="2" fill="#B8322A" opacity=".85"/><rect x="87" y="6" width="9" height="80" rx="2" fill="#2F6DB5" opacity=".85"/>${lines}</svg>`);
      const a1 = at(c, img("pull_arrow"), -14, 40, 14); a1.style.rotate = "180deg";
      const a2 = at(c, img("pull_arrow"), 100, 40, 14);
      T.wipe(a1, 0.8, 0.4); T.wipe(a2, 0.8, 0.4);
      T.loop(a1, [{ transform: "translateX(0)" }, { transform: "translateX(1cqw)" }, { transform: "translateX(0)" }], 1.3, 0.9);
      T.loop(a2, [{ transform: "translateX(0)" }, { transform: "translateX(1cqw)" }, { transform: "translateX(0)" }], 1.3, 0.9);
    }),
  hookPage(5, "WHY IS ICE SLIPPERY?",
    "You may have heard that skate blades melt ice by pressure. That effect is far too small to explain it. What matters is a thin layer of loosely bound, mobile water molecules at the surface; scientists still debate the cause.",
    "Slide an ice cube straight from the freezer across a dry tray, then one that has sat out for a minute. Compare how far each goes from the same push.",
    "Very cold ice feels less slippery than ice near 0 °C. Why might that be?",
    (scene, T) => {
      // drawn in code: an icy lens, the ice below, a skate blade above, and a mobile molecule layer between
      const box = at(scene, h("div"), 22, 2, 52);
      const mol = Array.from({ length: 14 }, (_, i) => `<circle class="mol" cx="${22 + i * 11.5}" cy="${101 + (i % 2) * 6}" r="4.2" fill="#9FD3F2" stroke="#2F6DB5" stroke-width="1.4"/>`).join("");
      box.innerHTML = `<svg viewBox="0 0 200 200" style="width:100%;display:block" role="img" aria-label="Magnified ice surface with a thin layer of loose water molecules">
        <defs><clipPath id="iceLens"><circle cx="100" cy="100" r="92"/></clipPath>
        <pattern id="iceHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7FB0EA" stroke-width="1.6" opacity=".7"/></pattern></defs>
        <g clip-path="url(#iceLens)"><rect width="200" height="200" fill="#FFFDF6"/>
        <rect x="0" y="40" width="200" height="50" fill="#C8CDD6"/><rect x="0" y="40" width="200" height="50" fill="url(#iceHatch)" opacity=".4"/>
        <path d="M0 112 L200 112 L200 200 L0 200Z" fill="#DDF0FB"/><path d="M0 112 L200 112 L200 200 L0 200Z" fill="url(#iceHatch)"/>
        ${Array.from({ length: 6 }, (_, i) => `<path d="M${10 + i * 34} 150 l10 -8 l10 8 l-10 8z" fill="none" stroke="#2F6DB5" stroke-width="1.2" opacity=".6"/>`).join("")}
        <g id="iceMols">${mol}</g></g>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#24339E" stroke-width="4"/>
        <text x="100" y="32" text-anchor="middle" font-family="Architects Daughter" font-size="11" fill="#3D3D3D">skate blade</text>
        <text x="100" y="178" text-anchor="middle" font-family="Architects Daughter" font-size="11" fill="#2F6DB5">ice</text></svg>`;
      box.style.filter = "drop-shadow(0 .6cqw 1cqw rgba(0,0,0,.2))";
      T.fade(box, 0, 0.4); T.A(box, [{ transform: "scale(.2)" }, { transform: "scale(1)" }], 0, 1.0, EASE.inout);
      box.querySelectorAll(".mol").forEach((m, i) => {
        m.style.transformBox = "fill-box"; m.style.transformOrigin = "center";
        T.loop(m, [{ transform: "translate(0,0)" }, { transform: `translate(${i % 2 ? 2 : -2}px,${i % 3 ? -1.5 : 1.5}px)` }, { transform: "translate(0,0)" }], 1.0 + (i % 4) * 0.1, 0.9 + (i % 3) * 0.25);
      });
      const lead = at(scene, h("div", "", null, { height: ".3cqw", background: "#2F6DB5", transformOrigin: "0 50%", rotate: "-4deg" }), 62, 51, 15); T.grow(lead, 1.2, 0.4);
      const lb = at(scene, h("div", "tag", "loosely bound, mobile molecules"), 76, 46); lb.style.background = "#2F6DB5"; lb.style.whiteSpace = "normal"; lb.style.width = "20%"; T.pop(lb, 1.4);
    }),
  hookPage(6, "TRIBOELECTRIC EFFECT",
    "When two different materials touch and separate, charge moves between them; for metals it’s electrons, and for insulators scientists still debate whether it’s electrons, ions, or tiny bits of material. Charge is moved, not created.",
    "Rub a balloon on your hair or a wool sweater, then hold it near tiny bits of paper or a thin stream of tap water.",
    "How could you test that charge was moved and not created?",
    (scene, T) => {
      const sw = at(scene, img("swatch_cloth"), 10, 40, 18); T.fade(sw, 0, 0.4);
      [[13, 46], [20, 54], [13, 60], [21, 64]].forEach(([x, y], i) => { const p = at(scene, h("div", "charge plus", "+"), x, y); T.pop(p, 2.4 + i * 0.1); });
      const ar = at(scene, img("pull_arrow"), 31, 46, 22); ar.style.rotate = "-22deg"; ar.style.transformOrigin = "0 50%"; T.wipe(ar, 1.0, 0.5);
      const bl = at(scene, h("div"), 56, 6, 26);
      bl.innerHTML = `<svg viewBox="0 0 100 150" style="width:100%;display:block" role="img" aria-label="Balloon"><path d="M50 6 C78 6 92 30 92 56 C92 88 70 110 50 112 C30 110 8 88 8 56 C8 30 22 6 50 6Z" fill="#E5776C" fill-opacity=".75" stroke="#B8322A" stroke-width="3"/><path d="M46 112 l4 8 l4 -8z" fill="#B8322A"/><path d="M50 120 C44 132 58 138 50 148" fill="none" stroke="#3D3D3D" stroke-width="2"/><path d="M28 30 C34 22 42 20 48 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
      T.fade(bl, 0.2, 0.4);
      const start = [[16, 48], [20, 56], [14, 62]], end = [[62, 26], [70, 34], [64, 42]];
      [[60, 18], [72, 22], [68, 44]].forEach(([x, y], i) => { const m = at(scene, h("div", "charge minus", "−"), x, y); T.pop(m, 2.6 + i * 0.1); });
      start.forEach(([x, y], i) => {
        const c = at(scene, h("div", "charge minus", "−"), x, y);
        T.fade(c, 0.6, 0.2);
        const dx = (end[i][0] - x), dy = (end[i][1] - y);
        // three 0.3 s hops along an arc
        const kf = [0, 1, 2, 3].map((k) => ({ transform: `translate(${dx * k / 3 * 1}cqw,${(dy * k / 3) * 0.5625 - (k % 3 ? 4 : 0)}cqw)` }));
        T.A(c, kf, 1.2 + i * 0.5, 0.9, EASE.inout);
      });
    }),
  hookPage(7, "FRICTION TESTS",
    "Around 1493, Leonardo da Vinci wrote that friction grows with the load and does not depend on the area touching. He later used friction = one quarter of the weight. Guillaume Amontons published the same laws in 1699.",
    "Hang a rubber band on a book. Drag it on its wide side, then on its spine. Measure how far the band stretches each time.",
    "If friction is one quarter of the weight, what is μ? Does your book agree?",
    (scene, T) => {
      const c = card(scene, 4, 6, 70, { keep: true }); T.fade(c, 0, 0.5);
      const box = h("div", "", null, { position: "relative" }); c.appendChild(box);
      const blk = (x, L, H, dx, top) => { const y = 295 - H; return `<polygon points="${x},${y} ${x + dx},${y - dx} ${x + L + dx},${y - dx} ${x + L},${y}" fill="#E8C594"/><polygon points="${x + L},${y} ${x + L + dx},${y - dx} ${x + L + dx},${295 - dx} ${x + L},295" fill="#B98A52"/><rect x="${x}" y="${y}" width="${L}" height="${H}" fill="#D9AE78"/><path d="M${x + 20} ${y + H * .35} q${L * .3} -8 ${L - 40} 4 M${x + 30} ${y + H * .7} q${L * .4} 8 ${L - 60} -3" stroke="#8C5A2B" stroke-width="2" fill="none" opacity=".6"/><g fill="none" stroke="#6B4320" stroke-width="3.5" stroke-linejoin="round"><polygon points="${x},${y} ${x + dx},${y - dx} ${x + L + dx},${y - dx} ${x + L + dx},${295 - dx} ${x + L},295 ${x},295"/><path d="M${x} ${y}H${x + L}V295M${x + L} ${y}l${dx} ${-dx}"/></g>`; };
      const hook = (hx, hy) => `<path d="M${hx} ${hy}h14" stroke="#555" stroke-width="5"/><circle cx="${hx + 25}" cy="${hy}" r="11" fill="none" stroke="#555" stroke-width="5"/><path d="M${hx + 28} ${hy} C${hx + 40} ${hy - 16}, ${hx + 100} ${hy - 13}, ${hx + 112} ${hy} C${hx + 100} ${hy + 13}, ${hx + 40} ${hy + 16}, ${hx + 28} ${hy}Z" fill="none" stroke="#B8322A" stroke-width="5" class="band-loop"/>`;
      const svg = h("div", "p26-art"); svg.innerHTML = `<svg viewBox="0 0 1000 360" style="width:100%;display:block" role="img" aria-label="Two identical wood blocks on a plank: one on its wide face, one on its narrow side, each pulled by a rubber band looped through its eye hook"><polygon points="10,300 60,250 990,250 940,300" fill="#E3BE8A" stroke="#6B4320" stroke-width="3"/><rect x="10" y="300" width="930" height="24" fill="#C9965C" stroke="#6B4320" stroke-width="3"/>${blk(40, 330, 60, 45)}${hook(392, 242)}${blk(540, 330, 110, 20)}${hook(880, 230)}<text x="205" y="352" text-anchor="middle" class="p26-t">wide face down</text><text x="715" y="352" text-anchor="middle" class="p26-t">narrow side down</text></svg>`;
      box.appendChild(svg); T.fade(svg, 0.4, 0.8);
      const lb = h("div", "lbl t-aside", "his sketch idea"); lb.style.fontSize = "2.2cqw"; c.appendChild(lb); T.fade(lb, 2.0);
      const btn = at(scene, h("a", "pencil-btn big-btn", "Try the Online Friction Lab ↗"), 22, 84);
      btn.href = LAB_URL; btn.target = "_blank"; btn.rel = "noopener"; btn.id = "labBtn";
      T.pop(btn, 2.8);
    },
    { side: `<p class="aside">Try the Online Friction Lab with the button on the page.</p>` }),
];

// Guide text for pages 17 to 26 (shown when narration is off).
const TAIL_GUIDES = [
  "Worked example: find F_N, the most static friction, and what happens with a 6 N push and a 12 N push. Try the 5.0 kg box yourself.",
  "Pass every Exit Ticket to the front before we look at the answers.",
  "Exit Ticket answers: check your work against each step.",
  "Mystery 1: graphite sheets slide over each other, so pencil lead works as a dry lubricant.",
  "Mystery 2: millions of tiny hairs on gecko feet add up lots of weak attractions.",
  "Mystery 3: stick-slip. Surfaces stick, slip, and stick again, which makes squeaks and violin notes.",
  "Mystery 4: interleaved pages press together, so friction on every page adds up.",
  "Mystery 5: ice is slippery because of a thin layer of loose, mobile water molecules.",
  "Mystery 6: rubbing two materials moves charge from one to the other.",
  "Mystery 7: Leonardo da Vinci tested friction about 500 years ago. Try the Online Friction Lab.",
];
PAGES.slice(16).forEach((p, i) => { p.guide = TAIL_GUIDES[i]; });

function star(rx, ry, ix, iy, pts) {
  let d = "";
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI * i) / pts - Math.PI / 2, o = i % 2 === 0;
    const x = Math.cos(a) * (o ? rx : ix) * 0.95, y = Math.sin(a) * (o ? ry : iy) * 0.95;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}

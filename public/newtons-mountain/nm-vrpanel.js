// Newton's Mountain: the in-headset panel. One 1024 x 1024 canvas quad, 0.80 m wide, in Night Sky's look (ui/ns-ui-look.js
// primitives). It extends the Night Sky VRPanel for placement, hit-testing and dragging, and only replaces draw().
// Tabs: Launch, Shots, View, Help. Every line of text is 56 px or more (Night Sky ui-spec 1.5 deg at 1.2 m); long content is paged with the 128 x 92 page chips.
import { VRPanel, PANEL_PX } from "../night-sky/ns-vrpanel.js";
import { THEME, squircle, surface, panelBackground, text, icon, iconAlpha, labelColor } from "../night-sky/ui/ns-ui-look.js";
import { NM_CONFIG as C } from "./nm-config.js";
import * as S from "./nm-strings.js";

export const TABS = [["launch", "Launch"], ["shots", "Shots"], ["view", "View"], ["help", "Help"]];
export const PAGES = { launch: 1, shots: 2, view: 3, help: 1 }; // help is paginated by measuring, see helpPages()
const F = (px, w = 600) => `${w} ${px}px Inter`;
const MIN = 56;                       // spec minimum text, px on the 1024 canvas (1.5 deg at 1.2 m)
const PAD = 40, BODY_W = 1024 - 2 * PAD, LH = 72; // body text: 40 px inset each side, line height 1.3 x 56 px
const LIMIT = 880;                    // content stops here on paged tabs; the bottom 120 px hold the page chips
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const glue = (l) => l.replace(/(\d) (km\/s|km|m\/s|min|degrees|laps|h|s|m)\b/g, "$1\u00a0$2"); // keep a number and its unit on one line
const facts = (lines) => lines.flatMap((l) => l.split(/ {3,}/)).map((l) => glue(l.trim())).filter(Boolean);

export class NMPanel extends VRPanel {
  constructor(THREE, icons) { super(THREE, icons); this.tab = "launch"; this.page = { launch: 0, shots: 0, view: 0, help: 0 }; this.shotRow = 0; this.holdClear = 0; }
  pageCount(tab) {
    if (tab === "help") return this.helpPages().length;
    if (tab === "shots") return this.shotPages().length;
    return PAGES[tab];
  }
  /** Shots pages: the list, the shot's facts, then (only when they apply) the Explain-level fall check and Between your shots. */
  shotPages() {
    const m = this.m || {}, p = ["list", "facts"];
    if (m.help >= 2 && m.levelTwo && m.levelTwo.length) p.push("fall");
    if (m.between) p.push("between");
    return p;
  }
  /** m: view model built by nm-main (see buildPanelModel). */
  draw(m) {
    const g = this.canvas.getContext("2d"); this.hits = []; this.m = m;
    panelBackground(g);
    const hit = (id, x, y, w, h, action, extra = {}) => this.hits.push({ id, x, y, w, h, action, ...extra });
    const st = (id, on, locked) => (locked ? "locked" : this.pressed === id ? "pressed" : on && this.hover === id ? "on-hover" : on ? "on" : this.hover === id ? "hover" : "off");
    const btn = (id, x, y, w, h, label, { on = false, locked = false, size = MIN, action = null, extra = {} } = {}) => {
      const s = st(id, on, locked); surface(g, x, y, w, h, 40, s);
      text(g, label, x + w / 2, y + h / 2 + size * 0.36, F(size, 600), labelColor(s), "center");
      if (!locked) hit(id, x, y, w, h, action, extra);
    };
    // tab bar
    squircle(g, 40, 40, 944, 112, 56); g.fillStyle = "rgba(255,255,255,0.06)"; g.fill();
    TABS.forEach(([id, name], i) => {
      const x = 40 + i * 236, on = this.tab === id, s = st("tab-" + id, on, false);
      if (on || this.hover === "tab-" + id) surface(g, x + 6, 46, 224, 100, 44, s === "off" ? "hover" : s);
      text(g, name, x + 118, 108, F(52, 600), on ? "#FFFFFF" : THEME.text.secondary, "center");
      hit("tab-" + id, x, 40, 236, 112, null, { tab: id });
    });
    const pages = this.pageCount(this.tab), pg = this.page[this.tab] = Math.min(this.page[this.tab], pages - 1);
    if (this.tab === "launch") this.drawLaunch(g, m, btn);
    else if (this.tab === "shots") this.drawShots(g, m, btn, hit, st, pg);
    else if (this.tab === "view") this.drawView(g, m, btn, pg);
    else this.drawHelp(g, m, pg);
    if (pages > 1) { // page chips and dots, same place and size as Night Sky (128 x 92, bottom corners)
      for (let i = 0; i < pages; i++) { g.beginPath(); g.arc(512 + (i - (pages - 1) / 2) * 30, 946, 8, 0, 7); g.fillStyle = i === pg ? "#FFFFFF" : "rgba(255,255,255,0.3)"; g.fill(); }
      const chip = (id, x, d, glyph) => { const s = st(id, false, false); surface(g, x, 900, 128, 92, 40, s === "off" ? "off" : s); text(g, glyph, x + 64, 900 + 46 + 72 * 0.34, F(72, 400), THEME.text.secondary, "center"); hit(id, x, 900, 128, 92, { type: "_page", d }); };
      if (pg > 0) chip("pageprev", 40, -1, "\u2039"); if (pg < pages - 1) chip("pagenext", 856, 1, "\u203a");
    }
    return this.flush();
  }
  drawLaunch(g, m, btn) {
    const lk = (k) => m.lock.includes(k);
    text(g, m.speed.toLocaleString("en-US") + " m/s", 512, 258, F(120, 300), "#FFFFFF", "center");
    text(g, (m.speed / 1000).toFixed(2) + " km/s", 512, 322, F(MIN, 500), THEME.text.secondary, "center");
    [[-1000, -100, -10, -1], [1, 10, 100, 1000]].forEach((row, r) => row.forEach((d, i) => btn("step" + d, 40 + i * 240, 340 + r * 104, 224, 92, (d > 0 ? "+" : "\u2212") + Math.abs(d), { locked: lk("speed"), action: { type: "speedStep", delta: d } })));
    btn("fire", 40, 552, 600, 128, "FIRE", { size: 84, action: { type: "fire" }, on: true });
    btn("clear", 656, 552, 328, 128, "Clear", { action: { type: "clear" } });
    btn("pause", 40, 704, 220, 92, m.paused ? "Play" : "Pause", { action: { type: "pauseToggle" }, on: m.paused });
    btn("warp", 276, 704, 360, 92, m.warpLabel, { action: { type: "warpAuto" }, on: m.warpAuto });
    btn("view", 652, 704, 332, 92, m.view === "mountain" ? "Model" : "Mountain", { action: { type: "toggleView" }, locked: lk("view") });
    text(g, "Mountain height in km", 40, 858, F(MIN, 500), THEME.text.tertiary);
    const W = [100, 116, 128, 128, 128, 128, 148]; let x = 40;
    C.heightsKm.forEach((h, i) => { btn("h" + h, x, 876, W[i], 100, String(h), { on: m.h === h, locked: lk("height"), action: { type: "setHeight", km: h } }); x += W[i] + 11; });
  }
  drawShots(g, m, btn, hit, st, pg) {
    const kind = this.shotPages()[pg];
    if (kind === "facts") return this.drawShotDetail(g, m);
    if (kind === "fall") return this.drawShotLevelTwo(g, m);
    if (kind === "between") return this.drawBetween(g, m);
    const rows = m.rows, per = 3, y0 = 176, page = this.shotRow = Math.min(this.shotRow, Math.max(0, Math.ceil(rows.length / per) - 1));
    if (!rows.length) text(g, "No shots yet. Press FIRE.", 512, 340, F(MIN, 500), THEME.text.secondary, "center");
    rows.slice(page * per, page * per + per).forEach((r, i) => {
      const y = y0 + i * 100, on = m.selected === r.n, id = "row" + r.n, s = st(id, on, false);
      surface(g, 40, y, 944, 92, 36, s);
      g.beginPath(); g.arc(92, y + 46, 26, 0, 7); g.fillStyle = r.color; g.fill(); text(g, String(r.n), 92, y + 46 + 15, F(44, 700), "#10131e", "center");
      text(g, r.speed, 140, y + 46 + MIN * 0.36, F(MIN, 600), "#FFFFFF"); text(g, r.state, 968, y + 46 + MIN * 0.36, F(MIN, 500), THEME.text.secondary, "right");
      hit(id, 40, y, 944, 92, { type: "select", n: r.n });
    });
    if (rows.length > per) {
      btn("rowprev", 40, 484, 128, 92, "\u2039", { action: { type: "_rows", d: -1 } }); btn("rownext", 856, 484, 128, 92, "\u203a", { action: { type: "_rows", d: 1 } });
      text(g, `${page * per + 1} to ${Math.min(rows.length, page * per + per)} of ${rows.length}`, 512, 484 + 46 + MIN * 0.36, F(MIN, 500), THEME.text.tertiary, "center");
    }
    // the bracket, the lesson's main readout: label on one line, the number under it, words unchanged
    let y = 636;
    for (const line of m.bracket) {
      const k = line.indexOf(": ");
      if (k > 0) { text(g, line.slice(0, k + 1), 48, y, F(MIN, 500), THEME.text.secondary); text(g, line.slice(k + 2), 48, y + 58, F(MIN, 650), "#FFFFFF"); y += 124; }
      else { text(g, line, 48, y, F(MIN, 650), "#FFFFFF"); y += 62; }
    }
  }
  shotHead(g, sel, label) {
    g.beginPath(); g.arc(PAD + 40, 212, 28, 0, 7); g.fillStyle = sel.color; g.fill(); text(g, String(sel.n), PAD + 40, 212 + 16, F(48, 700), "#10131e", "center");
    text(g, label, PAD + 90, 212 + 20, F(MIN, 650), "#FFFFFF");
  }
  drawShotDetail(g, m) {
    const sel = m.rows.find((r) => r.n === m.selected) || m.rows[m.rows.length - 1];
    if (!sel) { text(g, "No shots yet. Press FIRE.", 512, 340, F(MIN, 500), THEME.text.secondary, "center"); return; }
    this.shotHead(g, sel, `Shot ${sel.n}   ${sel.speed}`);
    // Distance and Angle come before Lowest and Highest so a full page never cuts them
    const all = facts(m.detailFull.slice(0, 5)).map(cap), lowHigh = (l) => /^(Lowest|Highest) /.test(l);
    let y = 300; for (const l of [...all.filter((l) => !lowHigh(l)), ...all.filter(lowHigh)]) for (const ln of this.wrap(g, l, F(MIN, 500), BODY_W)) { if (y > LIMIT) break; text(g, ln, PAD, y, F(MIN, 500), THEME.text.secondary); y += LH; }
  }
  /** Shots page: Between your shots. Line 1, then line 2 (VR keeps the 56 px floor, so it is lighter instead of smaller), then the circular speed at help 2. */
  drawBetween(g, m) {
    if (!m.between) return;
    let y = 232; text(g, m.between.line1, PAD, y, F(MIN, 650), "#FFFFFF"); y += LH;
    for (const ln of this.wrap(g, m.between.line2.replace(" vs. ", " vs.\u00a0"), F(MIN, 400), BODY_W)) { text(g, ln, PAD, y, F(MIN, 400), THEME.text.tertiary); y += LH; }
    if (m.between.extra) { y += 12; text(g, m.between.extra, PAD, y, F(MIN, 650), "#FFFFFF"); }
  }
  /** Shots page, only at help level 2 while a shot is flying: the fall check, from the lesson's own wording. */
  drawShotLevelTwo(g, m) {
    const sel = m.rows.find((r) => r.n === m.selected) || m.rows[m.rows.length - 1];
    if (!sel) return;
    this.shotHead(g, sel, `Shot ${sel.n}   Fall check`);
    let y = 300; for (const l of facts(m.levelTwo)) for (const ln of this.wrap(g, cap(l), F(MIN, 500), BODY_W)) { if (y > LIMIT) break; text(g, ln, PAD, y, F(MIN, 500), THEME.text.secondary); y += LH; }
  }
  drawView(g, m, btn, pg) {
    const lk = (k) => m.lock.includes(k);
    if (pg === 0) {
      btn("vm", 40, 196, 464, 120, "Mountain", { on: m.view === "mountain", action: { type: "setView", view: "mountain" }, locked: lk("view") });
      btn("vo", 520, 196, 464, 120, "Model", { on: m.view === "model", action: { type: "setView", view: "model" }, locked: lk("view") });
      [["trail", "Trail", m.trail, false], ["velvec", "Velocity arrow", m.velvec, lk("vectors")], ["gravec", "Gravity arrow", m.gravec, lk("vectors")]].forEach(([k, label, on, locked], i) => {
        btn("t" + k, 40, 340 + i * 130, 944, 114, `${label}   ${on ? "On" : "Off"}`, { on, locked, action: { type: "toggle", key: k } });
      });
      if (m.inAR) btn("place", 40, 740, 944, 114, "Place globe here", { action: { type: "_place" } });
    } else if (pg === 1) {
      btn("air", 40, 196, 944, 104, "Air " + (m.air ? "On" : "Off"), { on: m.air, locked: lk("air"), action: { type: "toggle", key: "air" } });
      text(g, "Ball mass", 40, 372, F(MIN, 500), THEME.text.tertiary);
      C.ball.massChoices.forEach((kg, i) => btn("m" + kg, 40 + i * 322, 392, 300, 104, kg + " kg", { on: m.mass === kg, locked: lk("air"), action: { type: "setMass", kg } }));
      text(g, "Gravity", 40, 568, F(MIN, 500), THEME.text.tertiary);
      [0, 25, 50, 75, 100].forEach((p, i) => btn("g" + p, 40 + i * 192, 588, 176, 104, p + "%", { on: m.gdial === p, action: { type: "setGdial", pct: p } }));
    } else {
      text(g, "Reference rings", 40, 250, F(MIN, 500), THEME.text.tertiary);
      ["iss", "geo", "moon"].forEach((r, i) => btn("r" + r, 40 + i * 322, 270, 300, 104, { iss: "ISS", geo: "GEO", moon: "Moon" }[r], { on: m.rings.includes(r), locked: m.help < 1, action: { type: "_ring", ring: r } }));
      text(g, "Model size in cm", 40, 462, F(MIN, 500), THEME.text.tertiary);
      const n = m.sizes.length, w = Math.floor((944 - 12 * (n - 1)) / n);
      m.sizes.forEach((cm, i) => btn("s" + cm, 40 + i * (w + 12), 482, w, 104, String(cm), { on: m.size === cm, action: { type: "setSize", cm } }));
    }
  }
  /** Help is laid out by measuring: blocks fill a page to LIMIT, then the next page starts. Every line is 56 px. */
  helpBlocks(m) {
    const blocks = [{ h: `Help level: ${S.LEVELS[m.help]}${m.lock.includes("help") ? " (locked)" : ""}`, lines: [] }];
    blocks.push({ h: "Controls", lines: S.CONTROLS_VR });
    for (const l of m.helpLines) blocks.push({ h: l.h, lines: [l.t] });
    blocks.push({ h: "Credits", lines: S.CREDITS_VR });
    return blocks;
  }
  helpPages() {
    const g = this.canvas.getContext("2d"), m = this.m || { help: 0, lock: [], helpLines: [] }, pages = [[]]; let y = 232;
    const room = (n) => y + n * LH <= LIMIT;
    for (const b of this.helpBlocks(m)) {
      const body = b.lines.flatMap((t) => this.wrap(g, glue(t), F(MIN, 500), BODY_W));
      if (b.lines.length <= 1 && !room(1 + body.length) && y > 232) { pages.push([]); y = 232; } // short blocks stay whole; lists may flow
      if (y > LIMIT - LH * 2) { pages.push([]); y = 232; }
      pages[pages.length - 1].push({ t: b.h, font: F(MIN, 650), color: "#FFFFFF", y }); y += LH;
      for (const ln of body) { if (y > LIMIT) { pages.push([]); y = 232; } pages[pages.length - 1].push({ t: ln, font: F(MIN, 500), color: THEME.text.secondary, y }); y += LH; }
      y += 12;
    }
    return pages;
  }
  drawHelp(g, m, pg) { for (const o of (this.helpPages()[pg] || [])) text(g, o.t, PAD, o.y, o.font, o.color); }
  /** Greedy wrap; if that leaves one word alone on the last line, rewrap at the narrowest width that keeps the same line count (balanced). */
  wrap(g, s, font, maxW) {
    g.font = font;
    const run = (w) => { const out = []; let line = ""; for (const word of s.split(/ +/)) { const t = line ? line + " " + word : word; if (g.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; } if (line) out.push(line); return out; };
    const out = run(maxW); if (out.length < 2 || out[out.length - 1].includes(" ")) return out;
    let lo = maxW / 3, hi = maxW; for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (run(mid).length === out.length) hi = mid; else lo = mid; }
    const bal = run(hi); return bal.length === out.length && bal[bal.length - 1].includes(" ") ? bal : out;
  }
}
export { PANEL_PX };

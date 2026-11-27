// Newton's Mountain: the in-headset panel. One 1024 x 1024 canvas quad, 0.80 m wide, in Night Sky's look (ui/ns-ui-look.js
// primitives). It extends the Night Sky VRPanel for placement, hit-testing and dragging, and only replaces draw().
// Tabs: Launch, Shots, View, Help. Text is 56 px where it fits; secondary lines are 44 to 48 px (flagged for Leo).
import { VRPanel, PANEL_PX } from "../night-sky/ns-vrpanel.js";
import { THEME, squircle, surface, panelBackground, text, icon, iconAlpha, labelColor } from "../night-sky/ui/ns-ui-look.js";
import { NM_CONFIG as C } from "./nm-config.js";
import * as S from "./nm-strings.js";

export const TABS = [["launch", "Launch"], ["shots", "Shots"], ["view", "View"], ["help", "Help"]];
export const PAGES = { launch: 1, shots: 1, view: 2, help: 3 };
const F = (px, w = 600) => `${w} ${px}px Inter`;

export class NMPanel extends VRPanel {
  constructor(THREE, icons) { super(THREE, icons); this.tab = "launch"; this.page = { launch: 0, shots: 0, view: 0, help: 0 }; this.shotRow = 0; this.holdClear = 0; }
  /** m: view model built by nm-main (see buildPanelModel). */
  draw(m) {
    const g = this.canvas.getContext("2d"); this.hits = []; this.m = m;
    panelBackground(g);
    const hit = (id, x, y, w, h, action, extra = {}) => this.hits.push({ id, x, y, w, h, action, ...extra });
    const st = (id, on, locked) => (locked ? "locked" : this.pressed === id ? "pressed" : on && this.hover === id ? "on-hover" : on ? "on" : this.hover === id ? "hover" : "off");
    const btn = (id, x, y, w, h, label, { on = false, locked = false, size = 56, action = null, sub = null, extra = {} } = {}) => {
      const s = st(id, on, locked); surface(g, x, y, w, h, 40, s);
      text(g, label, x + w / 2, y + h / 2 + size * 0.36 - (sub ? 14 : 0), F(size, 600), labelColor(s), "center");
      if (sub) text(g, sub, x + w / 2, y + h / 2 + 34, F(36, 500), THEME.text.tertiary, "center");
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
    const pages = PAGES[this.tab], pg = this.page[this.tab];
    if (pages > 1) for (let i = 0; i < pages; i++) { g.beginPath(); g.arc(512 + (i - (pages - 1) / 2) * 28, 176, 8, 0, 7); g.fillStyle = i === pg ? "#FFFFFF" : "rgba(255,255,255,0.3)"; g.fill(); }
    if (this.tab === "launch") this.drawLaunch(g, m, btn, text);
    else if (this.tab === "shots") this.drawShots(g, m, btn, hit, st);
    else if (this.tab === "view") this.drawView(g, m, btn);
    else this.drawHelp(g, m);
    return this.flush();
  }
  drawLaunch(g, m, btn) {
    const lk = (k) => m.lock.includes(k);
    text(g, m.speed.toLocaleString("en-US") + " m/s", 512, 262, F(120, 300), "#FFFFFF", "center");
    text(g, (m.speed / 1000).toFixed(2) + " km/s", 512, 330, F(52, 500), THEME.text.secondary, "center");
    [[-1000, -100, -10, -1], [1, 10, 100, 1000]].forEach((row, r) => row.forEach((d, i) => btn("step" + d, 40 + i * 240, 352 + r * 108, 224, 96, (d > 0 ? "+" : "\u2212") + Math.abs(d), { locked: lk("speed"), action: { type: "speedStep", delta: d } })));
    btn("fire", 40, 580, 600, 140, "FIRE", { size: 84, action: { type: "fire" }, on: true });
    btn("clear", 656, 580, 328, 140, "Clear", { size: 56, action: { type: "clear" }, sub: "hold X" });
    btn("pause", 40, 736, 240, 100, m.paused ? "Play" : "Pause", { action: { type: "pauseToggle" }, on: m.paused });
    btn("warp", 296, 736, 300, 100, m.warpLabel, { action: { type: "warpAuto" }, sub: "Smart pace", on: m.warpAuto, size: 52 });
    btn("view", 612, 736, 372, 100, m.view === "mountain" ? "Model view" : "Mountain view", { action: { type: "toggleView" }, locked: lk("view"), size: 46 });
    text(g, "Mountain height in km", 40, 880, F(38, 500), THEME.text.tertiary);
    C.heightsKm.forEach((h, i) => btn("h" + h, 40 + i * 136, 896, 124, 96, String(h), { on: m.h === h, locked: lk("height"), size: 50, action: { type: "setHeight", km: h } }));
  }
  drawShots(g, m, btn, hit, st) {
    const rows = m.rows, per = 3, y0 = 196, pg = this.shotRow = Math.min(this.shotRow, Math.max(0, Math.ceil(rows.length / per) - 1));
    if (!rows.length) text(g, "No shots yet. Press FIRE.", 512, 360, F(54, 500), THEME.text.secondary, "center");
    rows.slice(pg * per, pg * per + per).forEach((r, i) => {
      const y = y0 + i * 100, on = m.selected === r.n, id = "row" + r.n, s = st(id, on, false);
      surface(g, 40, y, 944, 92, 36, s);
      g.beginPath(); g.arc(92, y + 46, 22, 0, 7); g.fillStyle = r.color; g.fill(); text(g, String(r.n), 92, y + 62, F(40, 700), "#10131e", "center");
      text(g, r.speed, 140, y + 62, F(52, 600), "#FFFFFF"); text(g, r.state, 968, y + 62, F(48, 500), THEME.text.secondary, "right");
      hit(id, 40, y, 944, 92, { type: "select", n: r.n });
    });
    if (rows.length > per) { btn("rowprev", 40, 506, 120, 60, "\u2039", { action: { type: "_rows", d: -1 }, size: 48 }); btn("rownext", 864, 506, 120, 60, "\u203a", { action: { type: "_rows", d: 1 }, size: 48 }); }
    const fit = (line, size, w, col) => { let z = size; for (; z > 28; z -= 2) { g.font = F(z, w); if (g.measureText(line).width <= 900) break; } text(g, line, 48, 0, F(z, w), col); return z; };
    let y = 600;
    for (const line of m.detail.slice(0, 4)) { g.save(); g.translate(0, y); fit(line, 42, 500, THEME.text.secondary); g.restore(); y += 50; }
    y = 850; for (const line of m.bracket) { g.save(); g.translate(0, y); fit(line, 44, 600, "#FFFFFF"); g.restore(); y += 54; }
  }
  drawView(g, m, btn) {
    const lk = (k) => m.lock.includes(k), pg = this.page.view;
    if (pg === 0) {
      btn("vm", 40, 200, 464, 120, "Mountain", { on: m.view === "mountain", action: { type: "setView", view: "mountain" }, locked: lk("view") });
      btn("vo", 520, 200, 464, 120, "Model", { on: m.view === "model", action: { type: "setView", view: "model" }, locked: lk("view") });
      [["trail", "Trail", m.trail, false], ["velvec", "Velocity arrow", m.velvec, lk("vectors")], ["gravec", "Gravity arrow", m.gravec, lk("vectors")]].forEach(([k, label, on, locked], i) => {
        btn("t" + k, 40, 350 + i * 130, 944, 114, `${label}   ${on ? "On" : "Off"}`, { on, locked, action: { type: "toggle", key: k } });
      });
      if (m.inAR) btn("place", 40, 750, 944, 114, "Place globe here", { action: { type: "_place" } });
    } else {
      btn("air", 40, 200, 464, 104, "Air " + (m.air ? "On" : "Off"), { on: m.air, locked: lk("air"), action: { type: "toggle", key: "air" } });
      text(g, "Ball", 520, 270, F(44, 500), THEME.text.tertiary);
      C.ball.massChoices.forEach((kg, i) => btn("m" + kg, 600 + i * 130, 200, 124, 104, kg + "kg", { on: m.mass === kg, locked: lk("air"), size: 38, action: { type: "setMass", kg } }));
      text(g, "Gravity", 40, 360, F(44, 500), THEME.text.tertiary);
      [0, 25, 50, 75, 100].forEach((p, i) => btn("g" + p, 40 + i * 190, 376, 176, 104, p + "%", { on: m.gdial === p, action: { type: "setGdial", pct: p } }));
      text(g, "Reference rings", 40, 540, F(44, 500), THEME.text.tertiary);
      ["iss", "geo", "moon"].forEach((r, i) => btn("r" + r, 40 + i * 322, 556, 300, 104, { iss: "ISS", geo: "GEO", moon: "Moon" }[r], { on: m.rings.includes(r), locked: m.help < 1, action: { type: "_ring", ring: r } }));
      text(g, "Model size (cm)", 40, 720, F(44, 500), THEME.text.tertiary);
      m.sizes.forEach((cm, i) => btn("s" + cm, 40 + i * 240, 736, 224, 104, String(cm), { on: m.size === cm, size: 50, action: { type: "setSize", cm } }));
    }
  }
  drawHelp(g, m) {
    const pg = this.page.help; let y = 232;
    const put = (t, font = F(42, 500), color = THEME.text.secondary, gap = 52) => { for (const ln of this.wrap(g, t, font, 930)) { text(g, ln, 48, y, font, color); y += gap; } };
    if (pg === 0) {
      put(`Help level: ${S.LEVELS[m.help]}${m.lock.includes("help") ? " (locked)" : ""}`, F(48, 650), "#FFFFFF", 62);
      for (const l of S.CONTROLS_VR) put(l, F(40, 500), THEME.text.secondary, 48);
    } else if (pg === 1) for (const l of m.helpLines) { put(l.h, F(44, 650), "#FFFFFF", 54); put(l.t, F(40, 500), THEME.text.secondary, 46); y += 10; }
    else { put("Credits", F(48, 650), "#FFFFFF", 62); for (const l of S.CREDITS) put(l, F(34, 500), THEME.text.tertiary, 40); }
  }
  wrap(g, s, font, maxW) {
    g.font = font; const out = []; let line = "";
    for (const w of s.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  }
}
export { PANEL_PX };

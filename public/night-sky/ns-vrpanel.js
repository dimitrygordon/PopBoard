// In-headset panel (Leo's look, ui/ui-spec.md and ui/ns-ui-look.js). One 1024 x 1024 canvas on a 0.80 m quad,
// opened 1.2 m in front with its centre about 15 degrees below the eye line. Time page 1 and Sky page 1 are Leo's
// drawTime/drawSky with hit rects matching his layout; Time page 2, Sky page 2 ("Display"), Place and Help are built
// from his primitives (surface, squircle, text, icon) with the same sizes: 56 px minimum text, 112-128 px targets.
import { THEME, squircle, surface, panelBackground, tabs, drawTime, drawSky, text, icon, iconAlpha, labelColor } from "./ui/ns-ui-look.js";
import { PLACES } from "./ns-state.js";
import { fmtLocal } from "./ns-ui.js";

export const PANEL_PX = 1024, PANEL_M = 0.8;
const ICONS = ["art", "brightness", "close", "grid", "ground", "help-off", "lines", "lock", "names", "now", "pause", "planets", "play", "reset", "reverse", "speed",
  "star-names", "step-back", "step-forward", "tab-help", "tab-place", "tab-sky", "tab-time", "trails"];
const SPEED_STEPS = [1, 60, 600, 3600];
export const UNITS = [["Hour", 3600e3], ["Day", 86400e3], ["Month", 30.436875 * 86400e3]];
const TAB_IDS = ["time", "place", "sky", "help"];

export async function loadPanelAssets(baseUrl) {
  try { const f = new FontFace("Inter", `url(${new URL("ui/fonts/inter-latin-var.woff2", baseUrl).href})`, { weight: "100 900" }); document.fonts.add(await f.load()); } catch { /* falls back to a system font */ }
  const icons = {};
  let svg = {}; try { svg = (await (await fetch(new URL("ui/icons.json", baseUrl))).json()).icons; } catch { /* panel draws without icons */ }
  await Promise.all(ICONS.map((n) => new Promise((res) => { if (!svg[n]) return res(); const im = new Image(); im.onload = () => { icons[n] = im; res(); }; im.onerror = res; im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg[n]); })));
  return icons;
}

function wrap(g, s, font, maxW) {
  g.font = font; const out = []; let line = "";
  for (const w of s.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

export class VRPanel {
  constructor(THREE, icons) {
    this.THREE = THREE; this.icons = icons;
    this.canvas = document.createElement("canvas"); this.canvas.width = this.canvas.height = PANEL_PX;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.tex.generateMipmaps = true; this.tex.minFilter = THREE.LinearMipmapLinearFilter;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_M, PANEL_M), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false }));
    this.mesh.renderOrder = 60; this.mesh.visible = false;
    this.tab = "time"; this.page = { time: 0, sky: 0, help: 0 }; this.hover = null; this.pressed = null; this.hits = [];
    this.unit = 0; this.scrub = 0.5; this.scrubLabel = ""; this.reverse = false; this.drag = null;
  }
  // ---- drawing ----
  draw(st, info) {
    const g = this.canvas.getContext("2d"); this.hits = []; this.st = st;
    const S = (id, on, locked) => (locked ? "locked" : this.pressed === id ? "pressed" : on && this.hover === id ? "on-hover" : on ? "on" : this.hover === id ? "hover" : "off");
    const lockT = st.lock.includes("time"), lockP = st.lock.includes("place"), lockS = st.lock.includes("sky");
    const hit = (id, x, y, w, h, action, extra = {}) => this.hits.push({ id, x, y, w, h, action, ...extra });
    const hoverTab = TAB_IDS.indexOf((this.hover || "").replace("tab-", ""));
    const tabHits = () => TAB_IDS.forEach((t, i) => hit("tab-" + t, 40 + i * 236, 40, 236, 128, null, { tab: t }));
    const { date, time } = fmtLocal(info.simMs, st.tz);
    const [clock, ...zone] = time.split(" ");
    if (this.tab === "time" && this.page.time === 0) {
      const sp = st.clock.speed, abs = Math.abs(sp), playing = sp !== 0, rev = sp < 0 || (!playing && this.reverse);
      drawTime(g, this.icons, {
        date, time: clock + (zone.length > 1 ? " " + zone[0] : ""), tz: zone[zone.length - 1] || "", hoverTab,
        sub: `${new Date(info.simMs).toISOString().slice(11, 16)} UTC  ${st.loc && PLACES[st.loc] ? PLACES[st.loc].name : "Custom place"}`,
        scrubLabel: this.scrubLabel, playing, speedIdx: SPEED_STEPS.indexOf(abs), unit: UNITS[this.unit][0], scrub: this.scrub,
        s: { now: S("now", st.timeSpec.kind === "now", lockT), back: S("back", false, lockT), play: this.pressed === "play" ? "pressed" : this.hover === "play" ? "hover" : "off",
          fwd: S("fwd", false, lockT), rev: S("rev", rev, lockT), unit: S("unit", false, lockT), scrub: this.drag && this.drag.kind === "scrub" ? "pressed" : "off" },
      });
      this.pageDots(g, 2, 0, 960, 262);
      tabHits();
      if (!lockT) {
        hit("now", 40, 556, 236, 128, { type: "now" }); hit("back", 320, 556, 128, 128, { step: -1 }); hit("play", 472, 540, 160, 160, { type: "togglePlay" });
        hit("fwd", 656, 556, 128, 128, { step: 1 }); hit("rev", 828, 556, 156, 128, { reverse: true });
        SPEED_STEPS.forEach((s, i) => hit("speed" + s, 40 + i * 236, 724, 236, 120, { speedAbs: s }));
        hit("unit", 40, 880, 236, 112, { cycleUnit: true }); hit("scrub", 300, 868, 684, 140, null, { scrub: true });
      }
      return this.flush();
    }
    if (this.tab === "sky" && this.page.sky === 0) {
      drawSky(g, this.icons, { hoverTab, artOn: st.art, artAlpha: st.artalpha,
        s: { lines: S("lines", st.lines, lockS), art: S("art", st.art, lockS), names: S("names", st.names, lockS), helpOff: S("helpoff", false, lockS) } });
      if (info.artStatus === "loading" && st.art) text(g, "Loading art", 984, 286, THEME.type.label, THEME.accent, "right");
      tabHits();
      if (!lockS) {
        ["lines", "art", "names"].forEach((k, i) => hit(k, 40 + i * 324, 300, 296, 268, { type: "toggle", key: k }));
        hit("slider", 260, 612, 600, 112, null, { slider: true }); hit("helpoff", 40, 756, 944, 128, { type: "helpOff" });
      }
      hit("next", 856, 900, 128, 92, null, { page: 1 });
      return this.flush();
    }
    // ---- generic pages ----
    panelBackground(g); tabs(g, this.icons, TAB_IDS.indexOf(this.tab), hoverTab); tabHits();
    let y = 196;
    let gapY = 8;
    const row = (iconName, items, locked, h = 112) => {
      let x = 40;
      if (iconName) { icon(g, this.icons[iconName], 82, y + h / 2, 64, locked ? 0.4 : 0.9); x = 124; }
      const free = 984 - x, gap = 12, w = (free - gap * (items.length - 1)) / items.length;
      items.forEach((it) => {
        const s = S(it.id, it.on, locked);
        surface(g, x, y, w, h, 40, s);
        if (it.icon) icon(g, this.icons[it.icon], x + 56, y + h / 2, 56, iconAlpha(s));
        text(g, it.text, it.icon ? x + 96 : x + w / 2, y + h / 2 + 20, THEME.type.label, labelColor(s), it.icon ? "left" : "center");
        if (!locked) hit(it.id, x, y, w, h, it.action);
        x += w + gap;
      });
      y += h + gapY;
    };
    const lines = (arr, font = THEME.type.body, color = THEME.text.secondary, lh = 68) => { for (const s of arr) for (const l of wrap(g, s, font, 920)) { text(g, l, 64, y + 52, font, color); y += lh; } };
    if (this.tab === "time") { // page 2: jumps
      text(g, date, 64, y + 60, THEME.type.date, THEME.text.secondary); y += 92;
      row(null, [{ id: "tonight", text: "Tonight 9 PM", action: { type: "tonight" } }, { id: "m6", text: "+6 months", action: { type: "jump", months: 6 } }], lockT, 128);
      row(null, [{ id: "d-", text: "-1 day", action: { type: "jump", deltaMs: -86400e3 } }, { id: "d+", text: "+1 day", action: { type: "jump", deltaMs: 86400e3 } }], lockT);
      row(null, [{ id: "mo-", text: "-1 month", action: { type: "jump", months: -1 } }, { id: "mo+", text: "+1 month", action: { type: "jump", months: 1 } }], lockT);
      text(g, "SEASONS (ABOUT)", 64, y + 52, THEME.type.header, THEME.text.tertiary, "left", 6); y += 72;
      row(null, [["mar", "Mar 20"], ["jun", "Jun 21"], ["sep", "Sep 22"], ["dec", "Dec 21"]].map(([k, t]) => ({ id: "season-" + k, text: t, action: { type: "season", season: k } })), lockT); // one row of four: the back arrow (856,900) used to sit on Dec 21
      if (st.clampNote) text(g, "Dates stop at 1900 and 2050", 64, y + 52, THEME.type.label, THEME.accent);
      this.pageDots(g, 2, 1, 960, 262); this.backArrow(g, hit);
    } else if (this.tab === "sky") { // page 2: Display. 7 rows of 112 px (Leo's row height) fit 176..996 with 6 px gaps
      y = 176; gapY = 6;
      row("star-names", [{ id: "starnames", text: "Star names", on: st.starnames, action: { type: "toggle", key: "starnames" } }, { id: "polaris", text: "Polaris", on: st.hl === "polaris", action: { type: "set", key: "hl", value: st.hl === "polaris" ? "" : "polaris" } }], lockS);
      row("grid", [["altaz", "Alt/Az"], ["eq", "RA/Dec"], ["ecl", "Ecliptic"]].map(([k, t]) => ({ id: "g-" + k, text: t, on: st.grid.includes(k), action: { type: "toggleGrid", grid: k } })), lockS);
      row("planets", [{ id: "planets", text: "Planets, Moon", on: st.planets, action: { type: "toggle", key: "planets" } }, { id: "sky-real", text: "Daylight", on: st.sky === "real", action: { type: "set", key: "sky", value: st.sky === "real" ? "night" : "real" } }], lockS);
      row("ground", [{ id: "ground1", text: "Solid", on: st.ground, action: { type: "set", key: "ground", value: true } }, { id: "ground0", text: "See-through", on: !st.ground, action: { type: "set", key: "ground", value: false } }], lockS);
      row("trails", [[0, "Off"], [2, "2 h"], [6, "6 h"], [12, "12 h"]].map(([h, t]) => ({ id: "tr" + h, text: t, on: st.trails === h, action: { type: "set", key: "trails", value: h } })), lockS);
      row("brightness", [4, 5, 5.5, 6, 6.5].map((m) => ({ id: "mag" + m, text: m.toFixed(1), on: st.mag === m, action: { type: "set", key: "mag", value: m } })), lockS);
      surface(g, 40, y, 330, 112, 40, S("reset", false, lockS)); icon(g, this.icons.reset, 96, y + 56, 56, 0.9); text(g, "Reset", 140, y + 76, THEME.type.label, labelColor(S("reset", false, lockS)));
      if (!lockS) hit("reset", 40, y, 330, 112, { type: "reset" });
      surface(g, 390, y, 330, 112, 40, S("vignette", st.vignette, false)); text(g, "Vignette", 555, y + 76, THEME.type.label, labelColor(S("vignette", st.vignette, false)), "center");
      hit("vignette", 390, y, 330, 112, { type: "toggle", key: "vignette" });
      this.pageDots(g, 2, 1, 820, y + 72);
      surface(g, 856, y + 10, 128, 92, 40, this.hover === "prev" ? "hover" : "off"); icon(g, this.icons["step-back"], 920, y + 56, 52, 0.85); hit("prev", 856, y + 10, 128, 92, null, { page: 0 });
    } else if (this.tab === "place") {
      text(g, st.loc && PLACES[st.loc] ? PLACES[st.loc].name : "Custom place", 64, 262, THEME.type.date, THEME.text.primary);
      text(g, `${Math.abs(st.lat).toFixed(2)}° ${st.lat >= 0 ? "N" : "S"}, ${Math.abs(st.lon).toFixed(2)}° ${st.lon >= 0 ? "E" : "W"}`, 64, 330, THEME.type.body, THEME.text.secondary);
      text(g, (st.latLonGiven && !st.tzGiven ? "Device clock " : "Clock ") + st.tz.split("/").pop().replace(/_/g, " "), 64, 398, THEME.type.body, THEME.text.tertiary);
      y = 424;
      const P = Object.entries(PLACES).map(([k, p]) => ({ id: "loc-" + k, text: p.name, on: st.loc === k, action: { type: "setPlace", loc: k } }));
      row(null, P.slice(0, 2), lockP); row(null, P.slice(2, 4), lockP); row(null, P.slice(4, 6), lockP);
      text(g, "Lat", 64, y + 76, THEME.type.label, THEME.text.tertiary); const y0 = y;
      y = y0; this.nudgeRow(g, hit, S, "lat", "dLat", lockP, y0); y = y0 + 120;
      text(g, "Lon", 64, y + 76, THEME.type.label, THEME.text.tertiary); this.nudgeRow(g, hit, S, "lon", "dLon", lockP, y);
    } else { // help
      if (this.page.help === 0) {
        text(g, "CONTROLS", 64, 262, THEME.type.header, THEME.text.tertiary, "left", 6); y = 290;
        lines(["Trigger or pinch: pick a star, press a button.", "Grip and sweep: scrub time.", "Thumbstick: scrub time.", "B or Y: show or hide this panel.", "Top edge: drag the panel."]);
      } else {
        text(g, "CREDITS", 64, 262, THEME.type.header, THEME.text.tertiary, "left", 6); y = 290;
        lines(["Stars: HYG v4.4, astronexus, CC BY-SA 4.0", "Lines and names: Stellarium, CC BY-SA", "Art: Johan Meuris, restyled by Leo, FAL 1.3", "Font: Inter, SIL OFL 1.1", "Planets: JPL. Moon and Sun: Meeus", "Planets are enlarged so you can find them. Through your eyes they look like bright stars."], THEME.type.body, THEME.text.secondary, 56);
      }
      this.pageDots(g, 2, this.page.help, 960, 262);
      if (this.page.help === 0) { surface(g, 856, 900, 128, 92, 40, this.hover === "next" ? "hover" : "off"); icon(g, this.icons["step-forward"], 920, 946, 52, 0.85); hit("next", 856, 900, 128, 92, null, { page: 1 }); }
      else this.backArrow(g, hit);
    }
    // the drag strip: the top 32 px above the tab bar
    return this.flush();
  }
  nudgeRow(g, hit, S, key, field, locked, y) {
    const items = [[-10, "-10°"], [-1, "-1°"], [1, "+1°"], [10, "+10°"]]; const x0 = 180, w = (984 - x0 - 36) / 4;
    items.forEach(([d, t], i) => { const id = key + d, x = x0 + i * (w + 12), s = S(id, false, locked); surface(g, x, y, w, 112, 40, s); text(g, t, x + w / 2, y + 76, THEME.type.label, labelColor(s), "center"); if (!locked) hit(id, x, y, w, 112, { type: "nudge", [field]: d }); });
  }
  pageDots(g, n, active, xRight, y, centred = false) {
    for (let i = 0; i < n; i++) { const x = centred ? xRight - (n - 1) * 16 + i * 32 - 160 : xRight - (n - 1 - i) * 32; g.beginPath(); g.arc(x, y - 16, 9, 0, Math.PI * 2); g.fillStyle = i === active ? "#FFFFFF" : "rgba(255,255,255,0.3)"; g.fill(); }
  }
  backArrow(g, hit) { surface(g, 856, 900, 128, 92, 40, this.hover === "prev" ? "hover" : "off"); icon(g, this.icons["step-back"], 920, 946, 52, 0.85); hit("prev", 856, 900, 128, 92, null, { page: 0 }); }
  flush() { this.hits.unshift({ id: "drag", x: 0, y: 0, w: PANEL_PX, h: 36, drag: true }); this.tex.needsUpdate = true; return this.hits; }

  // ---- placement and hit-testing ----
  placeInFront(camera) {
    const T = this.THREE; const p = new T.Vector3().setFromMatrixPosition(camera.matrixWorld);
    const f = new T.Vector3(0, 0, -1).transformDirection(camera.matrixWorld); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    // centre 1.2 m away, 15 degrees below the eye line, tilted to face the eye
    const d = 1.2, a = 15 * Math.PI / 180;
    this.mesh.position.copy(p).addScaledVector(f, d * Math.cos(a)); this.mesh.position.y = p.y - d * Math.sin(a);
    this.mesh.lookAt(p);
  }
  intersect(ray) {
    if (!this.mesh.visible) return null;
    const T = this.THREE; const h = new T.Raycaster(ray.origin, ray.dir, 0, 10).intersectObject(this.mesh, false)[0];
    if (!h || !h.uv) return null;
    const px = h.uv.x * PANEL_PX, py = (1 - h.uv.y) * PANEL_PX;
    let hit = null; for (let i = this.hits.length - 1; i >= 0; i--) { const r = this.hits[i]; if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) { hit = r; break; } }
    return { hit, px, py, dist: h.distance };
  }
  updateDrag(ray, camera) {
    const T = this.THREE; this.mesh.position.copy(ray.origin).addScaledVector(ray.dir, this.drag.dist);
    this.mesh.lookAt(new T.Vector3().setFromMatrixPosition(camera.matrixWorld));
  }
}

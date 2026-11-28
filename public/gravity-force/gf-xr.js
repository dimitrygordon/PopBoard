// Gravity Force Lab VR: the in-headset panel. One canvas texture, drawn from the same sceneModel() and controlsFor()
// as the page: title, the prediction chips, the reveal, the readout dial (Leo's spec), the lines, the controls, the
// scene tabs and the help levels. Pointed at with a controller ray or a hand pinch (three's WebXR controllers).
import { INK, CREAM } from "./gf-props.js";
import { pretty } from "./gf-scenes.js";

export const XRP = { W: 1024, H: 1536, M: 0.8 };   // texture px and panel width in metres (1280 px per metre)
const FONT = (px, w = 600) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`;
/** Readout sizes: main value 96 px on a 1280 px/m panel is 7.5 cm tall, about 3.6 degrees at 1.2 m (over 56 headset px). */
export const READOUT = { mainPx: 96, subScale: 0.6, subAlpha: 0.7, ink: INK, dial: CREAM };

export class XRPanel {
  constructor(THREE) {
    this.T = THREE; const c = document.createElement("canvas"); c.width = XRP.W; c.height = XRP.H; this.c = c; this.g = c.getContext("2d");
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    const h = XRP.M * XRP.H / XRP.W;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(XRP.M, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.mesh.renderOrder = 60; this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.011, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
    this.cursor.renderOrder = 61; this.cursor.visible = false; this.mesh.add(this.cursor);
    this.hits = []; this.hover = null; this.key = ""; this.ray = new THREE.Raycaster();
  }
  /** 1.2 m in front of the student, to the left, tilted up toward a seated or standing view. */
  place(headPos, headYaw) {
    const d = 1.2, side = -0.62; const fx = -Math.sin(headYaw), fz = -Math.cos(headYaw), rx = Math.cos(headYaw), rz = -Math.sin(headYaw);
    this.mesh.position.set(headPos.x + fx * d + rx * side, Math.max(0.95, headPos.y - 0.12), headPos.z + fz * d + rz * side);
    this.mesh.rotation.set(-0.12, headYaw + 0.42, 0, "YXZ");
  }
  pick(origin, dir) {
    if (!this.mesh.visible) return null; this.ray.set(origin, dir); const h = this.ray.intersectObject(this.mesh, false)[0];
    if (!h || !h.uv) { this.cursor.visible = false; return null; }
    const x = h.uv.x * XRP.W, y = (1 - h.uv.y) * XRP.H; const p = this.mesh.worldToLocal(h.point.clone()); this.cursor.position.set(p.x, p.y, 0.002); this.cursor.visible = true;
    for (const r of this.hits) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
    return "panel";
  }
  draw(M, controls, tabs, helps, force = false) {
    const key = JSON.stringify([M.title, M.lines, M.cards, M.predict, M.reveal, M.result, M.readout, controls, tabs, helps, this.hover, M.sort, M.wrongOpen, M.whyOpen]);
    if (!force && key === this.key) return; this.key = key;
    const g = this.g, W = XRP.W, H = XRP.H; g.clearRect(0, 0, W, H); this.hits = [];
    g.fillStyle = "rgba(10,13,32,0.93)"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 40) : g.rect(0, 0, W, H); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; g.stroke();
    let y = 24;
    // scene tabs
    let x = 32; const tw = (W - 64 - (tabs.length - 1) * 6) / tabs.length; for (const t of tabs) { this.btn(t.id, t.label, x, y, tw, 64, t.on, t.disabled); x += tw + 6; } y += 84;
    g.fillStyle = "#A9B0D0"; g.font = FONT(30, 600); g.fillText(M.kicker || "", 40, y + 30); y += 46;
    g.fillStyle = "#FFFFFF"; g.font = FONT(50, 700); g.fillText(M.title || "", 40, y + 48, W - 80); y += 70;
    const wrap = (text, px, col, maxLines = 4, wgt = 550) => { g.font = FONT(px, wgt); g.fillStyle = col; const words = String(text).split(" "); let line = ""; let n = 0;
      for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > W - 80 && line) { g.fillText(line, 40, y + px); y += px * 1.28; line = wd; if (++n >= maxLines) { line = ""; break; } } else line = t; }
      if (line) { g.fillText(line, 40, y + px); y += px * 1.28; } };
    // predict strip
    if (M.predict) {
      wrap(M.predict.text, 34, "#C9BDFF", 3, 600); y += 6; x = 40;
      M.predict.ids.forEach((id, i) => { const lab = M.predict.chips[i]; g.font = FONT(30, 650); const w = Math.max(150, g.measureText(lab).width + 50); if (x + w > W - 30) { x = 40; y += 78; }
        const on = M.predict.order ? (M.predict.progress || []).includes(lab) : M.predict.picked === lab; this.btn("predict:" + id, M.predict.order && on ? `${(M.predict.progress || []).indexOf(lab) + 1}. ${lab}` : lab, x, y, w, 66, on, M.predict.picked != null && M.predict.order); x += w + 10; });
      y += 84;
    }
    if (M.reveal) { wrap(`You picked: ${M.reveal.picked}`, 30, "#C9BDFF", 2); wrap(`The model: ${M.reveal.model}`, 30, "#AACDFF", 2); if (M.result) wrap(M.result, 32, "#F2F4FF", 3, 600); y += 4; }
    // readout dial (Leo): Inter semibold tabular figures, warm ink on a cream dial, 2% inner shadow, no glow
    if (M.readout) {
      const second = M.readout.second; const dw = second ? (W - 100) * 0.62 : W - 80, dh = 190;
      this.dial(40, y, dw, dh, M.readout.label, M.readout.main, M.readout.sub || M.readout.unit, !M.readout.sub);
      if (second) this.dial(40 + dw + 20, y, W - 100 - dw, dh, second.label, second.main, null);
      y += dh + 16;
    }
    // S6: the live equation tiles (Leo's round 8 frame), drawn on cream like the dial
    if (M.tiles) {
      const tw = (W - 80 - 30) / 4, th = 150; M.tiles.forEach((t, i) => {
        const tx = 40 + i * (tw + 10); g.fillStyle = t.glow ? "#F7E2B8" : CREAM; g.beginPath(); g.roundRect ? g.roundRect(tx, y, tw, th, 20) : g.rect(tx, y, tw, th); g.fill();
        g.fillStyle = INK; g.font = FONT(40, 700); g.fillText(pretty(t.sym), tx + 14, y + 46); g.font = FONT(24, 600); if ("fontVariantNumeric" in g) g.fontVariantNumeric = "tabular-nums"; g.fillText(pretty(t.val), tx + 14, y + 86, tw - 24);
        g.globalAlpha = 0.7; g.font = FONT(19, 400); g.fillText(pretty(t.unit), tx + 14, y + 118, tw - 24); g.globalAlpha = 1; });
      y += th + 14; g.fillStyle = "#FFFFFF"; g.font = FONT(34, 650); g.fillText(`F = G m\u2081 m\u2082 / r\u00B2 = ${pretty(M.force)}`, 40, y + 34, W - 80); y += 48;
      const rt = M.tiles.find((t) => t.id === "r"); if (rt && rt.bubble) { g.fillStyle = "#E8A85A"; g.font = FONT(26, 650); g.fillText(pretty(rt.bubble), 40, y + 28); y += 40; }
    }
    for (const c of (M.cards || []).slice(0, 1)) wrap(c, 30, "#E6E9F8", 4);
    for (const l of (M.lines || []).slice(0, M.view === "sort" ? 0 : 5)) wrap(l, 29, "#C3C9E6", 3);
    if (M.whyOpen && M.why) { wrap(M.why.text, 28, "#E3DBFF", 3); wrap(M.why.foot, 24, "#A9B0D0", 1); }
    if ((M.wrongOpen || M.view === "sort") && M.wrong && M.view !== "sort") M.wrong.forEach((w, i) => wrap(`${i + 1}. ${w}`, 24, "#E3DBFF", 2));
    // S5 sort (two bins): Real / Model buttons per card
    if (M.sort && M.view === "sort") {
      y += 4; g.fillStyle = "#F2F4FF"; g.font = FONT(30, 700); g.fillText("Real or model?", 40, y + 30); y += 42;
      for (const c of M.sort) { if (y > H - 360) break; g.font = FONT(24, 550); g.fillStyle = "#E6E9F8"; g.fillText(c.text, 40, y + 24, W - 330); this.btn(`sort:${c.id}:real`, "Real", W - 280, y - 6, 116, 46, c.picked === "real"); this.btn(`sort:${c.id}:model`, "Model", W - 156, y - 6, 116, 46, c.picked === "model"); y += 54; }
    }
    // controls and help at the bottom
    let by = H - 290; x = 40;
    for (const b of controls.filter((c) => !/^sort:/.test(c.id))) { g.font = FONT(28, 650); const w = Math.max(130, Math.min(420, g.measureText(b.label).width + 44)); if (x + w > W - 30) { x = 40; by += 64; } if (by > H - 110) break; this.btn(b.id, b.label, x, by, w, 56, !!b.on || !!b.primary, b.disabled); x += w + 8; }
    x = 40; const hy = H - 92; g.fillStyle = "#A9B0D0"; g.font = FONT(26, 600); g.fillText("Help", x, hy + 40); x += 80;
    for (const h of helps) { this.btn(h.id, h.label, x, hy, 200, 62, h.on, h.disabled); x += 210; }
    this.tex.needsUpdate = true;
  }
  dial(x, y, w, h, label, main, sub, subIsUnit) {
    const g = this.g; main = pretty(main); g.fillStyle = READOUT.dial; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 28) : g.rect(x, y, w, h); g.fill();
    const sh = g.createLinearGradient(0, y, 0, y + h * 0.2); sh.addColorStop(0, "rgba(42,36,32,0.02)"); sh.addColorStop(1, "rgba(42,36,32,0)"); g.fillStyle = sh; g.fill();
    if ("fontVariantNumeric" in g) g.fontVariantNumeric = "tabular-nums";
    g.fillStyle = READOUT.ink; g.globalAlpha = 0.7; g.font = FONT(26, 600); g.fillText(label || "", x + 24, y + 38, w - 48); g.globalAlpha = 1;
    let px = READOUT.mainPx; g.font = FONT(px, 600); while (g.measureText(main).width > w - 48 && px > 40) { px -= 4; g.font = FONT(px, 600); }
    g.fillText(main, x + 24, y + 44 + px * 0.9, w - 48);
    if (sub) { g.globalAlpha = READOUT.subAlpha; g.font = FONT(Math.round(READOUT.mainPx * READOUT.subScale * (subIsUnit ? 0.6 : 1)), 400); g.fillText(sub, x + 24, y + h - 18, w - 48); g.globalAlpha = 1; }
  }
  btn(id, label, x, y, w, h, on, disabled) {
    const g = this.g; const hov = this.hover === id;
    g.fillStyle = disabled ? "rgba(255,255,255,0.05)" : on ? "rgba(127,178,255,0.42)" : hov ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h); g.fill(); if (on || hov) { g.strokeStyle = "rgba(170,205,255,0.9)"; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = disabled ? "#7A809E" : "#FFFFFF"; g.font = FONT(Math.min(30, h * 0.5), 650); g.textAlign = "center"; g.fillText(label, x + w / 2, y + h * 0.66, w - 20); g.textAlign = "left";
    if (!disabled) this.hits.push({ id, x, y, w, h });
  }
}

/** Gamepad mapping (xr-standard): right A fires a marble, right thumbstick press next scene, left thumbstick picks a chip,
 *  grip held pauses motion, B or Y shows or hides the panel (handled in ns-input). Returns edge events for this frame. */
export function readPads(sources, prev) {
  const ev = { fire: false, nextScene: false, chip: 0, grip: false, stickX: 0 };
  for (const src of sources || []) {
    const gp = src && src.gamepad; if (!gp) continue; const hand = src.handedness; const p = prev[hand] || (prev[hand] = { a: false, stick: false, chip: 0 });
    const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    if (pressed(1)) ev.grip = true;
    if (hand === "right") { const a = pressed(4); if (a && !p.a) ev.fire = true; p.a = a; const st = pressed(3); if (st && !p.stick) ev.nextScene = true; p.stick = st; ev.stickX = gp.axes.length >= 4 ? gp.axes[2] : 0; }
    if (hand === "left") { const x = gp.axes.length >= 4 ? gp.axes[2] : 0; const d = x > 0.7 ? 1 : x < -0.7 ? -1 : 0; if (d && d !== p.chip) ev.chip = d; p.chip = d; }
  }
  return ev;
}

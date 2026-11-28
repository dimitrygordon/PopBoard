// Stellar Life Cycle VR: the in-headset panel. One canvas texture: the live H-R diagram on top, then the caption
// card, the prediction choices and the controls, all from the same UI model the page uses. Pointed at with a
// controller ray or a hand pinch (three's WebXR controllers), like Night Sky's VR panel.
import { drawHR } from "./sl-hr.js";

export const XRP = { W: 1024, H: 1400, M: 0.78 };   // texture px and panel width in metres (text at 30 px or more, about 2.3 cm)
const FONT = (px, w = 600) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`;

export class XRPanel {
  constructor(THREE) {
    this.T = THREE; const c = document.createElement("canvas"); c.width = XRP.W; c.height = XRP.H; this.c = c; this.g = c.getContext("2d");
    this.hr = document.createElement("canvas"); this.hr.width = XRP.W - 40; this.hr.height = 560;
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    const h = XRP.M * XRP.H / XRP.W;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(XRP.M, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.mesh.renderOrder = 60; this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.011, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
    this.cursor.renderOrder = 61; this.cursor.visible = false; this.mesh.add(this.cursor);
    this.hits = []; this.hover = null; this.key = ""; this.last = 0; this.ray = new THREE.Raycaster();
  }
  place(headPos, headYaw) {
    // below and to the left of the view, tilted up, inside a comfortable reach
    const T = this.T; const d = 0.95, side = -0.42; const yaw = headYaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    this.mesh.position.set(headPos.x + fx * d + rx * side, Math.max(0.75, headPos.y - 0.28), headPos.z + fz * d + rz * side);
    this.mesh.rotation.set(-0.32, yaw + 0.38, 0, "YXZ");
  }
  /** Hit test a ray: returns the action id under it, or null. */
  pick(origin, dir) {
    if (!this.mesh.visible) return null; this.ray.set(origin, dir); const h = this.ray.intersectObject(this.mesh, false)[0];
    if (!h || !h.uv) { this.cursor.visible = false; return null; }
    const x = h.uv.x * XRP.W, y = (1 - h.uv.y) * XRP.H; const p = this.mesh.worldToLocal(h.point.clone()); this.cursor.position.set(p.x, p.y, 0.002); this.cursor.visible = true;
    for (const r of this.hits) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
    return "panel";
  }
  draw(M, hrModel, now, force = false) {
    const key = JSON.stringify([M.title, M.kicker, M.cards, M.cardIdx, M.question && M.question.key, M.buttons, M.toggles, M.chips, M.readouts, M.reveal, M.masses, M.pinPrompt, this.hover]);
    if (!force && key === this.key && now - this.last < 200) return; if (!force && key === this.key && !(hrModel && hrModel.live)) return;
    this.key = key; this.last = now;
    const g = this.g, W = XRP.W, H = XRP.H; g.clearRect(0, 0, W, H); this.hits = [];
    g.fillStyle = "rgba(10,13,32,0.92)"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 40) : g.rect(0, 0, W, H); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; g.stroke();
    let y = 20;
    if (hrModel) { const hg = this.hr.getContext("2d"); drawHR(hg, this.hr.width, this.hr.height, hrModel, 2.1); g.drawImage(this.hr, 20, y); if (M.screen === "hub" && M.pinPrompt) this.hits.push({ id: "hr", x: 20, y, w: this.hr.width, h: this.hr.height }); y += this.hr.height + 16; }
    g.fillStyle = "#A9B0D0"; g.font = FONT(30, 600); g.fillText(M.kicker || "", 40, y + 30, W - 80); y += 44;
    g.fillStyle = "#FFFFFF"; g.font = FONT(48, 700); g.fillText(M.title || "", 40, y + 46, W - 80); y += 66;
    const wrap = (text, px, w, col, maxLines = 6) => { g.font = FONT(px, 550); g.fillStyle = col; const words = String(text).split(" "); let line = ""; let n = 0;
      for (const wd of words) { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > w && line) { g.fillText(line, 40, y + px); y += px * 1.28; line = wd; if (++n >= maxLines) return; } else line = t; }
      if (line) { g.fillText(line, 40, y + px); y += px * 1.28; } };
    const card = M.cards && M.cards.length ? M.cards[M.cardIdx || 0] : ""; if (card) { wrap(card, 36, W - 80, "#F2F4FF"); if (M.cards.length > 1) { g.fillStyle = "#A9B0D0"; g.font = FONT(28); g.fillText(`Card ${M.cardIdx + 1} of ${M.cards.length}`, 40, y + 28); this.btn("card+", "Next card", W - 300, y - 8, 260, 52, false); y += 52; } }
    if (M.question) { y += 6; wrap(M.question.text, 36, W - 80, "#C9BDFF"); y += 4; this.choices(M.question, y); y = this.cy; }
    if (M.masses) { let x = 40; for (const m of M.masses) { this.btn("mass:" + m.id, m.label, x, y, 178, 70, m.on); x += 188; } y += 86; }
    for (const r of M.reveal || []) { wrap(`You picked: ${r.picked}`, 32, W - 80, "#C9BDFF", 2); wrap(`The model: ${r.model}${r.extra ? ". " + r.extra : ""}`, 32, W - 80, "#AACDFF", 3); }
    if (M.pinPrompt) wrap(M.pinPrompt, 32, W - 80, "#C9BDFF", 2);
    if (M.readouts && M.readouts.length) { g.font = FONT(30, 600); let x = 40; for (const [k, v] of M.readouts) { const t = `${k}: ${v}`; const tw = g.measureText(t).width + 24; if (x + tw > W - 30) { x = 40; y += 46; } g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x, y, tw, 40); g.fillStyle = "#E6E9F8"; g.fillText(t, x + 12, y + 30); x += tw + 10; } y += 54; }
    for (const ch of (M.chips || []).slice(0, 4)) wrap(ch, 28, W - 80, "#C3C9E6", 2);
    if (M.credit) wrap(M.credit, 26, W - 80, "#8E95B8", 2);
    // controls, always at the bottom
    let bx = 40, by = H - 196; for (const t of M.toggles || []) { this.btn(t.id, t.label, bx, by, 300, 70, t.on); bx += 312; }
    bx = 40; by = H - 110; for (const b of M.buttons || []) { const w = Math.max(170, Math.min(320, b.label.length * 22 + 50)); if (bx + w > W - 30) break; this.btn(b.id, b.label, bx, by, w, 80, !!b.primary, b.disabled); bx += w + 12; }
    this.btn("calm", M.calm ? "Calm lines: on" : "Calm lines", W - 300, 20 + (hrModel ? 8 : 0), 0, 0, false);   // hit only (drawn in the strip below)
    this.tex.needsUpdate = true;
  }
  choices(q, y) {
    let x = 40; const W = XRP.W; this.cy = y;
    if (q.kind === "massMeter") { const steps = [q.min, (q.min * 3 + q.max) / 4, (q.min + q.max) / 2, (q.min + 3 * q.max) / 4, q.max].map((v) => +v.toFixed(2)); for (const v of steps) { this.btn("choice:" + q.i + ":" + v, `${v} Suns`, x, y, 176, 70, false); x += 186; } this.cy = y + 86; return; }
    for (const c of q.choices) { const w = Math.max(200, Math.min(W - 80, this.g.measureText(c.label).width + 60)); if (x + w > W - 30) { x = 40; y += 82; } this.btn((q.key === "H-End" ? "end:" : "choice:" + q.i + ":") + c.label, c.label, x, y, w, 70, c.picked); x += w + 12; }
    this.cy = y + 86;
  }
  btn(id, label, x, y, w, h, on, disabled) {
    if (!w) { this.hits.push({ id, x: XRP.W - 300, y: XRP.H - 196 - 80, w: 260, h: 64 }); const g = this.g; g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.roundRect ? g.roundRect(XRP.W - 300, XRP.H - 276, 260, 64, 32) : g.rect(XRP.W - 300, XRP.H - 276, 260, 64); g.fill(); g.fillStyle = "#E6E9F8"; g.font = FONT(28, 650); g.textAlign = "center"; g.fillText(label, XRP.W - 170, XRP.H - 234); g.textAlign = "left"; return; }
    const g = this.g; const hov = this.hover === id;
    g.fillStyle = disabled ? "rgba(255,255,255,0.05)" : on ? "rgba(127,178,255,0.42)" : hov ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h); g.fill(); if (on || hov) { g.strokeStyle = "rgba(170,205,255,0.9)"; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = disabled ? "#7A809E" : "#FFFFFF"; g.font = FONT(Math.min(32, h * 0.44), 650); g.textAlign = "center"; g.fillText(label, x + w / 2, y + h * 0.64, w - 20); g.textAlign = "left";
    if (!disabled) this.hits.push({ id, x, y, w, h });
  }
}

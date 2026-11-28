// Stellar Life Cycle VR: the in-headset panel. One canvas texture: the live H-R diagram on top, then the caption card,
// the prediction, the reveal, readouts and chips, then the life timeline and the controls, all from the same UI model the
// page uses. Pointed at with a controller ray, a hand pinch or a fingertip poke.
// v2 (Dimitry): the panel can be moved out of the way, copied from Gravity Force VR (public/gravity-force/gf-xr.js):
// a handle bar above the panel; grip, or a pinch or trigger on the handle, grabs it; a ray grabs only on the handle, so a
// drag never clicks; after a move the panel keeps its place and turns to face the student; hit-testing follows the panel.
// Layout v2: every block is placed in its own band and recorded in this.boxes, so nothing can draw over anything else
// (tests/stellar-life-v2.test.mjs checks the boxes never overlap in every state).
import { drawHR } from "./sl-hr.js";

export const XRP = { W: 1024, H: 1536, M: 0.8 };
export const PANEL_SPAWN = { dist: 1.0, below: 0.3, afterFrames: 3 };   // 0.9 to 1.1 m ahead, centre a little below the eyes   // texture px and panel width in metres (1280 px per metre, as Gravity Force)
const FONT = (px, w = 600) => `${w} ${px}px Inter, -apple-system, system-ui, sans-serif`;
export const XRL = { pad: 40, hrH: 500, ctlTop: 1536 - 330, tlY: 1536 - 316, tlH: 56, togY: 1536 - 236, btnY: 1536 - 128, btnH: 88 };
/** Word-wrap that never drops a word. measure(text) returns width in the current font. */
export function wrapLines(measure, text, maxW) {
  const words = String(text).split(" ").filter((w) => w.length); const lines = []; let line = "";
  for (const wd of words) { const t = line ? line + " " + wd : wd; if (line && measure(t) > maxW) { lines.push(line); line = wd; } else line = t; }
  if (line) lines.push(line); return lines;
}
/** True when two boxes {x, y, w, h} overlap by more than a pixel. */
export const overlaps = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;

export class XRPanel {
  constructor(THREE) {
    this.T = THREE; const c = document.createElement("canvas"); c.width = XRP.W; c.height = XRP.H; this.c = c; this.g = c.getContext("2d");
    this.hr = document.createElement("canvas"); this.hr.width = XRP.W - 2 * XRL.pad; this.hr.height = XRL.hrH; this.hrRect = { x: XRL.pad, y: 24, w: this.hr.width, h: this.hr.height };
    this.tex = new THREE.CanvasTexture(c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    const h = XRP.M * XRP.H / XRP.W;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(XRP.M, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.mesh.renderOrder = 60; this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.011, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
    this.cursor.renderOrder = 61; this.cursor.visible = false; this.mesh.add(this.cursor);
    // handle bar above the panel: grip or a hand pinch here moves the panel (as Gravity Force VR)
    const handle = new THREE.Mesh(new THREE.BoxGeometry(XRP.M * 0.92, 0.04, 0.035), new THREE.MeshBasicMaterial({ color: 0xF3E9D2, toneMapped: false }));
    handle.position.set(0, h / 2 + 0.03, 0.01); handle.renderOrder = 62; handle.userData.handle = true; this.mesh.add(handle); this.handle = handle;
    this.spawned = false; this.frames = 0;
    this._grabLocal = new THREE.Matrix4(); this.hits = []; this.boxes = []; this.hover = null; this.key = ""; this.last = 0; this.ray = new THREE.Raycaster();
  }
  /** WORLD-LOCKED (Dimitry, after testing Gravity VR on the Quest): the panel never follows the head. It spawns once, front and
   *  centre, from the real viewer pose a few frames into the session; after that only a grab (or "bring panel here") moves it. */
  spawnPose(headPos, headQuat) {
    const T = this.T; const f = new T.Vector3(0, 0, -1).applyQuaternion(headQuat); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize();
    const pos = headPos.clone().addScaledVector(f, PANEL_SPAWN.dist); pos.y = headPos.y - PANEL_SPAWN.below;
    const m = new T.Object3D(); m.position.copy(pos); m.lookAt(headPos.x, headPos.y, headPos.z); return { pos, quat: m.quaternion.clone() };
  }
  /** Put the panel front and centre now (first spawn, and the "bring panel here" action). */
  bringHere(headPos, headQuat) { const p = this.spawnPose(headPos, headQuat); this.mesh.position.copy(p.pos); this.mesh.quaternion.copy(p.quat); this.mesh.visible = true; this.spawned = true; this.mesh.updateMatrixWorld(); }
  /** Once per XR frame. Spawns after the first frames when the viewer pose is real; otherwise it does nothing at all to the panel. */
  frame(headPos, headQuat) {
    this.frames++;
    if (!this.spawned && this.frames > PANEL_SPAWN.afterFrames && headPos && headPos.y > 0.3) this.bringHere(headPos, headQuat);
    return this.spawned;
  }
  /** New session: hide until the next spawn. */
  reset() { this.spawned = false; this.frames = 0; this.mesh.visible = false; }
  /** On release the panel stays pinned where it was let go, turned to face the student. */
  endGrab(headPos) { this.mesh.lookAt(headPos.x, headPos.y, headPos.z); this.mesh.updateMatrixWorld(); }
  beginGrab(obj) { obj.updateMatrixWorld(); this.mesh.updateMatrixWorld(); this._grabLocal.copy(obj.matrixWorld).invert().multiply(this.mesh.matrixWorld); }
  followGrab(obj) { obj.updateMatrixWorld(); const w = obj.matrixWorld.clone().multiply(this._grabLocal); w.decompose(this.mesh.position, this.mesh.quaternion, new this.T.Vector3()); }
  hitHandle(origin, dir) { if (!this.mesh.visible) return false; this.mesh.updateMatrixWorld(); this.ray.set(origin, dir); return this.ray.intersectObject(this.handle, false).length > 0; }
  nearHandle(worldPoint, radius = 0.1) { if (!this.mesh.visible || !worldPoint) return false; this.mesh.updateMatrixWorld(); return this.handle.getWorldPosition(new this.T.Vector3()).distanceTo(worldPoint) < radius; }
  /** Canvas px to a button id ("scrub:<fraction>" on the timeline), "panel", or null. */
  idAtPx(x, y) {
    for (const r of this.hits) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id === "scrub" ? "scrub:" + Math.max(0, Math.min(1, (x - r.x) / r.w)).toFixed(4) : r.id;
    return "panel";
  }
  /** Map a local point on the panel (metres, origin at the centre, +y up) to a button id, or "panel", or null if off the card. */
  idAtLocal(local) {
    const hm = XRP.M * XRP.H / XRP.W, hw = XRP.M / 2, hh = hm / 2;
    if (Math.abs(local.x) > hw || Math.abs(local.y) > hh) return null;
    return this.idAtPx((local.x / XRP.M + 0.5) * XRP.W, (0.5 - local.y / hm) * XRP.H);
  }
  pick(origin, dir) {
    if (!this.mesh.visible) return null; this.mesh.updateMatrixWorld();
    this.ray.set(origin, dir); const h = this.ray.intersectObject(this.mesh, false)[0];
    if (!h || !h.uv) { this.cursor.visible = false; return null; }
    const p = this.mesh.worldToLocal(h.point.clone()); this.cursor.position.set(p.x, p.y, 0.002); this.cursor.visible = true;
    return this.idAtPx(h.uv.x * XRP.W, (1 - h.uv.y) * XRP.H);
  }
  /** Hand poke: a fingertip near the front face of the panel, after the panel has been moved too. */
  poke(worldPoint, depth = 0.03) {
    if (!this.mesh.visible || !worldPoint) return null; this.mesh.updateMatrixWorld();
    const local = this.mesh.worldToLocal(worldPoint.clone()); if (local.z < -0.02 || local.z > depth) return null;
    return this.idAtLocal(local);
  }
  draw(M, hrModel, now, force = false) {
    const tl = M.timeline; const key = JSON.stringify([M.title, M.kicker, M.cards, M.cardIdx, M.question && M.question.key, M.buttons, M.toggles, M.chips, M.readouts, M.reveal, M.masses, M.pinPrompt, M.calm, tl && Math.round(tl.T * 200), this.hover]);
    if (!force && key === this.key && now - this.last < 200) return; if (!force && key === this.key && !(hrModel && hrModel.live)) return;
    this.key = key; this.last = now;
    const g = this.g, W = XRP.W, H = XRP.H, P = XRL.pad; g.clearRect(0, 0, W, H); this.hits = []; this.boxes = [];
    g.fillStyle = "rgba(10,13,32,0.92)"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, W, H, 40) : g.rect(0, 0, W, H); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 3; g.stroke();
    let y = 24; const limit = XRL.ctlTop - 12;
    if (hrModel) { const hg = this.hr.getContext("2d"); if (hg) drawHR(hg, this.hr.width, this.hr.height, hrModel, 2.1); g.drawImage(this.hr, P, y); this.box("hr", P, y, this.hr.width, this.hr.height); if (M.screen === "hub" && M.pinPrompt) this.hits.push({ id: "hr", x: P, y, w: this.hr.width, h: this.hr.height }); y += this.hr.height + 18; }
    const line = (text, px, col, w = 600) => { if (y + px * 1.3 > limit) return false; g.font = FONT(px, w); g.fillStyle = col; g.fillText(text, P, y + px, W - 2 * P); this.box("text", P, y, Math.min(W - 2 * P, g.measureText(text).width), px * 1.25); y += px * 1.3; return true; };
    // text block: wraps, and stops at the control band with an ellipsis rather than ever drawing over it
    const wrap = (text, px, col, maxLines = 6, w = 550) => { g.font = FONT(px, w); const lines = wrapLines((t) => g.measureText(t).width, text, W - 2 * P);
      for (let i = 0; i < Math.min(lines.length, maxLines); i++) { const last = i === maxLines - 1 && lines.length > maxLines; if (y + px * 1.3 > limit) return false; g.font = FONT(px, w); if (!line(last ? lines[i] + "..." : lines[i], px, col, w)) return false; } return true; };
    if (M.kicker) line(M.kicker, 30, "#A9B0D0");
    if (M.title) line(M.title, 50, "#FFFFFF", 700);
    const card = M.cards && M.cards.length ? M.cards[M.cardIdx || 0] : "";
    if (card) { wrap(card, 36, "#F2F4FF"); if (M.cards.length > 1 && y + 70 < limit) { g.fillStyle = "#A9B0D0"; g.font = FONT(30); g.fillText(`Card ${M.cardIdx + 1} of ${M.cards.length}`, P, y + 40); this.box("text", P, y + 8, 260, 40); if (M.cardIdx < M.cards.length - 1) this.btn("card+", "Next card", W - P - 280, y, 280, 62, false); else this.btn("card-", "Previous card", W - P - 280, y, 280, 62, false); y += 76; } }
    if (M.question) { y += 6; if (M.question.head) line(M.question.head, 30, "#FFD27F", 700); wrap(M.question.text, 38, "#C9BDFF"); y += 6; this.choices(M.question, y, limit); y = this.cy; }
    if (M.masses) { let x = P; for (const m of M.masses) { this.btn(m.act || "mass:" + m.id, m.short || m.label, x, y, 176, 76, m.on); x += 186; } y += 92; }
    for (const r of M.reveal || []) { wrap(`You predicted: ${r.picked}`, 32, "#C9BDFF", 2); wrap(`The model: ${r.model}${r.extra ? ". " + r.extra : ""}`, 32, "#AACDFF", 3); }
    if (M.pinPrompt) wrap(M.pinPrompt, 32, "#C9BDFF", 3);
    if (M.readouts && M.readouts.length) { g.font = FONT(32, 600); let x = P; const rh = 46; for (const [k, v] of M.readouts) { const t = `${k}: ${v}`; const tw = Math.min(W - 2 * P, g.measureText(t).width + 24); if (x + tw > W - P) { x = P; y += rh + 8; } if (y + rh > limit) break; g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x, y, tw, rh); g.fillStyle = "#E6E9F8"; g.fillText(t, x + 12, y + 33, tw - 24); this.box("readout", x, y, tw, rh); x += tw + 10; } y += rh + 14; }
    for (const ch of M.chips || []) if (!wrap(ch, 30, "#C3C9E6", 3)) break;
    if (M.credit) wrap(M.credit, 26, "#8E95B8", 2);
    // the control band, always at the bottom and never shared with content: timeline, toggles, buttons
    if (tl) this.timeline(tl);
    let bx = P; const tgs = (M.toggles || []).concat([{ id: "calm", label: M.calm ? "Calm lines: on" : "Calm lines", on: !!M.calm }]);
    for (const t of tgs) { g.font = FONT(32, 650); const w = Math.max(220, Math.min(420, g.measureText(t.label).width + 60)); if (bx + w > W - P) break; this.btn(t.id, t.label, bx, XRL.togY, w, 72, t.on); bx += w + 12; }
    bx = P; for (const b of M.buttons || []) { g.font = FONT(34, 650); const w = Math.max(170, Math.min(340, g.measureText(b.label).width + 56)); if (bx + w > W - P) break; this.btn(b.id, b.label, bx, XRL.btnY, w, XRL.btnH, !!b.primary, b.disabled); bx += w + 12; }
    this.tex.needsUpdate = true;
  }
  timeline(tl) {
    const g = this.g, P = XRL.pad, W = XRP.W, x = P, w = W - 2 * P, y = XRL.tlY, h = XRL.tlH, n = tl.span;
    g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.roundRect ? g.roundRect(x, y + h / 2 - 10, w, 20, 10) : g.rect(x, y + h / 2 - 10, w, 20); g.fill();
    g.fillStyle = tl.locked ? "rgba(170,205,255,0.35)" : "rgba(127,178,255,0.85)"; const f = Math.max(0, Math.min(1, tl.T / n)); g.fillRect(x, y + h / 2 - 10, w * f, 20);
    g.fillStyle = "rgba(255,255,255,0.55)"; for (let i = 1; i < n; i++) g.fillRect(x + w * i / n - 1.5, y + h / 2 - 16, 3, 32);
    g.fillStyle = this.hover === "scrub" ? "#FFFFFF" : "#DDE6FF"; g.beginPath(); g.arc(x + w * f, y + h / 2, 22, 0, Math.PI * 2); g.fill();
    this.box("timeline", x, y, w, h); if (!tl.locked) this.hits.push({ id: "scrub", x, y, w, h });
  }
  choices(q, y, limit) {
    const P = XRL.pad, W = XRP.W; let x = P; this.cy = y; const bh = 76;
    if (q.kind === "massMeter") { const steps = [q.min, (q.min * 3 + q.max) / 4, (q.min + q.max) / 2, (q.min + 3 * q.max) / 4, q.max].map((v) => +v.toFixed(2)); for (const v of steps) { this.btn("choice:" + q.i + ":" + v, `${v} Suns`, x, y, 176, bh, false); x += 186; } this.cy = y + bh + 14; return; }
    this.g.font = FONT(34, 650);
    for (const c of q.choices) { const w = Math.max(200, Math.min(W - 2 * P, this.g.measureText(c.label).width + 60)); if (x + w > W - P) { x = P; y += bh + 10; } if (y + bh > limit) break; this.btn(c.act || (q.key === "H-End" ? "end:" : "choice:" + q.i + ":") + c.label, c.label, x, y, w, bh, c.picked); x += w + 12; }
    this.cy = y + bh + 14;
  }
  box(kind, x, y, w, h) { this.boxes.push({ kind, x, y, w, h }); }
  btn(id, label, x, y, w, h, on, disabled) {
    const g = this.g; const hov = this.hover === id;
    g.fillStyle = disabled ? "rgba(255,255,255,0.05)" : on ? "rgba(127,178,255,0.42)" : hov ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)";
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, h / 2) : g.rect(x, y, w, h); g.fill(); if (on || hov) { g.strokeStyle = "rgba(170,205,255,0.9)"; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = disabled ? "#7A809E" : "#FFFFFF"; g.font = FONT(Math.min(36, Math.round(h * 0.45)), 650); g.textAlign = "center"; g.fillText(label, x + w / 2, y + h * 0.64, w - 24); g.textAlign = "left";
    this.box("button", x, y, w, h); if (!disabled) this.hits.push({ id, x, y, w, h });
  }
}

/** Trigger or pinch: grab only when the ray hits the handle, so grabbing never clicks a button. Grip squeeze: grab if the
 *  ray hits the handle or the grip is near it. After a move, pick() still hits the same buttons because it uses the panel's world transform. */
export function panelInputAt(panel, origin, dir, gripPoint, mode = "select") {
  const aim = !!(origin && dir && panel.hitHandle(origin, dir));
  if (mode === "select") {
    if (aim) return { grab: true };
    const id = origin && dir ? panel.pick(origin, dir) : null;
    if (id && id !== "panel" && id !== "handle") return { click: id };
    return { id: id || null };
  }
  if (aim || (gripPoint && panel.nearHandle(gripPoint))) return { grab: true };
  return { id: null };
}

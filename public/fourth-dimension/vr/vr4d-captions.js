// World-locked caption panel for the headset. Same idea as the Night Sky panel:
// one canvas texture, hit rectangles in canvas pixels, the mesh does not follow
// the head unless Recenter is pressed.
// 2048 x 512 canvas on a 1.6 m x 0.4 m quad, 1.5 m ahead, 18° below the eye line.

const W = 2048, H = 512;
const DROP = 18 * Math.PI / 180;
const DIST = 1.5;

function wrap(g, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export class CaptionPanel {
  constructor(THREE) {
    this.THREE = THREE;
    this.canvas = document.createElement("canvas");
    this.canvas.width = W; this.canvas.height = H;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), mat);
    this.mesh.renderOrder = 20;
    this.hits = [];
    this.buttons = [];
  }
  // Canonical seat: content space, eye at eyeY. Recenter passes the head.
  place(eye, yaw = 0) {
    const ahead = DIST * Math.cos(DROP);
    this.mesh.position.set(eye.x + Math.sin(yaw) * ahead, eye.y - Math.sin(DROP) * DIST, eye.z - Math.cos(yaw) * ahead);
    this.mesh.lookAt(eye.x, eye.y, eye.z);
  }
  draw({ text, word, paper, scale, buttons, hover }) {
    const g = this.canvas.getContext("2d");
    const fill = paper ? "#fffdf7" : "rgba(22,30,44,0.88)";
    const ink = paper ? "#18202c" : "#eef3fa";
    const dim = paper ? "#4a5566" : "#a9b6c8";
    const goldText = paper ? "#8a5d00" : "#ffc43c";
    const goldFill = paper ? "#d99a00" : "#ffc43c";
    const border = paper ? "#a39d8c" : "#3c4b62";
    g.clearRect(0, 0, W, H);
    round(g, 16, 8, W - 32, H - 16, 40);
    g.fillStyle = fill; g.fill();
    g.strokeStyle = border; g.lineWidth = 2; g.stroke();
    const px = Math.round(72 * (scale || 1));
    g.font = `600 ${px}px Inter, system-ui, sans-serif`;
    g.textBaseline = "top";
    const words = (text || "").split(/\s+/).filter(Boolean);
    // Lay words left to right so the current word can turn gold.
    const maxW = W - 120;
    let x = 64, y = 48, lineH = Math.round(px * 1.28);
    g.font = `600 ${px}px Inter, system-ui, sans-serif`;
    words.forEach((w, i) => {
      const wide = g.measureText(w + " ").width;
      if (x + wide > 64 + maxW) { x = 64; y += lineH; }
      if (y > 300) return;
      const spoken = word >= 0 && i < word;
      const now = i === word;
      g.fillStyle = now ? goldText : word >= 0 && !spoken ? dim : ink;
      g.fillText(w, x, y);
      x += wide;
    });
    this.hits = [];
    this.buttons = buttons || [];
    const n = this.buttons.length;
    if (n) {
      const gap = 16, bw = Math.min(280, (W - 128 - gap * (n - 1)) / n), bh = 112, by = H - bh - 28;
      this.buttons.forEach((b, i) => {
        const bx = 64 + i * (bw + gap);
        round(g, bx, by, bw, bh, 28);
        const hot = hover === b.id;
        g.fillStyle = hot ? "#3ddc84" : b.gold ? goldFill : (paper ? "#f4f1e8" : "rgba(30,40,58,0.9)");
        g.fill();
        g.strokeStyle = hot ? "#3ddc84" : b.gold ? goldFill : border; g.lineWidth = hot ? 6 : 2; g.stroke();
        g.fillStyle = hot || b.gold ? "#1c1c1c" : ink;
        g.font = "600 56px Inter, system-ui, sans-serif";
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(b.label, bx + bw / 2, by + bh / 2);
        g.textAlign = "left"; g.textBaseline = "top";
        this.hits.push({ id: b.id, x: bx, y: by, w: bw, h: bh });
      });
    }
    this.tex.needsUpdate = true;
  }
  // Ray in world space: { origin, dir } or a three.js Ray ({ origin, direction }).
  // Returns { id, t, point } for the panel quad (id is a button id or "panel"), or null.
  // A hidden panel (flat screen) never takes a hit.
  hitInfo(ray) {
    const T = this.THREE;
    if (!this.mesh.visible || !ray || !ray.origin) return null;
    const d = ray.dir || ray.direction;
    if (!d) return null;
    const n = new T.Vector3(0, 0, 1).transformDirection(this.mesh.matrixWorld);
    const p0 = this.mesh.getWorldPosition(new T.Vector3());
    const denom = n.dot(d);
    if (Math.abs(denom) < 1e-5) return null;
    const t = n.dot(p0.clone().sub(ray.origin)) / denom;
    if (t < 0 || t > 8) return null;
    const world = ray.origin.clone().addScaledVector(d, t);
    const p = this.mesh.worldToLocal(world.clone());
    const u = (p.x / 1.6 + 0.5) * W;
    const v = (0.5 - p.y / 0.4) * H;
    if (u < 0 || v < 0 || u > W || v > H) return null;
    return { id: buttonAt(this.hits, u, v) || "panel", t, point: world };
  }
  hit(ray) {
    const h = this.hitInfo(ray);
    return h ? h.id : null;
  }
}

// Canvas-pixel hit test against the rectangles draw() recorded.
export function buttonAt(hits, u, v) {
  for (const h of hits) if (u >= h.x && u <= h.x + h.w && v >= h.y && v <= h.y + h.h) return h.id;
  return null;
}

function round(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export const PANEL_DIST = DIST;

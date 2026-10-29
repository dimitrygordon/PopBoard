// Atom Builder view: 2D canvas. Electron clouds (Tesla-cleared art) are probability regions:
// electron tokens sit at sampled spots inside them and never travel round a path. Tokens all
// share one draw box, so the electron dot comes out about 1/4 of the proton's width (Leo).
export const ART = ["token-proton", "token-proton-pressed", "token-neutron", "token-neutron-pressed", "token-electron", "token-electron-pressed", "electron-cloud-1s", "electron-cloud-outer", "tray-tile"];
export const CLOUD_RADII = [0.42, 0.7, 0.88, 1.0]; // x R, per cloud (1s first)
export const KINDS = ["proton", "neutron", "electron"];

export function loadArt(base = "atom-builder/art/") {
  const imgs = {};
  return Promise.all(ART.map((n) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = base + n + ".webp"; imgs[n] = i; }))).then(() => imgs);
}

export function createScene(canvas, imgs) {
  const ctx = canvas.getContext("2d");
  let dpr = 1, box = { x: 0, y: 0, w: 300, h: 300 }, pal = {}, tray = null, g = null;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    const c = document.createElement("canvas"), n = Math.round(160 * dpr); c.width = c.height = n;
    if (imgs["tray-tile"].naturalWidth) c.getContext("2d").drawImage(imgs["tray-tile"], 0, 0, n, n);
    tray = ctx.createPattern(c, "repeat"); tray.setTransform?.(new DOMMatrix().scale(1 / dpr));
  }
  // Geometry: atom on top, three trays underneath, room for a caption 12px under each.
  function layout() {
    const { x, y, w, h } = box;
    const capH = 34, trayW = Math.min(150, (w - 24) / 3), S0 = Math.min(64, trayW * 0.42);
    const trayH = Math.round(S0 * 1.35);
    const R = Math.max(60, Math.min(w / 2 - 6, (h - trayH - 12 - 22 - 18 - 12 - capH) / 2));
    const cx = x + w / 2, cy = y + R + 4;
    const S = Math.max(26, Math.min(56, R * 0.22));
    const ty = cy + R + 12 + capH + 10, gap = (w - trayW * 3) / 4;
    const trays = KINDS.map((kind, i) => ({ kind, x: x + gap + i * (trayW + gap), y: ty, w: trayW, h: trayH }));
    return { cx, cy, R, S, S0, trays, artBottom: cy + R, radii: CLOUD_RADII.map((k) => k * R) };
  }
  const sprite = (name, x, y, size, alpha = 1) => { const im = imgs[name]; if (!im?.naturalWidth) return; ctx.globalAlpha = alpha; ctx.drawImage(im, x - size / 2, y - size / 2, size, size); ctx.globalAlpha = 1; };
  function token(kind, x, y, S, pressed, alpha = 1) {
    sprite(`token-${kind}${pressed ? "-pressed" : ""}`, x, y, S, alpha);
    if (kind === "proton") { ctx.globalAlpha = alpha; ctx.fillStyle = pal.charge; ctx.font = `800 ${Math.round(S * 0.42)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+", x, y + 1); ctx.globalAlpha = 1; }
  }
  function draw(st, now) {
    g = layout();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Clouds, outermost first, the 1s disk on top. Only clouds that hold electrons are drawn.
    for (let k = st.shells.length - 1; k >= 0; k--) {
      if (!st.shells[k]) continue;
      const cap = [2, 8, 8, 4][k], a = 0.55 + 0.45 * st.shells[k] / cap;
      sprite(k === 0 ? "electron-cloud-1s" : "electron-cloud-outer", g.cx, g.cy, g.radii[k] * 2, a * pal.cloud);
    }
    // Faint drop zone ring when empty, so students know where to drop.
    if (!st.nucleons.length && !st.electrons.length) {
      ctx.setLineDash([6, 6]); ctx.strokeStyle = pal.dim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.cx, g.cy, g.S * 1.4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const t of st.nucleons) token(t.kind, g.cx + t.x + (t.wx || 0), g.cy + t.y + (t.wy || 0), st.nS || g.S, t.pressed);
    for (const e of st.electrons) token("electron", g.cx + e.x, g.cy + e.y, g.S, e.pressed, e.alpha ?? 1);
    // Trays.
    for (const t of g.trays) {
      ctx.fillStyle = tray; ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 12); ctx.fill();
      ctx.strokeStyle = pal.border; ctx.lineWidth = 1.5; ctx.stroke();
      token(t.kind, t.x + t.w / 2, t.y + t.h / 2, g.S0, false);
    }
    if (st.held) token(st.held.kind, st.held.x, st.held.y, g.S, true);
    return g;
  }
  return { resize, draw, setBox(b) { box = b; g = layout(); }, setPalette(p) { pal = p; }, get geo() { return g || layout(); } };
}

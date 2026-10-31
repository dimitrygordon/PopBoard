// Shared touch hint: a wobbly hand-drawn gold pencil outline (#E2B654) breathes around every object
// students can grab, then fades away after the first interaction on the page. Under reduced motion
// it holds still at a faint opacity.
// A hand-drawn gold pencil circle (two wobbly passes, varied pressure), never a soft glow.
function haloTex(T) {
  if (typeof document === "undefined") return new T.Texture(); // node tests
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.strokeStyle = "#E2B654"; g.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    const ph = Math.random() * 6.28, r0 = 104 - pass * 3, start = Math.random() * 6.28;
    g.lineWidth = pass ? 3.5 : 6; g.globalAlpha = pass ? 0.7 : 0.95; g.beginPath();
    // the stroke overshoots its start a little, like a circle drawn by hand
    for (let k = 0; k <= 76; k++) { const a = start + k / 72 * Math.PI * 2, r = r0 + Math.sin(a * 3 + ph) * 3 + Math.sin(a * 7 + ph * 2) * 1.5; const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
export const STATIC_OPACITY = 0.35;
export function touchHints(T, { still = false } = {}) {
  const hints = []; let touched = false, tex = null;
  return {
    hints,
    // obj: the grabbable Object3D. r: its radius in world units. at: offset inside obj (default centre).
    add(obj, { r = 0.6, at = null } = {}) {
      tex = tex || haloTex(T);
      const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: still ? STATIC_OPACITY : 0.55 });
      const sp = new T.Sprite(m); sp.scale.setScalar(r * 2.5); sp.renderOrder = -2; sp.userData.touchHint = true;
      if (at) sp.position.set(...(Array.isArray(at) ? at : [at.x, at.y, at.z]));
      obj.add(sp); hints.push(sp); return sp;
    },
    update(t, dt) {
      for (const sp of hints) {
        const m = sp.material;
        if (touched) m.opacity = still ? 0 : Math.max(0, m.opacity - (dt || 0.016) * 2);
        else m.opacity = still ? STATIC_OPACITY : 0.55 + 0.45 * Math.sin(t * 2.4);
        sp.visible = m.opacity > 0.001;
      }
    },
    interact() { touched = true; },
    get touched() { return touched; },
  };
}

// Shared touch hint: a soft gold halo (#E2B654, createRadialGradient) breathes around every object
// students can grab, then fades away after the first interaction on the page. Under reduced motion
// it is a static faint ring instead of a breathing glow.
function haloTex(T, ring) {
  if (typeof document === "undefined") return new T.Texture(); // node tests
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, ring ? 40 : 18, 64, 64, 64);
  if (ring) { r.addColorStop(0, "rgba(226,182,84,0)"); r.addColorStop(0.55, "rgba(226,182,84,0.7)"); r.addColorStop(1, "rgba(226,182,84,0)"); }
  else { r.addColorStop(0, "rgba(226,182,84,0.55)"); r.addColorStop(1, "rgba(226,182,84,0)"); }
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
export const STATIC_OPACITY = 0.35;
export function touchHints(T, { still = false } = {}) {
  const hints = []; let touched = false, tex = null;
  return {
    hints,
    // obj: the grabbable Object3D. r: its radius in world units. at: offset inside obj (default centre).
    add(obj, { r = 0.6, at = null } = {}) {
      tex = tex || haloTex(T, still);
      const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: still ? STATIC_OPACITY : 0.55 });
      const sp = new T.Sprite(m); sp.scale.setScalar(r * 3.2); sp.renderOrder = -2; sp.userData.touchHint = true;
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

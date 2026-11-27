// Fixed-angular-size text label sprite (canvas texture, no size attenuation). Shared by the trails and the scene.
export function textSprite(THREE, text, { color = "#fff", bg = "rgba(14,16,40,0.85)", w = 640, h = 120, font = 58 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, sizeAttenuation: false });
  const sp = new THREE.Sprite(m); sp.renderOrder = 12; sp.center.set(0.5, 0);
  sp.userData.set = (t, fg = color) => { const g = c.getContext("2d"); g.clearRect(0, 0, w, h); g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 36); g.fill(); g.strokeStyle = "rgba(170,205,255,0.45)"; g.lineWidth = 3; g.stroke(); g.fillStyle = fg; g.font = `600 ${font}px Inter, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, w / 2, h / 2 + 3, w - 40); tex.needsUpdate = true; };
  sp.userData.set(text); return sp;
}

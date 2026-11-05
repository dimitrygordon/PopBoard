// Shared DOM pieces for energy3d scenes: panel, predict (locks the test), explain reveal, jars, packets.
export const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
export const fill = (s, o) => String(s ?? "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

// Controls go in the page's Test it box (host.e3dPanel, set by the wrapper) so they never cover the 3D stage.
// Without one they float over the stage. Text is at least 16px.
export function panel(host, dark) {
  const ui = el("div", "e3d-ui");
  ui.style.cssText = "font-size:16px;line-height:1.4;display:flex;flex-direction:column;gap:6px;align-items:flex-start";
  if (host.e3dPanel) { host.e3dPanel.appendChild(ui); return ui; }
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  ui.style.cssText += ";position:absolute;left:12px;top:12px;max-width:330px;max-height:calc(100% - 24px);overflow:auto;padding:10px;border-radius:10px;background:" + (dark ? "rgba(31,29,26,.88)" : "rgba(251,246,234,.92)") + ";color:" + (dark ? "#EDE6D6" : "#2B2622");
  host.appendChild(ui); return ui;
}

// Predict radios; returns { box, picked(), onPick(fn) }. name must be unique per scene.
export function predict(ui, name, legend, choices) {
  const q = el("fieldset"); q.style.cssText = "border:1px solid currentColor;border-radius:8px;padding:4px 8px;margin:0;font:inherit"; q.append(el("legend", null, legend));
  (choices || []).forEach((c, i) => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = name; r.value = i; l.append(r, " " + c); q.append(l, el("br")); });
  ui.appendChild(q);
  return { box: q, picked: () => { const v = q.querySelector("input:checked"); return v ? +v.value : null; }, onPick: (fn) => q.addEventListener("change", fn) };
}

export function explain(ui, label, body) {
  const b = el("button", null, label); b.hidden = true; const p = el("p", null, body); p.hidden = true;
  b.addEventListener("click", () => { p.hidden = false; }); ui.append(b, p);
  return { show: () => { b.hidden = false; } };
}

// 3D jar: open glass tube with a toon fill; set(f) with f in 0..1.
export function jar(THREE, scene, toon, x, z, color, ink) {
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 24, 1, true), new THREE.MeshToonMaterial({ color: ink, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  glass.position.set(x, 0.8, z); scene.add(glass);
  const f = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 24)), color); f.position.set(x, 0, z); scene.add(f);
  const set = (v) => { const h = Math.max(0.001, Math.min(1, v)) * 1.55; f.scale.y = h; f.position.y = h / 2 + 0.02; };
  set(0); return { set, top: () => new THREE.Vector3(x, 1.7, z), mesh: f };
}

// Glowing packets that fly from a to b with an arc.
export function packets(THREE, scene) {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c), list = [];
  return {
    send(a, b, color, speed = 1.5) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.25); s.position.copy(a); scene.add(s); list.push({ s, a: a.clone(), b: b.clone(), k: 0, speed }); },
    step(dt) { for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.k = Math.min(1, p.k + dt * p.speed); p.s.position.lerpVectors(p.a, p.b, p.k); p.s.position.y += Math.sin(Math.PI * p.k) * 0.5; if (p.k >= 1) { scene.remove(p.s); p.s.material.dispose(); list.splice(i, 1); } } },
  };
}

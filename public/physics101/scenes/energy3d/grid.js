// Power station to lamp (Every Joule Sim 8). 3D toon chain on core.js; words from opts.text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { SOURCES, gridChain, sourceInputFor, relativeI2R } from "./physics.js";

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const SRC_COLOR = { gas: "chemical", coal: "chemical", nuclear: "nuclear", hydro: "kinetic", wind: "kinetic", solar: "light" };
const NUCLEAR = { light: "#C9971C", dark: "#E6B84A" }; // spec 0.3 nuclear gold

export function mountGrid(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 6, 11], target: [0, 0.8, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const col = (k) => (k === "nuclear" ? NUCLEAR : palette[k])[M];
  const box = (w, h, d, c, x, y = h / 2) => { const m = toon(new THREE.Mesh(new THREE.BoxGeometry(w, h, d)), c); m.position.set(x, y, 0); scene.add(m); return m; };

  // chain: source, conversion, generator, step-up, pylons, step-down, home
  const X = { src: -6, conv: -4.2, gen: -2.6, up: -1.1, line: 1.2, down: 3.4, home: 5.3 };
  const srcMesh = box(1, 1, 1, col("chemical"), X.src);
  box(1.1, 1.3, 1, dark ? "#6F665A" : "#B8A78A", X.conv);
  box(0.9, 0.9, 0.9, col("electrical"), X.gen);
  box(0.6, 1.2, 0.6, "#8A8378", X.up);
  for (const x of [-0.2, 1.2, 2.6]) { const p = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 2.4, 6)), "#7C7466"); p.position.set(x, 1.2, 0); scene.add(p); }
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.6, 6), new THREE.MeshBasicMaterial({ color: dark ? "#EDE6D6" : "#2B2622" }));
  wire.rotation.z = Math.PI / 2; wire.position.set(1.2, 2.3, 0); scene.add(wire);
  box(0.5, 0.9, 0.5, "#8A8378", X.down);
  box(1.2, 1, 1, dark ? "#C9B48E" : "#E8D6B0", X.home);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), new THREE.MeshBasicMaterial({ color: col("light") })); lamp.position.set(X.home, 1.2, 0.55); scene.add(lamp);

  // packets
  const glow = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const packets = [];
  const STOPS = { plant: X.gen, rotor: X.conv, generator: X.gen, module: X.gen, grid: X.down };
  function spawn() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col(SRC_COLOR[src]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(0.3); s.position.set(X.src, 1.3, 0); scene.add(s);
    // each packet decides once, per stage, whether it peels off: survival odds = stage efficiency, so each loss is drawn once
    const ch = gridChain(src); let fate = null;
    for (const st of ch.stages) { const p = st.name === "grid" ? st.eff : st.eff; if (Math.random() > p) { fate = st.name; break; } }
    packets.push({ s, x: X.src, fate, peel: 0 });
  }

  // UI
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  const ui = el("div", "e3d-ui"); ui.style.cssText = "position:absolute;left:12px;top:12px;max-width:320px;font:14px/1.35 system-ui;padding:10px;border-radius:10px;background:" + (dark ? "rgba(31,29,26,.85)" : "rgba(251,246,234,.9)") + ";color:" + (dark ? "#EDE6D6" : "#2B2622");
  host.appendChild(ui);
  let src = "gas", running = false, V = 400, phase = "predict";
  const sel = el("select"); sel.setAttribute("aria-label", T("sourceLabel", "Source"));
  for (const k of Object.keys(SOURCES)) { const o = el("option", null, T("src_" + k, k)); o.value = k; sel.appendChild(o); }
  ui.append(el("label", null, T("sourceLabel", "Source") + " "), sel);
  const badge = el("strong", "e3d-badge"); badge.style.cssText = "display:block;color:" + col("thermal"); ui.appendChild(badge);
  const info = el("div"); ui.appendChild(info);
  const dial = el("input"); dial.type = "range"; dial.min = 11; dial.max = 400; dial.value = V; dial.setAttribute("aria-label", T("voltLabel"));
  const dialOut = el("div");
  ui.append(el("label", null, T("voltLabel")), dial, dialOut);
  const q = el("fieldset"); q.append(el("legend", null, T("predict")));
  for (const k of Object.keys(SOURCES)) { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "e3d-grid"; r.value = k; l.append(r, " " + T("src_" + k, k)); q.append(l, " "); }
  ui.appendChild(q);
  const run = el("button", null, T("run", "Run")); run.disabled = true; ui.appendChild(run);
  const exBtn = el("button", null, T("explainBtn", "Explain")); exBtn.hidden = true; ui.appendChild(exBtn);
  const ex = el("p", null, T("explain")); ex.hidden = true; ui.appendChild(ex);
  const fb = el("p"); ui.appendChild(fb);
  ui.appendChild(el("p", "e3d-note", T("scenario")));

  function readout() {
    const ch = gridChain(src);
    badge.textContent = ch.badge ? T("badge_" + ch.badge) : "";
    info.textContent = T("readout").replace("{overall}", ch.overall.toFixed(4)).replace("{input}", sourceInputFor(src).toFixed(2));
    srcMesh.material.color.set(col(SRC_COLOR[src]));
    const rel = relativeI2R(V, 400);
    dialOut.textContent = T("voltOut").replace("{kv}", V).replace("{rel}", rel < 10 ? rel.toFixed(1) : Math.round(rel));
    wire.material.color.set(rel > 1.5 ? col("thermal") : dark ? "#EDE6D6" : "#2B2622");
  }
  sel.addEventListener("change", () => { src = sel.value; readout(); });
  dial.addEventListener("input", () => { V = +dial.value; readout(); });
  q.addEventListener("change", () => { run.disabled = false; phase = "test"; });
  run.addEventListener("click", () => {
    if (phase === "predict") return;
    running = !running; run.textContent = running ? T("stop", "Stop") : T("run", "Run");
    const pick = q.querySelector("input:checked")?.value;
    fb.textContent = pick === "hydro" ? T("right") : T("wrong"); exBtn.hidden = false;
  });
  exBtn.addEventListener("click", () => { ex.hidden = false; });
  readout();

  let acc = 0;
  onFrame((dt) => {
    if (running) { acc += dt; if (acc > (S.reduce ? 0.6 : 0.12)) { acc = 0; spawn(); } }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      if (p.peel) { p.peel += dt; p.s.position.y += dt * 1.2; p.s.position.z += dt * 0.8; p.s.material.opacity = Math.max(0, 1 - p.peel); if (p.peel >= 1) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); } continue; }
      p.x += dt * 3; p.s.position.x = p.x; p.s.position.y = p.x > X.up && p.x < X.down ? 2.3 : 1.3;
      if (p.x > X.gen) p.s.material.color.set(col("electrical"));
      if (p.fate && p.x >= STOPS[p.fate]) { p.peel = 0.001; p.s.material.color.set(col("thermal")); }
      else if (p.x >= X.home) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); lamp.scale.setScalar(1.4); }
    }
    lamp.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
  });
  return { ...S, setSource(k) { sel.value = k; sel.dispatchEvent(new Event("change")); }, dispose() { ui.remove(); S.dispose(); } };
}

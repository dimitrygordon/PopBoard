// Why a bouncing ball stops (Every Joule Sim 4). 3D scene on core.js; all student words come from opts.text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { BALLS, g, ballState, energyAt, lossPerBounce } from "./physics.js";

const SCALE = 1.6; // scene units per metre
const MAXH = 2.6;

function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

export function mountBounce(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [2, 2.5, 6], target: [0, 1.6, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), col = (k) => palette[k][dark ? "dark" : "light"];
  const ink = dark ? "#EDE6D6" : "#2B2622";

  // ruled height stand (decorative, not draggable)
  const stand = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, MAXH * SCALE, 0.08));
  toon(post, dark ? "#5A5246" : "#C9B48E"); post.position.set(-0.8, (MAXH * SCALE) / 2, 0); stand.add(post);
  for (let i = 0; i <= MAXH * 10; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(i % 5 ? 0.12 : 0.25, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: ink }));
    tick.position.set(-0.8 + 0.08, (i / 10) * SCALE, 0.05); stand.add(tick);
  }
  scene.add(stand);

  // ball (enlarged so it stays a 44 px target) and an invisible hit shell
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20));
  let kind = "tennis", h0 = BALLS.tennis.drop, running = false, t = 0, lastB = 0, phase = "predict";
  const ballColor = { tennis: "#D7E24A", basketball: "#E0782F", tableTennis: "#F7F3EA" };
  toon(ball, ballColor[kind]);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  ball.add(hit); scene.add(ball);
  const place = (h) => { ball.position.set(0, 0.22 + h * SCALE, 0); };
  place(h0);
  addDrag(ball, { axis: "y", min: 0.22 + 0.1 * SCALE, max: 0.22 + MAXH * SCALE, onMove: (y) => { if (running) return; h0 = (y - 0.22) / SCALE; readout(); } });

  // energy jars (3D, right side): GPE, KE, thermal + sound
  const jars = {}, JX = { gpe: 1.6, ke: 2.3, th: 3.0 };
  for (const [k, c] of [["gpe", col("gravitational")], ["ke", col("kinetic")], ["th", col("thermal")]]) {
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 24, 1, true), new THREE.MeshToonMaterial({ color: ink, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    glass.position.set(JX[k], 0.8, 0); scene.add(glass);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 24)); toon(fill, c);
    fill.position.set(JX[k], 0, 0); fill.scale.y = 0.001; scene.add(fill);
    jars[k] = fill;
  }
  const setJar = (k, f) => { const h = Math.max(0.001, Math.min(1, f)) * 1.55; jars[k].scale.y = h; jars[k].position.y = h / 2 + 0.02; };
  // sound: thin pink arrow, tagged estimate, no percentage (Tesla C5)
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0.4, 0), new THREE.Vector3(0.3, 0.1, 0), 0.9, col("sound"), 0.18, 0.1);
  arrow.visible = false; scene.add(arrow);

  // glowing packets
  const glow = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const packets = [];
  function packet(from, to, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(0.25); s.position.copy(from); scene.add(s);
    packets.push({ s, from: from.clone(), to: to.clone(), k: 0 });
  }

  // DOM overlay: picker, predict, Drop, explain
  const ui = el("div", "e3d-ui"); ui.style.cssText = "position:absolute;left:12px;top:12px;max-width:300px;font:14px/1.35 system-ui;padding:10px;border-radius:10px;background:" + (dark ? "rgba(31,29,26,.85)" : "rgba(251,246,234,.9)") + ";color:" + ink;
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.appendChild(ui);
  const pick = el("select"); pick.setAttribute("aria-label", T("pickLabel", "Ball"));
  for (const k of Object.keys(BALLS)) { const o = el("option", null, T("ball_" + k, k)); o.value = k; pick.appendChild(o); }
  ui.append(el("label", null, T("pickLabel", "Ball") + " "), pick);
  const info = el("div", "e3d-info"); ui.appendChild(info);
  const q = el("fieldset"); q.append(el("legend", null, T("predict")));
  const choices = text.choices || ["increase", "stay", "decrease"];
  choices.forEach((c, i) => { const l = el("label"); const r = el("input"); r.type = "radio"; r.name = "e3d-pred"; r.value = i; l.append(r, " " + c); q.append(l, el("br")); });
  ui.appendChild(q);
  const drop = el("button", null, T("drop", "Drop")); drop.disabled = true; ui.appendChild(drop);
  const explainBtn = el("button", null, T("explainBtn", "Explain")); explainBtn.hidden = true; ui.appendChild(explainBtn);
  const explain = el("p"); explain.hidden = true; explain.textContent = T("explain"); ui.appendChild(explain);
  const fb = el("p"); ui.appendChild(fb);
  q.addEventListener("change", () => { drop.disabled = false; phase = "test"; });
  pick.addEventListener("change", () => { if (running) return; kind = pick.value; h0 = Math.min(BALLS[kind].drop, MAXH); ball.children.filter((c) => c.userData.ink).forEach((c) => ball.remove(c)); toon(ball, ballColor[kind]); place(h0); readout(); });
  explainBtn.addEventListener("click", () => { explain.hidden = false; });
  drop.addEventListener("click", () => {
    if (phase === "predict") return;
    running = true; t = 0; lastB = 0; drop.disabled = true; pick.disabled = true;
    const sel = q.querySelector("input:checked"), right = sel && +sel.value === (text.correct ?? 2);
    fb.textContent = right ? T("right") : T("wrong");
    explainBtn.hidden = false;
  });
  function readout() {
    const b = BALLS[kind];
    info.textContent = (T("readout", "{m} kg, h = {h} m, e = {e}")).replace("{m}", b.m).replace("{h}", h0.toFixed(2)).replace("{e}", b.e) + " " + T("preset", "");
    setJar("gpe", h0 / MAXH); setJar("ke", 0); setJar("th", 0); arrow.visible = false;
  }
  readout();

  const ballPos = new THREE.Vector3(), jarTop = (k) => new THREE.Vector3(JX[k], 1.7, 0);
  onFrame((dt) => {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.k += dt * 1.5;
      p.s.position.lerpVectors(p.from, p.to, Math.min(p.k, 1)); p.s.position.y += Math.sin(Math.PI * Math.min(p.k, 1)) * 0.5;
      if (p.k >= 1) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); }
    }
    if (!running) return;
    t += S.reduce ? dt * 2 : dt;
    const b = BALLS[kind], st = ballState(h0, b.e, t);
    place(st.y);
    const E0 = energyAt(b.m, h0, 0).total, E = energyAt(b.m, st.y, st.v);
    setJar("gpe", (E.gpe / E0) * (h0 / MAXH)); setJar("ke", (E.ke / E0) * (h0 / MAXH)); setJar("th", (1 - (E.total / E0)) * (h0 / MAXH));
    ballPos.copy(ball.position);
    if (!S.reduce && Math.random() < 0.15) packet(ballPos, jarTop(st.v > 0.5 && E.ke > E.gpe ? "ke" : "gpe"), col(E.ke > E.gpe ? "kinetic" : "gravitational"));
    if (st.bounces > lastB) {
      const hPrev = lastB === 0 ? h0 : h0 * b.e ** (2 * lastB);
      lastB = st.bounces; arrow.visible = true;
      fb.textContent = T("impact", "").replace("{loss}", (lossPerBounce(b.m, hPrev, b.e) * 1000).toFixed(1));
      for (let i = 0; i < (S.reduce ? 1 : 4); i++) packet(ballPos, jarTop("th"), col("thermal"));
    }
    if (st.rest) { running = false; drop.disabled = false; pick.disabled = false; }
  });

  return { ...S, setBall(k) { pick.value = k; pick.dispatchEvent(new Event("change")); }, dispose() { ui.remove(); S.dispose(); } };
}
export { g };

// Every Joule Sim 2: curvy track, friction off vs on (Tesla C1, C2). No friction coefficient is shown. Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { speedAt, energyAt, FRICTION_DRAW } from "./physics.js";
import { after, panel, predict, explain, jar, meterScale, packets, el, fill, jasper, labels3d, inspector } from "./ui.js";

const SC = 1.2, HALF = 3; // track y = k x^2 in scene units
export function mountTrack(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 38, camera: [0, 4.4, 10.5], target: [0, 0.9, 0], portrait: { fov: 32, camera: [0, 4.6, 8.6], target: [0, 0.65, 0.6] }, ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const k = 0.3, yOf = (x) => k * x * x; // metres of height = y / SC
  const steel = "#69767A", tieC = "#B58B60", V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  // twin-rail track along y = f(x) at depth z, with ties and posts (Leo's track sheet)
  const rails = (f, x0, x1, z) => {
    const g = new THREE.Group(); scene.add(g); let first;
    for (const dz of [-0.16, 0.16]) { const pts = []; for (let i = 0; i <= 60; i++) { const x = x0 + (i / 60) * (x1 - x0); pts.push(V(x, f(x) + 0.05, z + dz)); }
      const r = toon(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.025, 6)), steel); g.add(r); first = first || r; }
    for (let x = x0; x <= x1; x += 0.18) { const t = toon(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.42)), tieC); t.position.set(x, f(x) + 0.02, z); t.rotation.z = Math.atan(( f(x + 0.01) - f(x)) / 0.01); g.add(t); }
    for (let x = x0 + 0.1; x <= x1; x += 0.6) { const h = f(x) + 0.02; if (h < 0.1) continue; for (const dz of [-0.16, 0.16]) { const p = toon(new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05)), "#8C6A48"); p.position.set(x, h / 2, z + dz); g.add(p); } }
    return first;
  };
  const cart = (x, y, z) => {
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g); const red = "#C9574F";
    const add = (geo, c, px, py, pz) => { const m = toon(new THREE.Mesh(geo), c); m.position.set(px, py, pz); g.add(m); return m; };
    add(new THREE.BoxGeometry(0.28, 0.03, 0.24), red, 0, 0.1, 0);
    for (const [w, d, px, pz] of [[0.28, 0.02, 0, 0.11], [0.28, 0.02, 0, -0.11], [0.02, 0.24, 0.13, 0], [0.02, 0.24, -0.13, 0]]) add(new THREE.BoxGeometry(w, 0.16, d), red, px, 0.18, pz);
    for (const [px, pz] of [[-0.09, -0.15], [0.09, -0.15], [-0.09, 0.15], [0.09, 0.15]]) { const wh = add(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 14), "#3F3A35", px, 0.055, pz); wh.rotation.x = Math.PI / 2; }
    return g;
  };
  const yMaxC = yOf(HALF);
  // back row: straight drop, middle row: gentle ramp, front row: curvy track
  const dropF = (x) => Math.max(0, 1.8 * SC * (1 - (x + 6.2) / 1.2)), rampF = (x) => Math.max(0, SC * (1 - (x + 4.8) / 1.6));
  lbl(rails(dropF, -6.2, -5.0, 0), T("lbl_drop", "straight drop"), "above-left", V(-6.0, 1.9, 0));
  lbl(rails(rampF, -4.8, -3.2, 0), T("lbl_ramp", "gentle ramp"), "above", V(-4.0, 0.6, 0));
  const curvy = rails(yOf, -HALF, HALF, 0); lbl(curvy, T("lbl_curvy", "curvy track"), "below", V(1.2, yOf(1.2), 0));
  const dropCart = cart(-6.05, dropF(-6.05) + 0.05, 0); dropCart.rotation.z = -Math.atan(1.8 * SC / 1.2);
  const rampCart = cart(-4.6, rampF(-4.6) + 0.05, 0); rampCart.rotation.z = -Math.atan(SC / 1.6);
  lbl(rampCart.children[0], T("lbl_carts", "three carts"), "below-left", V(0, 0.15, 0));
  // phones (round 1 item 5): true stacking. Drop and ramp share a top row raised above the curvy track.
  const small = (host.clientWidth || innerWidth) < 600;
  if (small) {
    const groups = scene.children.filter((g) => g.isGroup);
    const dropG = groups.find((g) => g.children.some((c) => c.position.x <= -5.0 && c.position.x >= -6.3 && c.geometry?.type === "BoxGeometry"));
    const rampG = groups.find((g) => g !== dropG && g.children.some((c) => c.position.x <= -3.2 && c.position.x >= -4.8 && c.geometry?.type === "BoxGeometry"));
    const move = (objs, dx, dy) => objs.forEach((o) => { if (o) { o.position.x += dx; o.position.y += dy; } });
    move([dropG, dropCart], 4.4, 4.6); move([rampG, rampCart], 5.0, 4.6);
    for (const m of [dropG, rampG]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(m === dropG ? 1.5 : 1.9, 0.05, 0.6), toon(new THREE.Mesh(), "#D9CBB0").material); sh.position.set(m === dropG ? -1.2 : 0.8, 4.58, 0); scene.add(sh); }
  }
  const ball = cart(0, 0, 0);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ visible: false })));
  // zero-height line with end tabs
  const zero = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 1.5, 0.018, 0.018), new THREE.MeshBasicMaterial({ color: palette.gravitational[M] })); zero.position.set(0, 0.06, 0.45); scene.add(zero);
  for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: palette.gravitational[M] })); t.position.set(-1.6 + sx * (HALF + 1.8), 0.13, 0.45); scene.add(t); }
  lbl(zero, T("lbl_zero", "zero height"), "below-left", V(-HALF, 0, 0));
  // finish flag marks the release height on the far side
  const mark = new THREE.Group(); scene.add(mark);
  { const pole = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 8)), "#5E574D"); pole.position.y = 0.325; mark.add(pole);
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 44; const c = cv.getContext("2d"); for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) { c.fillStyle = (i + j) % 2 ? "#2B2622" : "#FFFDF5"; c.fillRect(i * 8, j * 9, 8, 9); }
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); flag.position.set(0.17, 0.53, 0); mark.add(flag);
    lbl(flag, T("lbl_flag", "finish flag"), "above"); }
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.28), new THREE.MeshBasicMaterial({ color: "#FFFDF5", side: THREE.DoubleSide })); tab.position.set(0, 0.45, 0); ball.add(tab);
  lbl(tab, T("lbl_release", "release"), "above-left");
  let J, scaleEnd = null; const P = packets(THREE, scene);
  if (small) { // stacked mechanical bar (round 1): one fixed-length HUD bar split into gravitational, kinetic, thermal
    const fbar = document.createElement("div"); fbar.className = "e3d-hud e3d-fixedbar";
    fbar.style.cssText = `position:absolute;left:8px;right:108px;bottom:8px;min-height:64px;box-sizing:border-box;padding:3px 8px;z-index:2;border:1.5px solid ${ink};border-radius:10px;background:${dark ? "rgba(31,29,26,.94)" : "rgba(251,246,234,.95)"};color:${ink};font:16px/1.1 'Patrick Hand','Gochi Hand',cursive`;
    const hd = document.createElement("div"); hd.textContent = T("lbl_mech", "total energy, fixed length"); fbar.appendChild(hd);
    const tr = document.createElement("div"); tr.style.cssText = `display:flex;height:22px;margin-top:3px;border:1.5px solid ${ink};border-radius:5px;overflow:hidden`; fbar.appendChild(tr);
    const seg = (c, nm) => { const d = document.createElement("div"); d.style.cssText = `height:100%;background:${c};display:flex;align-items:center;justify-content:center;font-size:16px;color:#2B2622;white-space:nowrap;overflow:hidden`; d.textContent = nm; tr.appendChild(d); return { set: (f) => { d.style.width = (Math.max(0, f) / 0.9 * 100).toFixed(2) + "%"; }, glass: { userData: {} } }; };
    J = { gpe: seg(palette.gravitational[M], T("jar_gpe", "gravitational")), ke: seg(palette.kinetic[M], T("jar_ke", "kinetic")), th: seg(palette.thermal[M], T("jar_th", "thermal")) };
    const sc = document.createElement("div"); sc.style.cssText = "display:flex;justify-content:space-between;font-size:16px"; sc.innerHTML = "<span>0 J/kg</span><span></span>"; scaleEnd = sc.lastChild; fbar.appendChild(sc);
    host.appendChild(fbar);
  } else {
    J = { gpe: jar(THREE, scene, toon, 4.6, -0.4, palette.gravitational[M], ink), ke: jar(THREE, scene, toon, 5.3, -0.4, palette.kinetic[M], ink), th: jar(THREE, scene, toon, 6.0, -0.4, palette.thermal[M], ink) };
  for (const [k, d] of [["gpe", "gravitational"], ["ke", "kinetic"], ["th", "thermal"]]) { J[k].glass.userData.label = T("jar_" + k, d); J[k].glass.userData.labelPos = "above"; }
  }
  let x0 = -2.4, friction = false, running = false, t = 0;
  const yMax = yMaxC;
  const putAt = (x) => { ball.position.set(x, yOf(x) + 0.05, 0); ball.rotation.z = Math.atan(2 * k * x); };
  putAt(x0); mark.position.set(-x0 + 0.1, yOf(x0) + 0.05, 0.3);
  addDrag(ball, { axis: "y", min: 0.6, max: yMax, onMove: (y) => { if (running) return; x0 = -Math.sqrt(Math.max(0, (y - 0.05) / k)); putAt(x0); mark.position.set(-x0 + 0.1, yOf(x0) + 0.05, 0.3); readout(0); } });

  const ui = panel(host, dark, T("takeaway"), T("question", "With friction off, will the first return be below, equal to, or above the release height?"));
  inspector(host, ["KE_trans = 1/2 m v^2", "GPE = mgh, g = 9.8 N/kg", "ME = KE + PE", "zero height: blue line", "Model: frictionless cart, wheels light (no rotational KE)"], ["With friction off, first return equals release at display precision"]);
  jasper(host, "track", T("jasperCard"));
  ui.append(el("div", null, T("formulas")), el("div", null, T("cartModel", "Cart model: wheel rotation is ignored, so all motion energy is the cart's kinetic energy.")));
  const fr = el("button", null, T("frictionOff")); fr.setAttribute("aria-pressed", "false"); ui.appendChild(fr);
  const read = after(el("div")); ui.appendChild(read); // round 2: the ME result waits for both predictions and a release
  const pOff = predict(ui, "e3d-track-off", T("predictOff"), text.choices);
  const pOn = predict(ui, "e3d-track-on", T("predictOn"), text.choices);
  const go = el("button", null, T("release", "Release")); go.disabled = true; ui.appendChild(go);
  const prove = el("button", null, "Prove: freeze first return"); prove.hidden = true; ui.appendChild(prove);
  const proof = el("div", "e3d-proof"); proof.hidden = true; ui.appendChild(proof);
  const proofStage = el("div", "e3d-hud e3d-proof-stage"); proofStage.hidden = true; proofStage.setAttribute("aria-live", "polite"); proofStage.style.cssText = `position:absolute;left:50%;top:6px;transform:translateX(-50%);max-width:310px;width:calc(100% - 24px);padding:4px 8px;box-sizing:border-box;border:1.5px solid currentColor;border-radius:8px;font-size:16px;background:${dark ? "#1F1D1A" : "#FBF6EA"};color:${ink};z-index:3`; host.append(proofStage);
  const returns = {};
  const freezeReturn = () => {
    const damp = friction ? FRICTION_DRAW : 1, lost = 1 - damp * damp;
    running = false; putAt(-x0 * damp); readout(lost); fr.disabled = false; ready();
    const start = h0(), end = (ball.position.y - 0.05) / SC;
    returns[friction ? "on" : "off"] = `friction ${friction ? "on" : "off"}: release ${start.toFixed(3)} m, first return ${end.toFixed(3)} m, thermal ${(9.8 * start * lost).toFixed(3)} J/kg`;
    proof.hidden = false; proof.textContent = Object.values(returns).join(" | "); proofStage.hidden = false; proofStage.textContent = proof.textContent;
  };
  prove.addEventListener("click", freezeReturn);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  const ready = () => { go.disabled = pOn.picked() == null || pOff.picked() == null; }; // both predictions first
  pOff.onPick(ready); pOn.onPick(ready);
  fr.addEventListener("click", () => { if (running) return; friction = !friction; fr.textContent = friction ? T("frictionOn") : T("frictionOff"); fr.setAttribute("aria-pressed", String(friction)); ready(); });
  const h0 = () => yOf(x0) / SC;
  function readout(lost) {
    const h = (ball.position.y - 0.05) / SC, v = speedAt(h0(), h) * Math.sqrt(1 - lost), m = 1;
    const E = energyAt(m, h, v), E0 = energyAt(m, h0(), 0).total; if (scaleEnd) scaleEnd.textContent = (E0 / 0.9 * 0.9).toFixed(1) + " J/kg"; if (!small) meterScale(scene, (E0 / 0.9).toFixed(1), "J per kg");
    J.gpe.set(E.gpe / E0 * 0.9); J.ke.set(E.ke / E0 * 0.9); J.th.set(lost * 0.9);
    read.textContent = friction ? T("readFriction") : fill(T("readOff"), { me: (E.total / E0 * 100).toFixed(1) });
  }
  readout(0);
  go.addEventListener("click", () => {
    running = true; t = 0; prove.hidden = false; proof.hidden = true; proofStage.hidden = true; go.disabled = true; fr.disabled = true;
    const want = 1; // 0 below, 1 equal, 2 above (friction off); friction on expects 0
    const pick = (friction ? pOn : pOff).picked();
    fb.textContent = pick === (friction ? 0 : want) ? T("right") : T("wrong"); ex.show();
  });
  onFrame((dt) => {
    P.step(dt);
    if (!running) return;
    t += dt * (S.reduce ? 2 : 1);
    const w = Math.sqrt(2 * 9.8 * k / SC) * 0.9, damp = friction ? Math.pow(FRICTION_DRAW, t / Math.PI * w) : 1;
    const x = x0 * Math.cos(w * t) * damp; putAt(x);
    const lost = 1 - damp * damp; readout(lost);
    if (t * w >= Math.PI) freezeReturn();
  });
  return { ...S, dispose() { proofStage.remove(); S.dispose(); ui.remove(); } };
}

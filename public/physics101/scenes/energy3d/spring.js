// Every Joule Sim 3: spring launcher, ideal-spring model only (Tesla O1). Words from text; Tesla wording in story.json.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { SPRING, LAUNCH_H, elasticPE, launchKE, apexKE, apexHeight } from "./physics.js";
import { after, panel, predict, explain, jar, meterScale, packets, el, fill, jasper, labels3d, inspector } from "./ui.js";

const SC = 3; // scene units per metre
export function mountSpring(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 36, camera: [2.4, 2.6, 6.4], target: [-0.6, 1.4, 0], portrait: { fov: 34, camera: [3.0, 2.8, 7.2], target: [0.7, 0.9, 0] }, ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const th = (SPRING.angle * Math.PI) / 180, dir = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);
  const base = new THREE.Vector3(-2, LAUNCH_H * SC, 0);
  const rail = toon(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.2)), dark ? "#8A8378" : "#9C8B6E");
  rail.position.copy(base).addScaledVector(dir, -0.3); rail.rotation.z = th; rail.material.color.set("#7A7F7D"); scene.add(rail);
  const post = toon(new THREE.Mesh(new THREE.BoxGeometry(0.2, LAUNCH_H * SC, 0.2)), "#666A68"); post.position.set(base.x - 0.6, (LAUNCH_H * SC) / 2, 0); scene.add(post);
  const foot = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 24)), "#666A68"); foot.position.set(base.x - 0.6, 0.05, 0); scene.add(foot);
  const anchor = toon(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22)), "#55595A"); scene.add(anchor);
  const lbl = (m, t, pos, at) => { m.userData.label = t; m.userData.labelPos = pos; if (at) m.userData.labelAnchor = at; return m; };
  lbl(foot, T("lbl_anchor", "spring anchor"), "left", new THREE.Vector3(-0.3, 0, 0));
  lbl(rail, T("lbl_guide", "55 degree guide"), "below-right");
  // coil: a helix of unit length along y, stretched between the anchor and the pull tab
  const hp = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2 * 9; hp.push(new THREE.Vector3(Math.cos(a) * 0.1, i / 160 - 0.5, Math.sin(a) * 0.1)); }
  const coil = toon(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp), 320, 0.018, 6)), palette.elastic[M]); coil.rotation.z = th - Math.PI / 2; scene.add(coil);
  const ball = toon(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12)), "#C9574F"); scene.add(ball);
  { const seam = new THREE.Mesh(new THREE.TorusGeometry(0.121, 0.006, 4, 32), new THREE.MeshBasicMaterial({ color: "#F4EFE4" })); seam.rotation.y = 0.6; ball.add(seam); }
  const tab = new THREE.Group(); scene.add(tab);
  { const knob = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 12)), "#B58B60"); knob.rotation.z = th - Math.PI / 2; tab.add(knob);
    for (let i = -2; i <= 2; i++) { const r = toon(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 16)), "#8C6A48"); r.rotation.copy(knob.rotation); r.rotateX(Math.PI / 2); r.position.copy(dir.clone().multiplyScalar(i * 0.05)); tab.add(r); }
    tab.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }))); }
  // bell: lathe-turned shell with a clapper, hung from a stand at the target height
  const bp = [[0.02, 0.32], [0.08, 0.3], [0.12, 0.22], [0.15, 0.08], [0.22, 0]].map(([r, y]) => new THREE.Vector2(r, y));
  const bell = toon(new THREE.Mesh(new THREE.LatheGeometry(bp, 20)), "#D6A834"); bell.material.side = THREE.DoubleSide; bell.position.set(base.x + 1.6, SPRING.bell * SC - 0.16, 0); scene.add(bell);
  const clap = toon(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8)), dark ? "#8A8378" : "#6F665A"); clap.position.set(bell.position.x, bell.position.y + 0.02, 0); scene.add(clap);
  const bStand = toon(new THREE.Mesh(new THREE.BoxGeometry(0.06, SPRING.bell * SC + 0.3, 0.06)), dark ? "#6F665A" : "#C9B48E"); bStand.position.set(bell.position.x + 0.45, (SPRING.bell * SC + 0.3) / 2, -0.2); scene.add(bStand);
  const arm = toon(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05)), dark ? "#6F665A" : "#C9B48E"); arm.position.set(bell.position.x + 0.22, SPRING.bell * SC + 0.2, -0.1); scene.add(arm);
  // red limit tick at x max = 0.080 m (drawn at the same 4x scale as the extension)
  const limit = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.36, 0.3), new THREE.MeshBasicMaterial({ color: dark ? "#E0705F" : "#B5473A" })); scene.add(limit);
  limit.position.copy(base).addScaledVector(dir, -SPRING.xMax * SC * 4 - 0.12); limit.rotation.z = th;
  const J = { el: jar(THREE, scene, toon, 1.6, -1.6, palette.elastic[M], ink), ke: jar(THREE, scene, toon, 2.2, -1.6, palette.kinetic[M], ink), gpe: jar(THREE, scene, toon, 2.8, -1.6, palette.gravitational[M], ink) };
  J.th = jar(THREE, scene, toon, 0, 0, palette.thermal[M]);
  // velocity arrows on the ball (no shadows): cyan horizontal always, cyan vertical vanishes at the apex; pink sound on landing
  const arrH = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.4, new THREE.Color(palette.kinetic[M]).getHex(), 0.1, 0.07);
  const arrV = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.4, new THREE.Color(palette.kinetic[M]).getHex(), 0.1, 0.07);
  const arrS = new THREE.ArrowHelper(new THREE.Vector3(1, 0.5, 0).normalize(), new THREE.Vector3(), 0.5, new THREE.Color(palette.sound[M]).getHex(), 0.1, 0.06);
  for (const a of [arrH, arrV, arrS]) { a.visible = false; a.userData.noFit = true; a.traverse((o) => { o.castShadow = false; }); scene.add(a); }
  arrS.line.userData.label = T("lbl_soundIll", "sound (illustrative)"); arrS.line.userData.labelPos = "right";
  for (const [k, d] of [["el", "elastic"], ["ke", "kinetic"], ["gpe", "gravitational"], ["th", "thermal on landing (illustrative)"]]) { J[k].glass.userData.label = T("jar_" + k, d); J[k].glass.userData.labelPos = "above"; }
  const P = packets(THREE, scene);
  anchor.position.copy(base).addScaledVector(dir, -0.85);
  lbl(coil, T("lbl_coil", "coil spring"), "above-left"); lbl(ball, T("lbl_ball", "ball, m = 0.050 kg"), "above"); lbl(tab.children[0], T("lbl_handle", "extension handle"), "left");
  lbl(limit, T("limitLabel"), "below-left"); lbl(bell, T("bellLabel"), "above", new THREE.Vector3(0, 0.3, 0));
  // extension ruler beside the rail, ticks every 0.05 unit
  const ruler = toon(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.03)), "#D4B17E"); ruler.position.copy(base).addScaledVector(dir, -0.4).add(new THREE.Vector3(0.08, -0.08, 0.16)); ruler.rotation.z = th; scene.add(ruler);
  for (let i = 0; i <= 22; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.008, i % 4 ? 0.03 : 0.06, 0.01), new THREE.MeshBasicMaterial({ color: "#2B2622" })); tk.position.set(-0.55 + i * 0.05, 0.02, 0.02); ruler.add(tk); }
  lbl(ruler, T("lbl_ruler", "extension ruler"), "below");
  // landing pad and dotted trajectory with a freeze marker
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.2), new THREE.MeshToonMaterial({ color: "#7D9B76" })); pad.receiveShadow = true; scene.add(pad); lbl(pad, T("lbl_pad", "landing pad"), "below");
  const dots = new THREE.Group(); scene.add(dots); const marker = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: "#FFFDF5" })); marker.visible = false; scene.add(marker);
  const dotMat = new THREE.MeshBasicMaterial({ color: ink }), dotGeo = new THREE.SphereGeometry(0.018, 6, 4);
  { const v = Math.sqrt((2 * Math.max(0, launchKE(SPRING.xMax * 0.6))) / SPRING.m), tl = (v * Math.sin(th) + Math.sqrt((v * Math.sin(th)) ** 2 + 2 * 9.8 * base.y / SC)) / 9.8; pad.position.set(base.x + v * Math.cos(th) * tl * SC, 0.02, 0); }
  lbl(marker, T("lbl_marker", "trajectory freeze marker"), "above-right");
  let x = 0.05, running = false, t = 0;
  const VIS = 4; // extension drawn 4x so 0.080 m is visible
  const setX = (v) => { x = Math.max(0, Math.min(SPRING.xMax, v)); const p = base.clone().addScaledVector(dir, -x * SC * VIS); ball.position.copy(p).addScaledVector(dir, 0.12); tab.position.copy(p).addScaledVector(dir, -0.25); const A = base.clone().addScaledVector(dir, -(SPRING.xMax * SC * VIS + 0.9)), L0 = p.distanceTo(A); coil.position.copy(A).lerp(p, 0.5); coil.scale.set(1, L0, 1); readout(); };
  addDrag(tab, { axis: "y", min: base.y - SPRING.xMax * SC * VIS * Math.sin(th) - 0.25 * Math.sin(th) - 0.01, max: base.y - 0.25 * Math.sin(th), onMove: (y) => { if (running) return; setX((base.y - 0.25 * Math.sin(th) - y) / (SC * VIS * Math.sin(th))); } });

  const ui = panel(host, dark, T("takeaway"), T("question", "At the top of the arc, is the ball's kinetic energy zero, equal to launch, or smaller but not zero?"));
  const setup = inspector(host, ["k = 100 N/m", "m = 0.050 kg", "x max = 0.080 m", "launch angle 55 degrees", "bell 0.90 m +/- 0.03 m", "Model: ideal spring, no friction, no air resistance"], ["At the apex vertical velocity is zero, horizontal motion continues, so KE is smaller but not zero"]);
  jasper(host, "spring", T("jasperCard"));
  setup.append(el("div", null, "Extension ruler: 0 to 0.080 m; red tick marks the declared limit."));
  ruler.userData.label = "";
  ui.append(el("div", null, T("labels")), el("p", null, T("model")));
  const read = after(el("div")); ui.appendChild(read); // round 2: apex numbers wait for the prediction and launch
  // energy ledger: one row per account, from the same numbers that drive the meters; appears only once released
  const ledger = el("table", "e3d-ledger"); ledger.style.cssText = "font-variant-numeric:tabular-nums;border-collapse:collapse;font-size:16px"; ledger.hidden = true; ui.appendChild(ledger);
  const LROWS = [["el", "elastic"], ["ke", "kinetic"], ["gpe", "gravitational"], ["th", "thermal + sound (illustrative)"], ["tot", "total"]];
  const cells = {}; for (const [k, d] of LROWS) { const tr = el("tr"); const a = el("td", null, T("led_" + k, d)); a.style.paddingRight = "10px"; const b = el("td"); b.style.textAlign = "right"; cells[k] = b; tr.append(a, b); ledger.appendChild(tr); }
  const showLedger = (o) => { ledger.hidden = false; let tot = 0; for (const [k] of LROWS.slice(0, 4)) { cells[k].textContent = (o[k] || 0).toFixed(4) + " J"; tot += o[k] || 0; } cells.tot.textContent = tot.toFixed(4) + " J"; };
  const pr = predict(ui, "e3d-spring", T("predict"), text.choices);
  const go = el("button", null, T("release", "Release")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const qualification = "This model assumes Hooke's law, F = kx, only within the declared linear range through 0.080 m. A physical demonstration requires a tested spring and its measured force-extension curve, whose area gives stored energy. An untested real spring must not be assumed linear to the model limit. No friction or air resistance is included.";
  const realSpring = after(el("p", "e3d-real-spring", qualification));
  realSpring.style.cssText = "font-size:16px;border:2px solid currentColor;border-radius:8px;padding:8px;max-width:100%;box-sizing:border-box";
  ui.append(realSpring);
  const ex = explain(ui, "Lift the flap", T("explain") + " " + qualification);
  const apexCard = el("p", "e3d-card", T("apexCard")); apexCard.style.cssText = "border:2px solid currentColor;border-radius:8px;padding:6px 8px;margin:0"; apexCard.hidden = true; ui.appendChild(apexCard);
  function readout() {
    const E = elasticPE(x), top = elasticPE(SPRING.xMax); meterScale(scene, top.toFixed(3), "J");
    read.textContent = fill(T("readout"), { x: x.toFixed(4), pe: E.toFixed(3), apex: apexKE(x).toFixed(4), h: apexHeight(x).toFixed(3) });
    if (!running) { J.el.set(E / top); J.ke.set(0); J.gpe.set(0); J.th.set(0); }
  }
  setX(x);
  pr.onPick(() => { go.disabled = false; });
  let v0, path;
  go.addEventListener("click", () => {
    arrS.visible = false; showLedger({ el: elasticPE(x) });
    running = true; t = 0; go.disabled = true; dots.clear(); dots.userData.n = -1;
    const ke = Math.max(0, launchKE(x)); v0 = Math.sqrt((2 * ke) / SPRING.m);
    fb.textContent = pr.picked() === (text.correct ?? 2) ? T("right") : T("wrong"); ex.show();
    const h = apexHeight(x); fb.textContent += " " + fill(T(Math.abs(h - SPRING.bell) <= SPRING.bellTol ? "ring" : "miss"), { h: h.toFixed(3) });
  });
  onFrame((dt) => {
    P.step(dt);
    if (!running) return;
    t += dt * (S.reduce ? 1 : 0.5);
    const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th) - 9.8 * t;
    const px = base.x + vx * t * SC, py = base.y + (v0 * Math.sin(th) * t - 4.9 * t * t) * SC;
    ball.position.set(px, Math.max(0.12, py), 0);
    if (Math.floor(t * 20) !== dots.userData.n) { dots.userData.n = Math.floor(t * 20); const d = new THREE.Mesh(dotGeo, dotMat); d.position.copy(ball.position); dots.add(d); marker.position.copy(ball.position); marker.visible = true; }
    if (vy <= 0 && apexCard.hidden) apexCard.hidden = false; // apex reached
    const E0 = elasticPE(SPRING.xMax), ke = 0.5 * SPRING.m * (vx * vx + vy * vy), gpe = Math.max(0, elasticPE(x) - ke);
    J.el.set(0); J.ke.set(ke / E0); J.gpe.set(gpe / E0); J.th.set(0);
    const Ein = elasticPE(x); showLedger({ el: 0, ke, gpe: Math.max(0, Ein - ke) });
    arrH.visible = true; arrH.position.copy(ball.position); arrH.setLength(0.15 + 0.5 * Math.abs(vx) / (v0 || 1), 0.1, 0.07);
    arrV.visible = Math.abs(vy) > 0.05 * v0; arrV.position.copy(ball.position); arrV.setDirection(new THREE.Vector3(0, Math.sign(vy) || 1, 0)); arrV.setLength(0.15 + 0.5 * Math.abs(vy) / (v0 || 1), 0.1, 0.07);
    if (py <= 0.12) { running = false; go.disabled = false; arrH.visible = arrV.visible = false; arrS.visible = true; arrS.position.copy(ball.position);
      J.ke.set(0); J.gpe.set(0); J.th.set(Ein / E0); showLedger({ th: Ein }); }
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}

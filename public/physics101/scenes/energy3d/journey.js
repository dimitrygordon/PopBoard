// Every Joule Sim 10: nothing is lost. Breakfast energy in a declared closed room (Tesla C9, C1). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { journey, JOURNEY } from "./physics.js";
import { after, ribbon, panel, predict, explain, jar, meterScale, packets, el, fill, jasper, inspector } from "./ui.js";

export function mountJourney(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 38, camera: [3.5, 4.0, 8.5], target: [0, 0.7, 0], portrait: { fov: 34, camera: [2.6, 3.4, 7.4], target: [0, 0.65, 0] }, ...opts });
  if (!S) return null;
  jasper(host, "journey", T("jasperCard"));
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const mesh = (geo, c, x, y, z, par = scene) => { const m = toon(new THREE.Mesh(geo), c); m.position.set(x, y, z); par.add(m); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // room diorama at the back (Leo's journey sheet)
  const RZ = -1.0;
  mesh(new THREE.BoxGeometry(5.5, 0.12, 3.2), dark ? "#6F665A" : "#E3D5B8", 0, 0.06, RZ);
  mesh(new THREE.BoxGeometry(5.5, 0.7, 0.08), dark ? "#5E574D" : "#D2C3A3", 0, 0.47, RZ - 1.6);
  mesh(new THREE.BoxGeometry(0.08, 0.7, 3.2), dark ? "#5E574D" : "#D2C3A3", -2.75, 0.47, RZ);
  const rad = new THREE.Group(); rad.position.set(2.2, 0.12, RZ - 1.35); scene.add(rad);
  for (let i = 0; i < 8; i++) mesh(new THREE.BoxGeometry(0.06, 0.42, 0.12), "#F4EFE4", -0.25 + i * 0.07, 0.25, 0, rad);
  const heatC = palette.thermal[M];
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.15 + i * 0.15, 0.5, 0), V(-0.1 + i * 0.15, 0.65, 0), V(-0.18 + i * 0.15, 0.8, 0), V(-0.12 + i * 0.15, 0.95, 0)]), 16, 0.012, 5), new THREE.MeshBasicMaterial({ color: heatC })); rad.add(c); }
  lbl(rad.children[0], T("lbl_room", "room thermal"), "right", V(0.25, 0.5, 0));
  // dashed system boundary around the room, with a corner handle
  const bpts = [V(-2.85, 0.2, RZ - 1.7), V(2.85, 0.2, RZ - 1.7), V(2.85, 0.2, 2.15), V(-2.85, 0.2, 2.15), V(-2.85, 0.2, RZ - 1.7)];
  const bound = new THREE.Line(new THREE.BufferGeometry().setFromPoints(bpts), new THREE.LineDashedMaterial({ color: dark ? "#7FD6E0" : "#1B8797", dashSize: 0.15, gapSize: 0.1 })); bound.computeLineDistances(); scene.add(bound);
  const corner = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: dark ? "#7FD6E0" : "#1B8797" })); corner.position.copy(bpts[3]); scene.add(corner);
  lbl(corner, T("lbl_boundary", "system boundary"), "left");
  // five-stage journey strip at the front
  const SZ = 1.55, SLOT = [-2, -1, 0, 1, 2];
  lbl(mesh(new THREE.BoxGeometry(5.2, 0.06, 0.65), "#B58B60", 0, 0.03, SZ), T("lbl_strip", "journey stages"), "below", V(-1.5, 0, 0.32));
  for (const x of SLOT) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: ink })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.065, SZ); scene.add(r); }
  const tokens = [];
  { const o = new THREE.Group(); o.position.set(SLOT[0], 0.06, SZ); scene.add(o); tokens.push(o);
    const card = mesh(new THREE.BoxGeometry(0.48, 0.58, 0.025), "#F7F3EA", 0, 0.29, 0, o); card.rotation.x = -0.25;
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: "#E7B53A" })); sun.position.set(0, 0.32, 0.05); sun.rotation.x = -0.25; o.add(sun);
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.CircleGeometry(0.035, 3), new THREE.MeshBasicMaterial({ color: "#E7B53A" })); const a = i * Math.PI / 4; r.position.set(Math.cos(a) * 0.17, 0.32 + Math.sin(a) * 0.17, 0.05 + Math.sin(a) * 0.04); r.rotation.set(-0.25, 0, a - Math.PI / 2); o.add(r); }
    lbl(card, T("lbl_sun", "Sun"), "above", V(0, 0.3, 0)); }
  { const o = new THREE.Group(); o.position.set(SLOT[1], 0.06, SZ); o.scale.setScalar(0.85); scene.add(o); tokens.push(o);
    mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.025, 28), "#F4F0E5", 0, 0.0125, 0, o);
    for (const [x, z, r] of [[-0.06, 0, 0.2], [0.07, 0.02, -0.25]]) { const y = 0.045 + (x > 0 ? 0.035 : 0); mesh(new THREE.BoxGeometry(0.3, 0.035, 0.26), "#A66F3F", x, y, z, o).rotation.y = r; mesh(new THREE.BoxGeometry(0.26, 0.037, 0.22), "#DDB97C", x, y + 0.001, z, o).rotation.y = r; }
    lbl(mesh(new THREE.BoxGeometry(0.08, 0.03, 0.06), "#F1D66B", 0.07, 0.11, 0.02, o), T("lbl_breakfast", "selected breakfast"), "above"); }
  const mannequin = (x, lean) => { const o = new THREE.Group(); o.position.set(x, 0.06, SZ); scene.add(o); tokens.push(o); const tan = "#C7A276"; const b = new THREE.Group(); b.rotation.x = 0; b.rotation.z = -lean; o.add(b);
    mesh(new THREE.SphereGeometry(0.1, 14, 10), tan, 0, 0.72, 0, b); mesh(new THREE.CapsuleGeometry(0.09, 0.26, 4, 10), tan, 0, 0.46, 0, b);
    for (const sx of [-1, 1]) { const leg = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.3, 8), tan, sx * 0.05, 0.15, 0, b); leg.rotation.z = lean ? sx * 0.35 : 0; const arm = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.26, 8), tan, sx * 0.13, 0.46, 0, b); arm.rotation.z = sx * (lean ? 0.7 : 0.2); }
    return o; };
  lbl(mannequin(SLOT[2], 0).children[0].children[0], T("lbl_person", "person"), "above");
  const mover = mannequin(SLOT[3], 0.26);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.22 + i * 0.07, 0.008, 4, 16, 1.0), new THREE.MeshBasicMaterial({ color: palette.kinetic[M] })); c.position.set(-0.08, 0.45, 0); c.rotation.z = Math.PI * 0.6; mover.add(c); }
  lbl(mover.children[0].children[0], T("lbl_mover", "moving person"), "above-right");
  { const o = new THREE.Group(); o.position.set(SLOT[4], 0.06, SZ); scene.add(o); tokens.push(o);
    for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(0.05, 0.32, 0.1), "#F4EFE4", -0.15 + i * 0.06, 0.16, 0, o);
    for (let i = 0; i < 2; i++) { const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.08 + i * 0.16, 0.36, 0), V(-0.04 + i * 0.16, 0.48, 0), V(-0.1 + i * 0.16, 0.6, 0)]), 10, 0.01, 5), new THREE.MeshBasicMaterial({ color: heatC })); o.add(c); } }
  const person = mover;
  // stores in jars on the room floor, fixed-total bar above them
  // fixed-total bar (round 1): one segmented HUD bar, 64 px high, whose length never changes; segment widths are the
  // chemical, kinetic and thermal shares of the tracked 270 J. Replaces the floor cylinders and the 3D total line.
  const small = (host.clientWidth || innerWidth) < 600;
  const fbar = document.createElement("div"); fbar.className = "e3d-hud e3d-fixedbar";
  fbar.style.cssText = `position:absolute;left:${small ? 8 : 12}px;right:${small ? 108 : 130}px;bottom:${small ? 8 : 10}px;min-height:64px;box-sizing:border-box;padding:3px 8px;z-index:2;border:1.5px solid ${ink};border-radius:10px;background:${dark ? "rgba(31,29,26,.94)" : "rgba(251,246,234,.95)"};color:${ink};font:16px/1.1 'Patrick Hand','Gochi Hand',cursive;font-variant-numeric:tabular-nums`;
  const fhead = document.createElement("div"); fhead.textContent = T("lbl_total", "total energy, fixed: 270 J tracked"); fbar.appendChild(fhead);
  const track = document.createElement("div"); track.style.cssText = `display:flex;height:22px;margin-top:3px;border:1.5px solid ${ink};border-radius:5px;overflow:hidden`; fbar.appendChild(track);
  const seg = (c, nm) => { const d = document.createElement("div"); d.style.cssText = `height:100%;background:${c};display:flex;align-items:center;justify-content:center;font-size:16px;color:#2B2622;white-space:nowrap;overflow:hidden;transition:width .1s linear`; d.title = nm; d.textContent = nm; track.appendChild(d); return { node: d, set: (f) => { d.style.width = (f * 100).toFixed(2) + "%"; }, glass: { userData: {} } }; };
  const J = { food: seg(palette.chemical[M], T("jar_food", "chemical")), kinetic: seg(palette.kinetic[M], T("jar_kinetic", "kinetic")), thermal: seg(palette.thermal[M], T("jar_thermal", "room thermal")) };
  const scaleRow = document.createElement("div"); scaleRow.style.cssText = "display:flex;justify-content:space-between;font-size:16px"; scaleRow.innerHTML = "<span>0 J</span><span>270 J</span>"; fbar.appendChild(scaleRow);
  host.appendChild(fbar);
  // energy thread: radiant yellow (Sun to breakfast), chemical green (breakfast to person), cyan kinetic and orange thermal
  // side by side while moving, then all orange into the room. Unshadowed; grows with the timeline.
  const TY = 1.0, TZ = SZ - 0.1;
  const th1 = ribbon(THREE, scene, [V(SLOT[0], TY, TZ), V((SLOT[0] + SLOT[1]) / 2, TY + 0.15, TZ), V(SLOT[1], TY, TZ)], palette.light[M], { width: 0.1 });
  const th2 = ribbon(THREE, scene, [V(SLOT[1], TY, TZ), V((SLOT[1] + SLOT[2]) / 2, TY + 0.15, TZ), V(SLOT[2], TY, TZ)], palette.chemical[M], { width: 0.1 });
  const th3k = ribbon(THREE, scene, [V(SLOT[2], TY + 0.04, TZ), V((SLOT[2] + SLOT[3]) / 2, TY + 0.2, TZ), V(SLOT[3], TY + 0.04, TZ)], palette.kinetic[M], { width: 0.05 });
  const th3t = ribbon(THREE, scene, [V(SLOT[2], TY - 0.04, TZ), V((SLOT[2] + SLOT[3]) / 2, TY + 0.1, TZ), V(SLOT[3], TY - 0.04, TZ)], palette.thermal[M], { width: 0.05 });
  const th4 = ribbon(THREE, scene, [V(SLOT[3], TY, TZ), V((SLOT[3] + SLOT[4]) / 2, TY + 0.15, TZ), V(SLOT[4], TY, TZ), V(SLOT[4] + 0.5, TY + 0.5, TZ - 0.6)], palette.thermal[M], { width: 0.1 });
  th2.mesh.userData.label = T("lbl_thread", "energy thread"); th2.mesh.userData.labelPos = "above"; th2.mesh.userData.labelAnchor = th2.at(0.5);
  const thread = (ph) => { const u = Math.max(0, Math.min(1, ph / 2)) * 4; // 4 segments across the timeline
    th1.set(0.1, Math.min(1, u)); th2.set(0.1, Math.max(0.001, Math.min(1, u - 1)));
    const s3 = Math.max(0.001, Math.min(1, u - 2)), sJ = journey(ph), K = sJ.kinetic / JOURNEY.food; th3k.set(0.1 * Math.max(K, 0.002), s3); th3t.set(0.1 * Math.max(1 - K - sJ.food / JOURNEY.food, 0.002), s3);
    th4.set(0.1 * Math.max(0.002, sJ.thermal / JOURNEY.food), Math.max(0.001, Math.min(1, u - 3))); };
  const total = { userData: {} }; void total;
  const P = packets(THREE, scene);
  // timeline cursor: ring on a rail in front of the strip (presentation only)
  const cursor = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: ink }));
  const TX = [-2.2, 2.2]; cursor.position.set(TX[0], 0.07, SZ + 0.5); scene.add(cursor);
  const line = new THREE.Mesh(new THREE.BoxGeometry(TX[1] - TX[0], 0.02, 0.02), new THREE.MeshBasicMaterial({ color: ink })); line.position.set(0, 0.03, SZ + 0.5); scene.add(line); lbl(line, T("lbl_timeline", "timeline: drag"), "below-right", V(1.6, 0, 0));
  const ui = panel(host, dark, T("takeaway"), T("question", "Where does the breakfast's energy end up, and does the total increase, decrease, or stay fixed?"));
  inspector(host, ["E_final = E_initial + E_in - E_out", "closed model: system boundary dashed", "animation timings: presentation only"], ["v = 1.5 m/s, KE = 67.5 J", "food removed 270 J, thermal 202.5 J (0.1 percent display tolerance)", "In this declared closed model only, after motion stops: all 270 J is room thermal."]);
  ui.append(el("div", null, T("equation")), after(el("div", null, T("values"))));
  const read = after(el("div")); ui.appendChild(read); // round 2: no values before the prediction and Play
  const pr = predict(ui, "e3d-journey", T("predict"), text.choices);
  const go = el("button", null, T("play", "Play")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.append(el("p", null, T("closed")), el("p", null, T("footer")));
  let phase = 0, playing = false, locked = true;
  const show = () => {
    const s = journey(phase), f = JOURNEY.food;
    J.food.set(s.food / f); J.kinetic.set(s.kinetic / f); J.thermal.set(s.thermal / f); thread(phase);
    const st = Math.min(4, Math.floor(phase * 2.5)); tokens.forEach((o, i) => { o.position.y = 0.06 + (i === st ? 0.12 : 0); });
    cursor.position.x = TX[0] + (phase / 2) * (TX[1] - TX[0]);
    read.textContent = fill(T("readout"), { food: s.food.toFixed(1), ke: s.kinetic.toFixed(1), th: s.thermal.toFixed(1), total: (s.food + s.kinetic + s.thermal).toFixed(1) });
  };
  const modes = el("select"); modes.setAttribute("aria-label", "Account view");
  for (const [v, t] of [["whole", "Whole journey"], ["single", "Single store"], ["trace", "Trace store"]]) { const o = el("option", null, t); o.value = v; modes.append(o); }
  const account = el("select"); account.setAttribute("aria-label", "Selected energy account");
  for (const [v, t] of [["food", "chemical"], ["kinetic", "kinetic"], ["thermal", "thermal"]]) { const o = el("option", null, t); o.value = v; account.append(o); }
  const trace = el("div", "e3d-ledger"); trace.hidden = true;
  const boundary = el("button", null, "Show closed-system boundary"); boundary.type = "button"; boundary.dataset.noReveal = "1"; boundary.setAttribute("aria-pressed", "false");
  const boundaryNote = el("div", null, "Inside: breakfast, person, room and floor. Nothing crosses this declared closed boundary. The tracked total stays 270 J."); boundaryNote.hidden = true;
  ui.append(modes, account, boundary, boundaryNote, trace);
  const history = [];
  const selectAccount = () => {
    const isolated = modes.value !== "whole";
    for (const [k, j] of Object.entries(J)) j.node.style.opacity = !isolated || k === account.value ? "1" : "0.18";
    trace.hidden = modes.value !== "trace" || locked;
    if (!trace.hidden) { const state = journey(phase), key = account.value === "food" ? "food" : account.value; const point = `${phase.toFixed(2)}: ${state[key].toFixed(1)} J`; if (history.at(-1) !== point) history.push(point); if (history.length > 12) history.shift(); trace.textContent = `${account.options[account.selectedIndex].text} trace (phase: J), total fixed 270 J: ` + history.join(" | "); }
  };
  modes.addEventListener("change", selectAccount); account.addEventListener("change", () => { history.length = 0; selectAccount(); });
  boundary.addEventListener("click", () => { const on = boundary.getAttribute("aria-pressed") !== "true"; boundary.setAttribute("aria-pressed", String(on)); bound.material.color.set(on ? "#C9574F" : dark ? "#7FD6E0" : "#1B8797"); boundaryNote.hidden = !on; });
  onFrame(selectAccount);
  show();
  addDrag(cursor, { axis: "x", min: TX[0], max: TX[1], onMove: (x) => { if (locked) { cursor.position.x = TX[0]; return; } playing = false; phase = ((x - TX[0]) / (TX[1] - TX[0])) * 2; show(); } });
  pr.onPick(() => { go.disabled = false; locked = false; });
  go.addEventListener("click", () => { phase = 0; playing = true; fb.textContent = pr.picked() === (text.correct ?? 1) ? T("right") : T("wrong"); ex.show(); });
  onFrame((dt) => {
    P.step(dt);
    if (!playing) return;
    const prev = phase; phase = Math.min(2, phase + dt * (S.reduce ? 1 : 0.4)); show();
    if (prev < 2 && phase >= 2) playing = false;
  });
  return { ...S, dispose() { fbar.remove(); S.dispose(); ui.remove(); } };
}

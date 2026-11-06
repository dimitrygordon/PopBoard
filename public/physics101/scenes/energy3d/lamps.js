// Every Joule Sim 7: filament vs LED at matched lumens (Tesla C10). The light ribbon is drawn, never numbered. Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { LAMPS, lumens, matched, ledWattsFor, powerSaving } from "./physics.js";
import { panel, predict, explain, packets, el, fill, jasper, inspector, ribbon } from "./ui.js";

export function mountLamps(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  // Leo's lamps sheet: FOV 36, camera (2.8, 2.5, 5.8) -> (0, 0.55, 0); filament and LED bulbs on stands, lumen meter on a rail.
  const S = createEnergyScene(host, { fov: 36, camera: [2.8, 2.5, 5.8], target: [0, 0.55, 0], portrait: { fov: 34, camera: [0, 3.0, 7.0], target: [0, 0.6, 0] }, ...opts });
  if (!S) return null;
  jasper(host, "lamps", T("jasperCard"));
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const hc = document.createElement("canvas"); hc.width = hc.height = 64; const hx = hc.getContext("2d");
  const hg = hx.createRadialGradient(32, 32, 0, 32, 32, 32); hg.addColorStop(0, "#fff"); hg.addColorStop(1, "rgba(255,255,255,0)"); hx.fillStyle = hg; hx.fillRect(0, 0, 64, 64);
  const haloTex = new THREE.CanvasTexture(hc);
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const screw = (g, y) => { for (let i = 0; i < 3; i++) { const r = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 16)), "#B8B2A6"); r.position.y = y + i * 0.025; g.add(r); } };
  const lamp = (x, led) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
    const stand = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 28)), "#9C7A52"); stand.position.y = 0.04; g.add(stand);
    const sock = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 20)), "#F1ECE2"); sock.position.y = 0.16; g.add(sock);
    screw(g, 0.25);
    let bulb, glass;
    if (!led) { // pear glass, zigzag filament, support wires
      glass = new THREE.Mesh(lathe([[0.05, 0], [0.07, 0.06], [0.15, 0.18], [0.17, 0.26], [0.15, 0.34], [0.09, 0.4], [0, 0.42]]), new THREE.MeshToonMaterial({ color: "#FFF4D6", transparent: true, opacity: 0.35, depthWrite: false })); glass.position.y = 0.31; glass.castShadow = false; g.add(glass);
      const zz = []; for (let i = 0; i <= 8; i++) zz.push(new THREE.Vector3(-0.08 + i * 0.02, 0.5 + (i & 1) * 0.04, 0));
      bulb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zz, false, "catmullrom", 0), 40, 0.008, 6), new THREE.MeshToonMaterial({ color: palette.light[M], emissive: palette.light[M], emissiveIntensity: 0.9 })); g.add(bulb);
      for (const sx of [-0.08, 0.08]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), new THREE.MeshBasicMaterial({ color: "#5A544B" })); w.position.set(sx, 0.42, 0); g.add(w); }
    } else { // finned heat sink, frosted dome
      for (let i = 0; i < 8; i++) { const f = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.1 + i * 0.008, 0.1 + i * 0.008, 0.012, 24)), "#A9B1B2"); f.position.y = 0.32 + i * 0.018; g.add(f); }
      bulb = new THREE.Mesh(lathe([[0.17, 0], [0.165, 0.08], [0.13, 0.17], [0.07, 0.22], [0, 0.24]]), new THREE.MeshToonMaterial({ color: "#F4F0E5", emissive: palette.light[M], emissiveIntensity: 0.6 })); bulb.position.y = 0.46; g.add(bulb); glass = bulb;
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: palette.light[M], transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.17 * 2 * 1.6); halo.position.set(x, led ? 0.56 : 0.55, 0); halo.userData.noFit = true; scene.add(halo);
    // power box and cord: the only path electrical dots travel
    const box = toon(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.16)), "#3A3631"); box.position.set(x + (led ? 0.35 : -0.35), 0.025, 0.55); scene.add(box);
    const a = new THREE.Vector3(box.position.x, 0.04, box.position.z), b = new THREE.Vector3(x, 0.1, 0.12);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, new THREE.Vector3((a.x + b.x) / 2, 0.01, (a.z + b.z) / 2), b]), 16, 0.009, 6), new THREE.MeshBasicMaterial({ color: "#2B2622" })); scene.add(cord);
    lbl(glass, led ? T("lblLed", "LED lamp") : T("lblFil", "filament lamp"), led ? "above-right" : "above-left");
    lbl(stand, led ? T("lblStand", "lamp stand") : T("lblSocket", "socket"), "below");
    lbl(box, led ? T("lblLedPower", "LED power") : T("lblFilPower", "filament power"), led ? "below-right" : "below-left");
    return { bulb, halo, wire: [a, new THREE.Vector3(x, 0.3, 0)] };
  };
  const fil = lamp(-0.8, false), led = lamp(0.8, true);
  // equal-geometry rail with the lumen meter in the middle
  for (const z of [-0.06, 0.06]) { const r = toon(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 0.025)), "#8C9396"); r.position.set(0, 0.0125, 0.3 + z); scene.add(r); }
  const rail = new THREE.Group(); scene.add(rail); for (let i = -3; i <= 3; i++) { const t = toon(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.2)), "#6E5A44"); t.position.set(i * 0.24, 0.006, 0.3); rail.add(t); }
  const meter3 = new THREE.Group(); meter3.position.set(0, 0.025, 0.3); scene.add(meter3);
  const mbody = toon(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.18)), "#777D7D"); mbody.position.y = 0.14; meter3.add(mbody);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial({ color: palette.light.light })); dial.position.set(0, 0.15, 0.091); meter3.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.08, 0.002), new THREE.MeshBasicMaterial({ color: "#1A1714" })); needle.geometry.translate(0, 0.04, 0); needle.position.set(0, 0.11, 0.093); meter3.add(needle);
  const sensor = toon(new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12)), "#FFFFFF"); sensor.position.y = 0.33; meter3.add(sensor);
  lbl(mbody, T("lblMeter", "lumen meter"), "above", new THREE.Vector3(0, 0.26, 0)); lbl(rail.children[0], T("lblRail", "equal-geometry rail"), "below-left");
  S.addDrag(meter3, { axis: "x", min: -0.55, max: 0.55 }); // slide the meter along the rail (equal geometry either side)
  // transfers (round 1): continuous pale-blue electrical ribbon, width = input power (60 W = full width), glow = on.
  // Filament: orange thermal branch about 54 of 60 W; fixed thin warm-yellow light ribbon, never width-encoded or numbered.
  // LED: no thermal/light split is drawn (blocked without radiometric data).
  const V = (x, y, z) => new THREE.Vector3(x, y, z), FULL = 0.11;
  const rib = (lx, side) => ribbon(THREE, scene, [V(lx + side * 0.35, 0.03, 0.55), V(lx + side * 0.15, 0.03, 0.35), V(lx, 0.1, 0.13)], palette.electrical[M], { width: FULL });
  const eF = rib(-0.8, -1), eL = rib(0.8, 1);
  eF.mesh.userData.label = T("lblElecIn", "electrical input, 60 W"); eF.mesh.userData.labelPos = "below"; eF.mesh.userData.labelAnchor = eF.at(0.4);
  const thF = ribbon(THREE, scene, [V(-0.8, 0.62, 0), V(-1.0, 0.85, -0.1), V(-1.25, 1.0, -0.2)], palette.thermal[M], { width: FULL * 54 / 60, label: T("lblFilThermal", "thermal, about 54 W"), labelPos: "left" });
  const lightF = ribbon(THREE, scene, [V(-0.62, 0.55, 0.05), V(-0.3, 0.45, 0.2), V(-0.03, 0.38, 0.3)], palette.light[M], { width: 0.018 });
  const lightL = ribbon(THREE, scene, [V(0.62, 0.55, 0.05), V(0.3, 0.45, 0.2), V(0.03, 0.38, 0.3)], palette.light[M], { width: 0.018 });
  lightF.mesh.userData.label = T("lblLight", "visible light (not to scale)"); lightF.mesh.userData.labelPos = "above"; lightF.mesh.userData.labelAnchor = lightF.at(0.5);
  void thF;

  const ui = panel(host, dark, T("takeaway"), T("question", "To match the 60 W filament's 800 lm, will the LED need less than, equal to, or more than 60 W?"));
  const setup = inspector(host, ["Filament: 60 W, 800 lm, 13.3 lm/W", "LED: rated 115 lm/W", "match band 776 to 824 lm", "Matched lumens compare useful visible output as weighted for human vision. They do not determine radiometric energy efficiency."], ["800 lm needs about 6.96 W", "88.4 percent less input power"]);
  const matchAnswers = [...setup.querySelectorAll("[data-after]")]; matchAnswers.forEach((n) => { delete n.dataset.after; n.hidden = true; });
  ui.append(el("div", null, T("filament")), el("div", null, T("ledRated")));
  const pr = predict(ui, "e3d-lamps", T("predict"), text.choices);
  const wl = el("label", null, T("wattLabel")); const w = el("input"); w.type = "number"; w.step = "0.01"; w.min = "0"; w.setAttribute("aria-label", T("wattLabel")); ui.append(wl, w);
  const sl = el("label", null, T("sliderLabel")); const s = el("input"); s.type = "range"; s.min = 1; s.max = 12; s.step = 0.01; s.value = 3; s.disabled = true; s.setAttribute("aria-label", T("sliderLabel")); ui.append(sl, s);
  const meter = el("div"); ui.appendChild(meter);
  // compare tab (round 1): Search shows the slider work; Compare lays the two lamps side by side at matched lumens
  const tabs = el("div"); tabs.setAttribute("role", "tablist"); tabs.style.cssText = "display:flex;gap:6px;margin:6px 0";
  const tb = (t) => { const b = el("button", null, t); b.setAttribute("role", "tab"); tabs.appendChild(b); return b; };
  const tSearch = tb(T("tabSearch", "Search")), tCmp = tb(T("tabCompare", "Compare"));
  const cmp = el("div"); cmp.hidden = true; cmp.style.cssText = "font-variant-numeric:tabular-nums";
  ui.insertBefore(tabs, wl); ui.appendChild(cmp);
  const searchEls = [wl, w, sl, s, meter];
  const showTab = (c) => { tSearch.setAttribute("aria-selected", String(!c)); tCmp.setAttribute("aria-selected", String(c)); searchEls.forEach((e) => { e.hidden = c; }); cmp.hidden = !c; };
  tSearch.addEventListener("click", () => showTab(false)); tCmp.addEventListener("click", () => showTab(true)); showTab(false);
  const bar = (nm, W, c) => `<div style="display:grid;grid-template-columns:5.5em 1fr 4.5em;align-items:center;gap:6px;margin:3px 0"><span>${nm}</span><span style="height:14px;border:1.5px solid currentColor;border-radius:4px;overflow:hidden"><span style="display:block;height:11px;transform:scaleX(${(W / 60).toFixed(3)});transform-origin:left;background:${c}"></span></span><span>${W.toFixed(2)} W</span></div>`;
  const renderCmp = (W, lm) => { cmp.innerHTML = matched(lm)
    ? `<div>${fill(T("cmpHead", "Both lamps give about {lm} lm. Electrical input:"), { lm: Math.round(lm) })}</div>` + bar(T("cmpFil", "filament"), LAMPS.filament.W, palette.electrical[M]) + bar(T("cmpLed", "LED"), W, palette.electrical[M]) + `<div>${T("cmpNote", "Same light out, less electrical energy in each second.")}</div>`
    : T("cmpWait", "Match the lumens on the Search tab first."); };
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(el("p", null, T("card")));
  const lock = () => { s.disabled = !(pr.picked() != null && +w.value > 0); };
  pr.onPick(lock); w.addEventListener("input", lock);
  const gauge = el("div", "e3d-hud e3d-lumen-gauge");
  gauge.style.cssText = `position:absolute;left:8px;top:8px;z-index:2;padding:5px 8px;border:1.5px solid currentColor;border-radius:8px;font-size:16px;background:${dark ? "#1F1D1A" : "#FBF6EA"};color:${dark ? "#EDE6D6" : "#2B2622"};max-width:300px`;
  host.append(gauge);
  if ((host.clientWidth || innerWidth) >= 600) {
    const safe = el("div", "e3d-hud e3d-lamps-safe");
    safe.style.cssText = "position:absolute;left:12px;right:12px;top:10px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;z-index:3;pointer-events:none;font-size:16px";
    const heading = host.querySelector(":scope > .e3d-take");
    if (heading) { heading.style.cssText = "grid-column:1/-1;position:static;font-size:18px;line-height:1.25;overflow-wrap:anywhere"; safe.append(heading); }
    gauge.style.cssText += ";position:static;max-width:none;align-self:start;box-sizing:border-box;overflow-wrap:anywhere";
    setup.style.cssText += ";position:static;max-width:none;width:auto;min-width:0;overflow-wrap:anywhere";
    safe.append(gauge, setup); host.append(safe);
  }
  const seconds = el("input"); seconds.type = "number"; seconds.min = "1"; seconds.max = "3600"; seconds.value = "10"; seconds.setAttribute("aria-label", "Comparison elapsed time in seconds");
  const timeLabel = el("label", null, "Elapsed time (s), energy = power x time"); timeLabel.append(seconds); ui.append(timeLabel);
  const ledger = el("div", "e3d-ledger"); ledger.hidden = true; ui.append(ledger);
  seconds.addEventListener("input", update);
  function update() {
    const W = +s.value, lm = lumens("led", W), lf = lumens("filament", LAMPS.filament.W);
    led.bulb.material.emissiveIntensity = 0.3 + 0.6 * Math.min(1, lm / lf);
    { const r = Math.min(1, lm / lf); led.bulb.material.color.set("#7C7466").lerp(new THREE.Color(palette.light[M]), r); led.bulb.material.emissive.set("#000000").lerp(new THREE.Color(palette.light[M]), r); } // dim LED looks grey until it matches
    const k = 0.75 + 0.25 * Math.min(1, lm / lf); led.halo.scale.setScalar(0.115 * 2 * 1.6 * k); led.halo.material.opacity = 0.5 * Math.min(1, lm / lf);
    needle.rotation.z = 1.2 - 2.4 * Math.min(1, lm / lf);
    eL.set(FULL * W / LAMPS.filament.W).glow(1); lightL.glow(Math.min(1, lm / lf));
    // the match search: meter callout reads the LED output against the 776 to 824 lm band; wattages only appear once matched
    mbody.userData.labelPos = "none";
    mbody.userData.label = matched(lm) ? fill(T("lblMatched", "MATCHED {lm} lm: filament 60 W, LED {W} W"), { lm: Math.round(lm), W: W.toFixed(2) }) : fill(T("lblSeek", "LED {lm} lm, seek 776 to 824 lm"), { lm: Math.round(lm) }); // dial needle: LED output against the filament's
    const committed = pr.picked() != null && +w.value > 0;
    gauge.textContent = `LED ${Math.round(lm)} lm | target 776 to 824 lm`;
    ledger.hidden = !committed || !matched(lm);
    matchAnswers.forEach((n) => { n.hidden = ledger.hidden; });
    const elapsed = Math.max(1, Math.min(3600, +seconds.value || 1));
    ledger.textContent = `Electrical input energy over ${elapsed} s: filament ${(60 * elapsed).toFixed(1)} J; LED ${(W * elapsed).toFixed(1)} J. Scale 0 to ${(60 * elapsed).toFixed(1)} J. Watts measure rate, lumens measure visible output, joules measure accumulated energy. No LED radiant split is inferred.`;
    if (!ledger.hidden) gauge.textContent += ` | ${elapsed} s electrical input: filament ${(60 * elapsed).toFixed(1)} J, LED ${(W * elapsed).toFixed(1)} J; scale 0 to ${(60 * elapsed).toFixed(1)} J`;
    renderCmp(W, lm);
    meter.textContent = fill(T("meter"), { W: W.toFixed(2), lm: Math.round(lm), f: Math.round(lf) });
    if (matched(lm)) { fb.textContent = fill(T("matched"), { need: ledWattsFor().toFixed(2), less: (powerSaving() * 100).toFixed(1), guess: (+w.value).toFixed(2) }); ex.show(); }
    else fb.textContent = "";
  }
  s.addEventListener("input", update); update();
  let acc = 0;
  onFrame((dt) => {
    acc += dt;
    if (S.reduce || acc < 0.25) return; acc = 0;
    // electrical dots ride the wire only, inside the frame; hidden with reduced motion (S.reduce returns above). No numbers (C10).
    const dot = dark ? "#B5DEFA" : "#8EC9F2";
    void dot; // packets replaced by the ribbons above
  });
  return { ...S, dispose() { gauge.remove(); S.dispose(); ui.remove(); } };
}

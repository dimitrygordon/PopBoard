// Power station to lamp (Every Joule Sim 8). 3D toon chain on core.js; words from opts.text.
import { panel, jasper, inspector, ribbon } from "./ui.js";
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { SOURCES, gridChain, sourceInputFor } from "./physics.js";

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const SRC_COLOR = { gas: "chemical", coal: "chemical", nuclear: "nuclear", hydro: "kinetic", wind: "kinetic", solar: "light" };
const NUCLEAR = { light: "#C9971C", dark: "#E6B84A" }; // spec 0.3 nuclear gold

export function mountGrid(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { fov: 34, camera: [1.5, 5.0, 12.5], target: [0, 0.65, 0], portrait: { fov: 30, camera: [4.6, 4.8, 8.8], target: [0, 0.65, 0] }, ...opts }); // Leo's grid sheet
  if (!S) return null;
  jasper(host, "grid", T("jasperCard"));
  const { THREE, scene, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light";
  const col = (k) => (k === "nuclear" ? NUCLEAR : palette[k])[M];
  const box = (w, h, d, c, x, y = h / 2) => { const m = toon(new THREE.Mesh(new THREE.BoxGeometry(w, h, d)), c); m.position.set(x, y, 0); scene.add(m); return m; };

  // chain: source, conversion, generator, step-up, pylons, step-down, home
  const X = { src: -6, conv: -4.2, gen: -2.6, up: -1.1, line: 1.2, down: 3.4, home: 5.3 };
  const lbl = (m, t, pos, anchor) => { m.userData.label = t; m.userData.labelPos = pos; if (anchor) m.userData.labelAnchor = anchor; return m; };
  const mesh = (geo, c, x, y, z = 0) => { const m = toon(new THREE.Mesh(geo), c); m.position.set(x, y, z); scene.add(m); return m; };
  const LINE_Y = 1.55;
  // source token on its socket (shape and colour follow the chosen source)
  const sock = mesh(new THREE.BoxGeometry(0.38, 0.1, 0.38), "#8A8378", X.src, 0.05);
  // source tokens with their own silhouettes (round 1: gas was an anonymous sphere); 1.5x token scale
  const srcTok = new THREE.Group(); srcTok.position.set(X.src, 0.1, 0); srcTok.scale.setScalar(2.0); scene.add(srcTok);
  const tokenFor = (k) => {
    srcTok.children.slice().forEach((o) => { o.traverse((m) => { m.geometry?.dispose(); m.material?.dispose(); }); srcTok.remove(o); }); const add = (geo, c, x = 0, y = 0, z = 0) => { const m = toon(new THREE.Mesh(geo), c); m.position.set(x, y, z); srcTok.add(m); return m; };
    if (k === "gas") { add(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16), "#5E6A6D", 0, 0.03); add(new THREE.ConeGeometry(0.1, 0.26, 12), col("chemical"), 0, 0.19); add(new THREE.ConeGeometry(0.05, 0.14, 10), "#BFE3A0", 0, 0.15, 0.03); }
    else if (k === "coal") { const l = add(new THREE.DodecahedronGeometry(0.13), "#2E2B28", 0, 0.12); l.scale.set(1.2, 0.8, 1); add(new THREE.DodecahedronGeometry(0.07), "#3A3632", 0.12, 0.06, 0.05); }
    else if (k === "nuclear") { add(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 12), col("nuclear"), 0, 0.17); add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12), "#7E8586", 0, 0.345); }
    else if (k === "wind") { add(new THREE.CylinderGeometry(0.015, 0.025, 0.32, 8), "#E9E3D6", 0, 0.16); const hub = add(new THREE.SphereGeometry(0.03, 10, 8), "#E9E3D6", 0, 0.33, 0.02); for (let b = 0; b < 3; b++) { const bl = add(new THREE.BoxGeometry(0.03, 0.17, 0.01), col("kinetic"), 0, 0.33, 0.03); bl.geometry.translate(0, 0.085, 0); bl.rotation.z = b * 2.094; } }
    else if (k === "solar") { const p2 = add(new THREE.BoxGeometry(0.3, 0.02, 0.22), "#2F4F8F", 0, 0.16); p2.rotation.x = -0.6; add(new THREE.BoxGeometry(0.02, 0.14, 0.02), "#7E8586", 0, 0.07); add(new THREE.BoxGeometry(0.3, 0.005, 0.01), col("light"), 0, 0.175, 0.0).rotation.x = -0.6; }
    else { add(new THREE.SphereGeometry(0.1, 16, 12), col("kinetic"), 0, 0.11); add(new THREE.ConeGeometry(0.087, 0.14, 16), col("kinetic"), 0, 0.24); }
  };
  tokenFor("gas");
  lbl(sock, T("src_gas", "Gas"), "above", new THREE.Vector3(0, 0.6, 0)); const srcLabel = sock;
  // power station: boiler, turbine hall, two cooling towers, striped chimney
  const boiler = mesh(new THREE.BoxGeometry(1.0, 0.65, 0.7), "#C7AE88", X.conv - 0.3, 0.325);
  const hall = mesh(new THREE.BoxGeometry(0.75, 0.4, 0.55), "#B8A07A", X.conv + 0.55, 0.2);
  const tower = new THREE.LatheGeometry([[0.32, 0], [0.24, 0.45], [0.22, 0.6], [0.26, 0.85]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  mesh(tower, "#D9D2C4", X.conv - 0.75, 0, -0.75); mesh(tower, "#D9D2C4", X.conv + 0.05, 0, -0.75);
  const chim = mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.15, 12), "#B5463B", X.conv - 0.6, 0.575, 0.2);
  for (const y of [0.3, 0.7, 1.05]) mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 12), "#F4EFE4", X.conv - 0.6, y, 0.2);
  lbl(boiler, T("lbl_conv", "power station"), "above", new THREE.Vector3(0, 0.6, 0));
  // generator: horizontal drum with end disk and shaft
  const gen = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 20), "#7D898C", X.gen, 0.24); gen.rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 20), "#5E6A6D", X.gen + 0.31, 0.24).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), "#3F4545", X.gen - 0.45, 0.24).rotation.z = Math.PI / 2;
  lbl(gen, T("lbl_gen", "generator"), "below");
  // transformers: grey body, cooling fins, three insulators
  const xformer = (x, k, name) => {
    const b = mesh(new THREE.BoxGeometry(0.55 * k, 0.45 * k, 0.45 * k), "#9AA1A2", x, 0.225 * k);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(0.03, 0.36 * k, 0.4 * k), "#7E8586", x + sx * (0.3 * k + 0.02), 0.2 * k, -0.15 * k + i * 0.1 * k);
    for (let i = -1; i <= 1; i++) mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.2 * k, 8), "#E9E3D6", x + i * 0.15 * k, 0.45 * k + 0.1 * k);
    lbl(b, name, "above", new THREE.Vector3(0, 0.35 * k, 0)); return b;
  };
  xformer(X.up, 1, T("lbl_up", "step-up transformer")); xformer(X.down, 0.85, T("lbl_down", "step-down transformer"));
  // two lattice pylons and three sagging lines
  const ironC = "#69767A", pyl = [];
  for (const px of [X.line - 1.3, X.line + 1.3]) {
    const g = new THREE.Group(); g.position.x = px; scene.add(g); pyl.push(g);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = toon(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.7, 5)), ironC); leg.position.set(sx * 0.11, 0.85, sz * 0.11); leg.rotation.z = -sx * 0.1; leg.rotation.x = sz * 0.1; g.add(leg); }
    for (const y of [0.4, 0.8, 1.2]) { const br = toon(new THREE.Mesh(new THREE.BoxGeometry(0.3 - y * 0.12, 0.02, 0.02)), ironC); br.position.y = y; g.add(br); }
    for (const [y, w] of [[1.3, 0.9], [1.5, 0.7], [1.66, 0.5]]) { const arm = toon(new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, 0.03)), ironC); arm.position.y = y; g.add(arm); }
  }
  lbl(pyl[1].children[0], T("lbl_pylons", "transmission pylons"), "above-right", new THREE.Vector3(0, 0.9, 0));
  const lines = [];
  for (const [y, w] of [[1.3, 0.45], [1.5, 0.35], [1.66, 0.25]]) {
    const pts = [new THREE.Vector3(X.up + 0.15, 0.55, 0), new THREE.Vector3(X.line - 1.3 - w, y, 0), new THREE.Vector3(X.line, y - 0.18, 0), new THREE.Vector3(X.line + 1.3 + w, y, 0), new THREE.Vector3(X.down, 0.5, 0)];
    const ln = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.009, 5), new THREE.MeshBasicMaterial({ color: dark ? "#C9C2B4" : "#3F4545" })); scene.add(ln); lines.push(ln);
  }
  lbl(lines[2], T("lbl_lines", "grid lines"), "above", new THREE.Vector3(X.line, 1.5, 0));
  // homes: two houses with roofs, windows and a chimney; the lamp hangs in the front window
  const house = (x, z) => {
    const b = mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), dark ? "#C9B48E" : "#E8D6B0", x, 0.225, z);
    const roof = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.6, 3), "#A5533F", x, 0.55, z); roof.rotation.set(0, 0, Math.PI / 2); roof.rotation.order = "ZYX"; roof.scale.set(1, 1, 0.75);
    mesh(new THREE.BoxGeometry(0.07, 0.18, 0.07), "#8A4A3A", x + 0.15, 0.68, z - 0.1);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), new THREE.MeshBasicMaterial({ color: "#5E7D8E" })); win.position.set(x - 0.12, 0.26, z + 0.252); scene.add(win);
    return b;
  };
  const h1 = house(X.home - 0.2, 0.1); house(X.home + 0.55, -0.45);
  lbl(h1, T("lbl_home", "homes"), "right", new THREE.Vector3(0.2, 0.1, 0));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), new THREE.MeshBasicMaterial({ color: col("light") })); lamp.position.set(X.home - 0.08, 0.27, 0.36); scene.add(lamp);
  lbl(lamp, T("lbl_lamp", "7 W LED"), "below");
  // stage cards: six thin cream cards in slots across the front, in chain order; a card dropped anywhere but its own slot snaps back
  const STAGES = ["source", "plant", "gen", "step-up", "lines", "step-down"]; // short: the names sit on 1.0 m cards
  const slotX = (i) => -3.6 + i * 1.44, SLOT_Z = 1.75;
  // phones (round 1 item 6): props 1.35x about their own anchors, source token 1.5x more, chain spacing kept;
  // stage cards and sources move to a horizontally scrolling tray in the panel instead of 3D cards
  const phone = (host.clientWidth || innerWidth) < 600;
  if (phone) {
    const anchors = [X.conv, X.gen, X.up, X.down, X.home];
    for (const m of [...scene.children]) {
      if (!m.isMesh || m.userData.noFit || m === sock) continue;
      const a = anchors.find((x) => Math.abs(m.position.x - x) < (x === X.home ? 0.9 : 0.75)); if (a == null) continue;
      m.position.x = a + (m.position.x - a) * 1.6; m.position.z *= 1.6; m.position.y *= 1.6; m.scale.multiplyScalar(1.6);
    }
    srcTok.scale.setScalar(2.8);
  }
  STAGES.forEach((nm, i) => {
    // round 1: readable rectangular cards (name printed on top), at least 72 x 48 CSS px on desktop
    const c = mesh(new THREE.BoxGeometry(1.0, 0.03, 0.62), dark ? "#E9DFC8" : "#F6EEDC", slotX(i), 0.015, SLOT_Z);
    const slot = mesh(new THREE.BoxGeometry(1.1, 0.008, 0.72), "#B9AE98", slotX(i), 0.004, SLOT_Z); slot.userData.noDrag = true;
    c.userData.label = `${i + 1} ${T("stage_" + i, nm)}`; c.userData.labelPos = "on"; c.userData.labelPosMobile = "none"; // screen-facing name, readable at any angle
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160; const x2 = cv.getContext("2d");
    x2.fillStyle = "#FFFDF5"; x2.fillRect(0, 0, 256, 160); x2.strokeStyle = "#2B2622"; x2.lineWidth = 10; x2.strokeRect(4, 4, 248, 152);
    x2.fillStyle = "#2B2622"; x2.font = "bold 40px 'Patrick Hand', 'Gochi Hand', cursive"; x2.textAlign = "center"; x2.textBaseline = "middle"; x2.fillText(String(i + 1), 128, 50); x2.font = "bold 36px 'Patrick Hand', 'Gochi Hand', cursive"; x2.fillText(T("stage_" + i, nm), 128, 108);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; // grazing view: keep the print sharp
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.58), new THREE.MeshBasicMaterial({ map: tex })); face.rotation.x = -Math.PI / 2; face.position.y = 0.017; c.add(face);
    const home = c.position.clone();
    { c.visible = slot.visible = false; return; }
    S.addDrag?.(c, { axis: "xz", min: [-6, 0.8], max: [6, 2.6], onUp: (m) => { const k = Math.round((m.position.x + 3.6) / 1.44); if (k !== i || Math.abs(m.position.z - SLOT_Z) > 0.3) m.position.copy(home); else m.position.set(slotX(i), home.y, SLOT_Z); } });
    if (i === 2) lbl(slot, T("lbl_cards", "stage cards"), "below", new THREE.Vector3(0, 0, 0.36));
  });
  // HUD: scenario card plus the solar and coal badges, inside the scene
  const hud = el("div", "e3d-hud"); hud.style.cssText = "position:absolute;right:10px;top:var(--e3d-hud-top,64px);justify-content:flex-end;display:flex;flex-wrap:wrap;gap:6px;max-width:60%;pointer-events:none;font:16px/1.2 'Patrick Hand','Gochi Hand',cursive;z-index:2";
  const chip = (bg, fg) => { const c = el("span"); c.style.cssText = `padding:2px 8px;border-radius:7px;border:1.5px solid #2B2622;background:${bg};color:${fg};box-shadow:1px 2px 0 rgba(43,38,34,.18)`; return c; };
  const scen = chip("#FFFDF5", "#2B2622"); scen.textContent = T("hud_scenario", "mixed-year scenario"); const hudBadge = chip("#FFF3D6", "#8A3B12");
  hud.append(scen, hudBadge); host.appendChild(hud);
  let sourceButtons = [];
  if (host.e3dPanel) { // bottom tray: sources then stage cards, 8 px gaps, 64 x 44 cells, scrolls sideways
    const tray = el("div", "e3d-tray"); tray.setAttribute("aria-label", T("trayLabel", "Sources and stage cards"));
    tray.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;padding:4px 2px 8px;margin:0 0 8px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;clear:both;";
    const cell = (txt, fn) => { const b = el("button", null, txt); b.type = "button"; b.style.cssText = "flex:1 1 auto;min-width:64px;max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;min-height:44px;padding:4px 8px;border:1.5px solid #2B2622;border-radius:8px;background:#FFFDF5;color:#2B2622;font:16px/1.1 'Patrick Hand','Gochi Hand',cursive;scroll-snap-align:start"; if (fn) b.addEventListener("click", fn); tray.appendChild(b); return b; };
    const srcCells = Object.keys(SOURCES).map((k) => { const b = cell(T("src_" + k, k), () => { sel.value = k; sel.dispatchEvent(new Event("change")); srcCells.forEach((x) => { x.style.background = x === b ? "#FFE7A8" : "#FFFDF5"; x.setAttribute("aria-pressed", String(x === b)); }); }); return b; });
    sourceButtons = srcCells;
    srcCells.forEach((b, i) => { b.dataset.source = Object.keys(SOURCES)[i]; });
    const stageTray = el("div", "e3d-stage-tray"); stageTray.setAttribute("aria-label", "Named stage cards in chain order"); stageTray.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10em),1fr));gap:8px;width:100%;max-width:100%;min-width:0;box-sizing:border-box;padding:4px 0;min-height:56px";
    const stageNames = ["Source", "Power station", "Generator", "Step-up transformer", "Transmission lines", "Step-down transformer"];
    const stageIcons = ["☀", "▥", "⚙", "↑", "⌁", "↓"];
    let draggingStage = null;
    STAGES.forEach((nm, i) => {
      const b = cell(`${stageIcons[i]} ${i + 1} ${stageNames[i]}`, () => { stageTray.querySelectorAll("[data-stage]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
      stageTray.append(b); b.dataset.stage = i; b.draggable = true; b.style.minWidth = "0"; b.style.minHeight = "52px"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("dragstart", () => { draggingStage = i; }); b.addEventListener("dragover", (e) => e.preventDefault());
      b.addEventListener("drop", (e) => { e.preventDefault(); b.setAttribute("aria-pressed", String(draggingStage === i)); b.title = draggingStage === i ? "Correct stage slot" : "Wrong order: card returned to its own slot"; draggingStage = null; });
    });
    const trays = el("div", "e3d-grid-trays"); trays.style.cssText = "width:100%;max-width:100%;min-width:0;overflow:hidden;box-sizing:border-box"; trays.append(tray, stageTray); host.e3dPanel.prepend(trays);
  }
  // packets
  const glow = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const packets = [];
  const STOPS = { plant: X.gen, rotor: X.conv, generator: X.gen, module: X.gen, grid: X.down };
  function spawn() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col(SRC_COLOR[src]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(0.3); s.position.set(X.src, 0.6, 0); scene.add(s);
    // each packet decides once, per stage, whether it peels off: survival odds = stage efficiency, so each loss is drawn once
    const ch = gridChain(src); let fate = null;
    for (const st of ch.stages) { const p = st.name === "grid" ? st.eff : st.eff; if (Math.random() > p) { fate = st.name; break; } }
    packets.push({ s, x: X.src, fate, peel: 0 });
  }

  // UI
  const ui = panel(host, dark, T("takeaway"), T("question", "Rank the six sources by the fraction of their input that reaches the lamp."));
  const insp = inspector(host, ["Grid retained 0.912 (from 28456.6/323031.1 GWh)", "Transformer heating is included in the grid loss. No separate factor.", "7 W lamp; mixed-year illustrative scenario using the approved declared inputs", "Solar: INCOMPLETE CHAIN. Coal: historical (2023)."], ["Gas 0.4376, 16.00 W", "Coal 0.3159, 22.16 W", "Nuclear 0.3574, 19.59 W", "Hydro 0.8207, 8.53 W", "Wind 0.4491, 15.59 W", "Solar 0.2070, 33.82 W"]);
  // round 2: the six fractions wait for the completed run and Explain, not just the first button press
  const answers = [...insp.querySelectorAll("[data-after]")]; answers.forEach((n) => { delete n.dataset.after; n.hidden = true; });
  let src = "gas", running = false, phase = "predict";
  const sel = el("select"); sel.setAttribute("aria-label", T("sourceLabel", "Source"));
  for (const k of Object.keys(SOURCES)) { const o = el("option", null, T("src_" + k, k)); o.value = k; sel.appendChild(o); }
  ui.append(el("label", null, T("sourceLabel", "Source") + " "), sel);
  const badge = el("strong", "e3d-badge"); badge.style.cssText = "display:block;color:" + col("thermal"); ui.appendChild(badge);
  const info = el("div"); ui.appendChild(info);
  const q = el("fieldset"); q.style.cssText = "min-width:0;max-width:100%;box-sizing:border-box;margin:0"; q.append(el("legend", null, T("predict")));
  const opts3 = el("div"); opts3.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5em),1fr));gap:4px 10px;width:100%;min-width:0"; q.appendChild(opts3); // 3-column radio grid
  for (const k of Object.keys(SOURCES)) { const l = el("label"); l.style.whiteSpace = "nowrap"; const r = el("input"); r.type = "radio"; r.name = "e3d-grid"; r.value = k; l.append(r, " " + T("src_" + k, k)); opts3.appendChild(l); }
  ui.appendChild(q);
  const rankings = el("fieldset"); rankings.style.cssText = "margin:0;width:100%;max-width:100%;min-width:0;box-sizing:border-box"; rankings.append(el("legend", null, "Commit a rank for every displayed source (1 = largest model fraction). Solar is still an incomplete chain."));
  const rankInputs = Object.keys(SOURCES).map((k) => { const l = el("label", null, T("src_" + k, k) + " "); l.style.cssText = "display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;min-height:44px;gap:8px;min-width:0"; const select = el("select"); select.setAttribute("aria-label", "Predicted rank: " + k); select.style.minHeight = "44px"; const blank = el("option", null, "Choose rank"); blank.value = ""; select.append(blank); for (let n = 1; n <= 6; n++) { const o = el("option", null, n); o.value = n; select.append(o); } l.append(select); rankings.append(l); return select; });
  ui.append(rankings);
  const run = el("button", null, T("run", "Run")); run.disabled = true; ui.appendChild(run);
  const exBtn = el("button", null, T("explainBtn", "Explain")); exBtn.hidden = true; ui.appendChild(exBtn);
  const ex = el("p", null, T("explain")); ex.hidden = true; ui.appendChild(ex);
  const fb = el("p"); ui.appendChild(fb);
  ui.appendChild(el("p", "e3d-note", T("scenario")));
  const card = el("p", "e3d-card", T("modelCard")); card.style.cssText = "border:2px solid currentColor;border-radius:8px;padding:6px 8px;margin:0;font-weight:600;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere"; ui.appendChild(card);
  let ranOnce = false, runStarted = false, runElapsed = 0; // fractions and watts stay hidden until the first Run

  // energy ribbon (round 1 item 9): source colour to the generator, electrical pale blue after it; width = share of the
  // source input still flowing (full width 0.3 m = 1.0, scale bar in the HUD chip); orange losses branch sideways at the
  // plant (or rotor/module) and on the grid. No separate transformer narrowing. Drawn only after the first Run.
  const RY = 2.25, RW = 0.3;
  let ribs = [];
  function drawRibbon() {
    for (const r of ribs) { scene.remove(r.mesh); r.mesh.geometry.dispose(); } ribs = [];
    if (!runStarted) return;
    const ch = gridChain(src), Vv = (x, y, z) => new THREE.Vector3(x, y, z);
    let f = 1, x = X.src; const cuts = ch.stages.map((st) => ({ st, at: st.name === "grid" ? X.down : st.name === "generator" ? X.gen + 0.3 : X.gen - 0.2 }));
    for (const { st, at } of cuts) {
      const colr = x < X.gen ? col(SRC_COLOR[src]) : col("electrical");
      ribs.push(ribbon(THREE, scene, [Vv(x, RY, 0), Vv((x + at) / 2, RY, 0), Vv(at, RY, 0)], colr, { width: RW * f, up: [0, 0, 1] }));
      const loss = f * (1 - st.eff);
      ribs.push(ribbon(THREE, scene, [Vv(at, RY, 0), Vv(at + 0.25, RY + 0.35, 0), Vv(at + 0.35, RY + 0.75, 0)], col("thermal"), { width: Math.max(0.01, RW * loss), up: [0, 0, 1] }));
      f *= st.eff; x = at;
    }
    if (gridChain(src).badge === "incomplete") { // round 2: solar shows its incompleteness; the chain stops where the inverter would be
      const gap = new THREE.Line(new THREE.BufferGeometry().setFromPoints([Vv(x, RY, 0), Vv(X.home, RY, 0)]), new THREE.LineDashedMaterial({ color: col("thermal"), dashSize: 0.12, gapSize: 0.1 })); gap.computeLineDistances(); gap.userData.noFit = true;
      const stop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), new THREE.MeshBasicMaterial({ color: "#C9574F" })); stop.position.set(x + 0.15, RY, 0); stop.userData.noFit = true;
      stop.userData.label = T("lbl_incomplete", "INCOMPLETE CHAIN: no inverter or grid modelled"); stop.userData.labelPos = "above";
      scene.add(gap, stop); ribs.push({ mesh: gap }, { mesh: stop });
    } else
    ribs.push(ribbon(THREE, scene, [Vv(x, RY, 0), Vv((x + X.home) / 2, RY, 0), Vv(X.home, RY, 0)], col("electrical"), { width: RW * f, up: [0, 0, 1] }));
    ribs[0].mesh.userData.label = T("lbl_ribbon", "energy ribbon: width = share of source input"); ribs[0].mesh.userData.labelPos = "above"; ribs[0].mesh.userData.labelAnchor = ribs[0].at(0.5);
  }
  function readout() {
    drawRibbon();
    const ch = gridChain(src);
    badge.textContent = ch.badge ? T("badge_" + ch.badge) : "";
    hudBadge.textContent = badge.textContent; hudBadge.style.display = ch.badge ? "" : "none";
    info.textContent = !ranOnce ? T("hiddenUntilRun") : T("readout").replace("{overall}", ch.overall.toFixed(4)).replace("{input}", sourceInputFor(src).toFixed(2));
    sourceButtons.forEach((b) => { const selected = b.dataset.source === src; b.style.background = selected ? "#FFE7A8" : "#FFFDF5"; b.setAttribute("aria-pressed", String(selected)); });
    tokenFor(src); srcLabel.userData.label = T("src_" + src, src);
  }
  sel.addEventListener("change", () => { src = sel.value; running = false; ranOnce = runStarted = false; answers.forEach((n) => { n.hidden = true; }); info.textContent = T("hiddenUntilRun"); readout(); });
  const committedRanks = () => { const values = rankInputs.map((s) => s.value); return values.every(Boolean) && new Set(values).size === 6 && !!q.querySelector("input:checked"); };
  const readyRun = () => { run.disabled = !committedRanks(); if (!run.disabled) phase = "test"; };
  q.addEventListener("change", readyRun); rankings.addEventListener("change", readyRun);
  run.addEventListener("click", () => {
    if (phase === "predict") return;
    running = !running; runStarted = true; runElapsed = 0; drawRibbon(); run.textContent = running ? T("stop", "Stop") : T("run", "Run");
    const pick = q.querySelector("input:checked")?.value;
    fb.textContent = "Run in progress: results appear when the transfer completes."; exBtn.hidden = true;
  });
  exBtn.addEventListener("click", () => { ex.hidden = false; answers.forEach((n) => { n.hidden = false; }); });
  readout();

  let acc = 0;
  onFrame((dt) => {
    if (running) { runElapsed += dt; if (runElapsed >= 2.5) { running = false; ranOnce = true; readout(); exBtn.hidden = false; run.textContent = T("run", "Run"); const pick = q.querySelector("input:checked")?.value; fb.textContent = pick === "hydro" ? T("right") : T("wrong"); } acc += dt; if (acc > (S.reduce ? 0.6 : 0.12)) { acc = 0; spawn(); } }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      if (p.peel) { p.peel += dt; p.s.position.y += dt * 1.2; p.s.position.z += dt * 0.8; p.s.material.opacity = Math.max(0, 1 - p.peel); if (p.peel >= 1) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); } continue; }
      p.x += dt * 3; p.s.position.x = p.x; p.s.position.y = p.x > X.up + 0.3 && p.x < X.down - 0.3 ? LINE_Y : 0.6;
      if (p.x > X.gen) p.s.material.color.set(col("electrical"));
      if (p.fate && p.x >= STOPS[p.fate]) { p.peel = 0.001; p.s.material.color.set(col("thermal")); }
      else if (p.x >= X.home) { scene.remove(p.s); p.s.material.dispose(); packets.splice(i, 1); lamp.scale.setScalar(1.4); }
    }
    lamp.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
  });
  return { ...S, setSource(k) { sel.value = k; sel.dispatchEvent(new Event("change")); }, dispose() { ui.remove(); hud.remove(); host.e3dPanel?.querySelector(".e3d-grid-trays")?.remove(); S.dispose(); } };
}

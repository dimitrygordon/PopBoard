// Every Joule Sim 1: energy stores board plus one falling-book chain (Tesla C1). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { STORES, bookFall } from "./physics.js";
import { panel, predict, explain, jar, meterScale, packets, el, jasper, inspector, ribbon , ICON } from "./ui.js";

const EXTRA = { magnetic: { light: "#6B2FA3", dark: "#9E66D1" }, electrostatic: { light: "#E8C21A", dark: "#F5D84F" }, nuclear: { light: "#C9971C", dark: "#E6B84A" } };
// example token -> its store
const EXAMPLES = { bicycle: "kinetic", book: "gravitational", spring: "elastic", drink: "thermal", battery: "chemical", magnets: "magnetic", balloon: "electrostatic", sun: "nuclear" };

export function mountStores(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const phoneLayout = (host.clientWidth || innerWidth) < 600;
  const phoneFrames = phoneLayout ? [host, host.parentElement, host.closest(".stage")].filter(Boolean) : [];
  const originalFrames = phoneFrames.map(n => [n, n.style.height, n.style.minHeight, n.style.aspectRatio]);
  for (const n of phoneFrames) { n.style.height = "1200px"; n.style.minHeight = "1200px"; n.style.aspectRatio = "auto"; }
  const S = createEnergyScene(host, { fov: 40, camera: [0, 7.5, 6.5], target: [0.6, 0.5, 0], portrait: { fov: 36, camera: [0.3, 12, 10], target: [0.3, 0.4, -0.9] }, fill: phoneLayout ? 0.88 : 0.66, ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const col = (k) => (palette[k] || EXTRA[k])[M];
  const small = (host.clientWidth || innerWidth) < 600;
  // phones (round 1): tabs and tokens in 2 rows of 4 each instead of one long row of 8
  const jars = {}, JX = (i) => small ? -1.95 + (i % 4) * 1.3 : -4.2 + i * 1.2, TZ = (i) => small ? -2.2 + Math.floor(i / 4) * 0.8 : -1.4; // phones: 4 x 2 tabs, full names
  host.e3dMetersGrid = 4; // 2 rows of 4 named store accounts in a fixed bottom HUD
  STORES.forEach((k, i) => { jars[k] = jar(THREE, scene, toon, JX(i), -1.5, col(k), ink); });
  meterScale(scene, "start total", "", false); // shares of the book's starting energy; held values stay unnumbered

  // spec props: bicycle, book, spring, mug with lid, battery, two magnets, charged balloon, Sun card (about 0.6 units)
  const neutral = dark ? "#8A8378" : "#9C8B6E";
  const M3 = (g, c, x = 0, y = 0, z = 0) => { const m = toon(new THREE.Mesh(g), c); m.position.set(x, y, z); return m; };
  // props follow Leo's energy-stores sheet; each is built at sheet size then scaled to fit a 1.2-unit slot
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rod = (a, b, r, c) => { const d = b.clone().sub(a), m = toon(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8)), c); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m; };
  function prop(kind) {
    const g = new THREE.Group();
    if (kind === "bicycle") { const fr = "#5E8C71", tire = "#3C3630", metal = "#A8AAA3";
      for (const x of [-0.525, 0.525]) { g.add(M3(new THREE.TorusGeometry(0.34, 0.035, 8, 28), tire, x, 0.375)); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.add(rod(V(x, 0.375, 0), V(x + Math.cos(a) * 0.32, 0.375 + Math.sin(a) * 0.32, 0), 0.008, metal)); } }
      const R = V(-0.525, 0.375, 0), F = V(0.525, 0.375, 0), BB = V(-0.05, 0.33, 0), ST = V(-0.15, 0.78, 0), HT = V(0.42, 0.78, 0);
      for (const [p, q] of [[R, BB], [R, ST], [BB, ST], [ST, HT], [BB, HT], [HT, F]]) g.add(rod(p, q, 0.025, fr));
      g.add(M3(new THREE.BoxGeometry(0.24, 0.06, 0.16), tire, -0.17, 0.86), rod(V(0.42, 0.95, -0.22), V(0.42, 0.95, 0.22), 0.02, metal), rod(HT, V(0.42, 0.95, 0), 0.02, metal));
      for (const z of [-0.12, 0.12]) g.add(M3(new THREE.BoxGeometry(0.1, 0.02, 0.06), metal, -0.05 + (z > 0 ? 0.08 : -0.08), 0.3 + (z > 0 ? -0.08 : 0.08), z));
      g.scale.setScalar(0.62); }
    else if (kind === "book") { g.add(M3(new THREE.BoxGeometry(0.48, 0.1, 0.34), "#416B9A", 0, 0.05), M3(new THREE.BoxGeometry(0.46, 0.08, 0.33), "#F2E4C7", 0.015, 0.05, 0.006), M3(new THREE.BoxGeometry(0.03, 0.005, 0.12), "#B5473A", 0.1, 0.103, 0.2)); }
    else if (kind === "spring") { const pts = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 20; pts.push(V(-0.35 + i / 200 * 0.85, 0.16 + Math.sin(a) * 0.12, Math.cos(a) * 0.12)); }
      g.add(M3(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.022, 6), "#8A4FD6"), M3(new THREE.BoxGeometry(0.16, 0.32, 0.16), "#666A68", -0.43, 0.16));
      const knob = M3(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16), "#B58B60", 0.55, 0.16); knob.rotation.z = Math.PI / 2; g.add(knob); g.scale.setScalar(0.8); }
    else if (kind === "drink") { const mug = M3(new THREE.CylinderGeometry(0.17, 0.15, 0.34, 20, 1, true), "#F1E3CB", 0, 0.17); mug.material.side = THREE.DoubleSide; g.add(mug, M3(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), "#F1E3CB", 0, 0.01), M3(new THREE.CylinderGeometry(0.155, 0.155, 0.01, 20), "#6B4026", 0, 0.29));
      const h = M3(new THREE.TorusGeometry(0.11, 0.022, 6, 16), "#F1E3CB", 0.19, 0.18); g.add(h);
      const lid = M3(new THREE.CylinderGeometry(0.18, 0.18, 0.025, 20), "#8A8378", 0.32, 0.0125, 0.25); g.add(lid); lid.userData.label = T("lbl_lid", "lid"); lid.userData.labelPos = "right";
      for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.06 + k * 0.06, 0.36, 0), V(-0.02 + k * 0.06, 0.48, 0), V(-0.08 + k * 0.06, 0.6, 0)]), 10, 0.01, 4), new THREE.MeshBasicMaterial({ color: palette.thermal[M] })); g.add(st); } }
    else if (kind === "battery") { g.add(M3(new THREE.CylinderGeometry(0.13, 0.13, 0.43, 18), "#3BA55C", 0, 0.215), M3(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12), "#C48B45", 0, 0.46), M3(new THREE.CylinderGeometry(0.132, 0.132, 0.05, 18), "#2B2622", 0, 0.025));
      g.add(M3(new THREE.BoxGeometry(0.08, 0.02, 0.02), "#F4EFE4", 0, 0.33, 0.131), M3(new THREE.BoxGeometry(0.02, 0.08, 0.02), "#F4EFE4", 0, 0.33, 0.131), M3(new THREE.BoxGeometry(0.08, 0.02, 0.02), "#F4EFE4", 0, 0.12, 0.131)); } // + and - terminals
    else if (kind === "magnets") { // two U-shaped magnets: curved yoke (half torus) plus contrasting N/S pole tips
      for (const [x, c, rot] of [[-0.31, "#C9574F", 0.25], [0.31, "#4C6FA8", -0.25]]) { const u = new THREE.Group(); u.position.set(x, 0.07, 0); u.rotation.y = rot; g.add(u);
        const yoke = M3(new THREE.TorusGeometry(0.15, 0.065, 10, 20, Math.PI), c); yoke.rotation.set(-Math.PI / 2, 0, Math.PI); u.add(yoke);
        for (const [sx, pc] of [[-0.13, "#F4EFE4"], [0.13, "#2B2622"]]) { u.add(M3(new THREE.BoxGeometry(0.1, 0.1, 0.16), c, sx, 0, 0.08), M3(new THREE.BoxGeometry(0.102, 0.102, 0.06), pc, sx, 0, 0.19)); } } }
    else if (kind === "balloon") { const b = M3(new THREE.IcosahedronGeometry(0.23, 2), "#A88AC2", 0, 0.6); b.scale.y = 1.2; g.add(b, M3(new THREE.ConeGeometry(0.04, 0.06, 8), "#8E70AA", 0, 0.31));
      for (const [px, py] of [[-0.12, 0.66], [0.1, 0.74], [0.02, 0.52]]) g.add(M3(new THREE.BoxGeometry(0.06, 0.016, 0.016), "#E8C21A", px, py, 0.26)); // minus charge marks
      const str = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.3, 0), V(0.05, 0.18, 0), V(-0.03, 0.06, 0), V(0, 0, 0)]), 12, 0.005, 4), new THREE.MeshBasicMaterial({ color: ink })); g.add(str);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: "#E8C21A" })); sp.position.set(Math.cos(a) * 0.33, 0.6 + Math.sin(a) * 0.36, 0); sp.rotation.z = a; g.add(sp); } }
    else { const card = M3(new THREE.BoxGeometry(0.48, 0.58, 0.025), "#FFFDF5", 0, 0.3); card.rotation.x = -0.2; g.add(card);
      const sun = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: "#C9971C" })); sun.position.set(0, 0.32, 0.07); sun.rotation.x = -0.2; g.add(sun);
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = new THREE.Mesh(new THREE.CircleGeometry(0.035, 3), new THREE.MeshBasicMaterial({ color: "#C9971C" })); r.position.set(Math.cos(a) * 0.2, 0.32 + Math.sin(a) * 0.2, 0.07 + Math.sin(a) * 0.04); r.rotation.set(-0.2, 0, a - Math.PI / 2); g.add(r); }
      const leg = M3(new THREE.BoxGeometry(0.3, 0.02, 0.3), "#E9E1CF", 0, 0.01, -0.15); g.add(leg); }
    if (kind === "battery") {
      const rim = M3(new THREE.CylinderGeometry(0.135, 0.135, 0.018, 20), "#E6E0D2", 0, 0.432); g.add(rim);
      const terminal = M3(new THREE.CylinderGeometry(0.045, 0.045, 0.045, 16), "#C48B45", 0, 0.46); g.add(terminal);
    }
    if (kind === "magnets") for (const u of g.children) {
      if (!u.isGroup) continue;
      for (const [x, name, c] of [[-0.13, "N", "#C9574F"], [0.13, "S", "#416B9A"]]) {
        const cv = document.createElement("canvas"); cv.width = cv.height = 64; const ctx = cv.getContext("2d"); ctx.fillStyle = c; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = "#FFFDF5"; ctx.font = "bold 48px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, 32, 34);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.12), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), side: THREE.DoubleSide })); face.rotation.x = -Math.PI / 2; face.position.set(x, 0.055, 0.15); u.add(face);
      }
    }
    return g;
  }
  const LBL = { bicycle: "bicycle", book: "book", spring: "stretched spring", drink: "hot drink", battery: "battery", magnets: "magnet A and B", balloon: "charged balloon", sun: "Sun card" };
  const labels = [];
  const tokens = new Map();
  let activeExample = null, draggingExample = null;
  // example tokens, each dragged along x onto its own jar
  const filled = new Set();
  const lead = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: ink, dashSize: 0.1, gapSize: 0.07 })); lead.visible = false; lead.userData.noFit = true; scene.add(lead);
  Object.entries(EXAMPLES).forEach(([ex, store], i) => {
    const tok = prop(ex); tok.scale.multiplyScalar(1.5); tok.userData.label = T("lbl_" + ex, LBL[ex]); tok.userData.labelPos = i % 2 ? "below" : "above"; tok.userData.labelAnchor = V(0, i % 2 ? 0 : 0.5, 0);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.noFit = true; tok.add(hit);
    const slot = (i * 3) % 8, home = small ? -1.8 + (slot % 2) * 3.6 : -3.85 + slot * 1.1, hz = small ? -2.7 + Math.floor(slot / 2) * 3.8 : 1.2; tok.position.set(home, 0, hz); scene.add(tok);
    if (small) { tok.userData.labelPosMobile = "none"; tok.scale.multiplyScalar(2.1); tok.traverse(o => { if (o.userData.label) o.userData.labelPosMobile = "none"; }); } // phones: name shows only while dragged
    tokens.set(ex, tok);
    addDrag(tok, { axis: "xz", min: small ? [-3.4, -4.0] : [-4.6, -1.4], max: small ? [3.4, 10.0] : [4.6, 1.4], onUp: (m) => { lead.visible = false; draggingExample = null; activeExample = null; if (small) tok.userData.labelPosMobile = "none"; m.position.set(home, 0, hz); }, onMove: (p2) => { const x = p2.x;
      activeExample = ex; draggingExample = ex;
      const nj = STORES.indexOf(store);
      lead.visible = false;
      if (Math.abs(TZ(nj) - p2.z) > 0.4) return;
      const near = Math.abs(JX(nj) - x) < (small ? 0.6 : 0.45) ? nj : -1;
      if (near >= 0 && STORES[near] === store && !filled.has(ex)) { filled.add(ex); jars[store].set(0.5); fb.textContent = T("match").replace("{ex}", T("ex_" + ex, ex)).replace("{store}", T("store_" + store, store)); }
    } });
    if (small) { const ring = host.lastElementChild; if (ring?.classList.contains("e3d-handle")) ring.style.border = "0"; }
  });

  const leaderSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  leaderSvg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
  const leaderLine = document.createElementNS(leaderSvg.namespaceURI, "line"); leaderLine.setAttribute("stroke", ink); leaderLine.setAttribute("stroke-width", "2"); leaderLine.setAttribute("stroke-dasharray", "5 4"); leaderSvg.append(leaderLine); host.append(leaderSvg);
  onFrame(() => {
    leaderSvg.style.display = draggingExample ? "block" : "none";
    if (!draggingExample) return;
    const p = tokens.get(draggingExample).getWorldPosition(V()).project(S.camera), hr = host.getBoundingClientRect(), r = jars[EXAMPLES[draggingExample]].row.getBoundingClientRect();
    leaderLine.setAttribute("x1", (p.x + 1) * hr.width / 2); leaderLine.setAttribute("y1", (1 - p.y) * hr.height / 2);
    leaderLine.setAttribute("x2", r.left + r.width / 2 - hr.left); leaderLine.setAttribute("y2", r.top - hr.top);
  });

  const objectTargets = [];
  if (small) for (const [ex, tok] of tokens) {
    const target = el("button", "e3d-object-target"); target.type = "button"; target.setAttribute("aria-label", "Select " + LBL[ex]); target.dataset.object = ex;
    target.style.cssText = "position:absolute;z-index:2;pointer-events:auto;min-width:44px;min-height:44px;background:transparent;border:0;padding:0;border-radius:6px;cursor:pointer";
    target.addEventListener("focus", () => { target.style.outline = "2px solid " + ink; }); target.addEventListener("blur", () => { target.style.outline = "none"; });
    target.addEventListener("click", () => { activeExample = ex; selection.textContent = LBL[ex] + ": choose its store below."; for (const b of choices.children) b.setAttribute("aria-pressed", String(b.textContent === LBL[ex])); target.setAttribute("aria-pressed", "true"); for (const other of objectTargets) if (other.target !== target) other.target.setAttribute("aria-pressed", "false"); });
    target.setAttribute("aria-pressed", "false"); host.append(target); objectTargets.push({ target, tok });
  }
  onFrame(() => {
    const hr = host.getBoundingClientRect();
    for (const { target, tok } of objectTargets) {
      tok.updateWorldMatrix(true, true); const box = new THREE.Box3().setFromObject(tok), points = [];
      for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) points.push(V(x,y,z).project(S.camera));
      const xs = points.map(p => (p.x+1)*hr.width/2), ys = points.map(p => (1-p.y)*hr.height/2), left = (Math.min(...xs) + Math.max(...xs)) / 2 - 22, top = (Math.min(...ys) + Math.max(...ys)) / 2 - 22, width = 44, height = 44;
      target.style.left = left + "px"; target.style.top = top + "px"; target.style.width = width + "px"; target.style.height = height + "px";
    }
  });

  // falling book on a shelf (book-Earth system)
  const book = prop("book"); book.scale.setScalar(1.25);
  const H = 2.6; book.position.set(5.3, H, 0.5); scene.add(book);
  const shelf = toon(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.6)), "#B58B60"); shelf.position.set(5.7, H - 0.04, 0.5); scene.add(shelf);
  for (const dx of [-0.38, 0.38]) { const leg = toon(new THREE.Mesh(new THREE.BoxGeometry(0.06, H - 0.07, 0.06)), "#8C6A48"); leg.position.set(5.7 + dx, (H - 0.07) / 2, 0.75); scene.add(leg); }
  shelf.userData.label = T("lbl_shelf", "raised shelf"); shelf.userData.labelPos = "right";
  // clear vertical drop corridor (dashed, unshadowed) and the falling-book transfer: blue gravitational narrows into cyan kinetic
  const dash = new THREE.LineDashedMaterial({ color: ink, dashSize: 0.08, gapSize: 0.06 });
  for (const dx of [-0.35, 0.35]) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(5.3 + dx, H, 0.5), V(5.3 + dx, 0, 0.5)]), dash); ln.computeLineDistances(); ln.userData.noFit = true; scene.add(ln); }
  const gRib = ribbon(THREE, scene, [V(4.75, H, 0.5), V(4.75, H / 2, 0.5), V(4.75, 0.1, 0.5)], col("gravitational"), { width: 0.16 });
  const kRib = ribbon(THREE, scene, [V(4.75, H, 0.52), V(4.75, H / 2, 0.52), V(4.75, 0.1, 0.52)], col("kinetic"), { width: 0.001 });
  gRib.mesh.userData.label = T("lbl_gpe", "gravitational"); gRib.mesh.userData.labelPos = "left"; gRib.mesh.userData.labelPosMobile = "none"; gRib.mesh.userData.labelAnchor = V(4.75, H * 0.8, 0.5);
  const thr = [[V(5.3, 0.1, 0.5), V(5.0, 0.3, 0.9), V(4.7, 0.35, 1.2), "book thermal"], [V(5.3, 0.02, 0.5), V(5.7, 0.02, 0.9), V(6.0, 0.02, 1.2), "floor thermal"], [V(5.3, 0.15, 0.5), V(5.6, 0.5, 0.2), V(5.9, 0.7, 0.0), "air thermal"]].map(([a2, b2, c2, nm]) => { const r = ribbon(THREE, scene, [a2, b2, c2], col("thermal"), { width: 0.001 }); r.mesh.userData.label = T("lbl_" + nm.replace(" ", "_"), nm); r.mesh.userData.labelPos = "below"; r.mesh.userData.labelAnchor = c2; r.mesh.visible = false; return r; });
  const snd = ribbon(THREE, scene, [V(5.3, 0.2, 0.5), V(6.0, 0.45, 0.6), V(6.8, 0.6, 0.7)], palette.sound[M], { width: 0.001 }); snd.mesh.userData.label = T("lbl_sound", "sound, leaves the system"); snd.mesh.userData.labelPos = "right"; snd.mesh.userData.labelAnchor = V(6.8, 0.6, 0.7); snd.mesh.visible = false;
  const release = toon(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.3)), "#E8C21A"); release.position.set(5.75, H + 0.03, 0.85); release.userData.label = T("lbl_release", "release tab"); release.userData.labelPos = "above-right"; scene.add(release);
  const P = packets(THREE, scene);
  if (small) for (const o of scene.children) { if (o === lead || o.isLight) continue; const c = new THREE.Box3().setFromObject(o).getCenter(V(0, 0, 0)); if (c.x > 4.3) { o.position.x -= 3.2; o.position.z -= 8.0; } } // book corridor behind the 4-wide grid

  const ui = panel(host, dark, T("takeaway"), T("question", "Where is the book's energy just before impact, and after it comes to rest?"));
  inspector(host, ["book-Earth system", "Stores are accounting categories, not substances."], ["Energy is transferred, not destroyed."]);
  jasper(host, "stores", T("jasperCard"));
  ui.append(el("div", null, T("boundary")), el("div", null, T("jarsNote")));
  const choices = el("div"); choices.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%";
  const selection = el("p"); selection.textContent = "Select an object, then choose its store.";
  for (const [ex] of tokens) { const b = el("button", null, LBL[ex]); b.type = "button"; b.dataset.noReveal = "1"; b.style.cssText = "min-height:44px;min-width:44px;font-size:16px"; b.setAttribute("aria-pressed", "false"); b.onclick = () => { activeExample = ex; for (const x of choices.children) x.setAttribute("aria-pressed", String(x === b)); selection.textContent = LBL[ex] + ": choose its store below."; }; choices.append(b); }
  const targets = el("div"); targets.style.cssText = choices.style.cssText;
  for (const store of STORES) { const b = el("button", null, T("store_" + store, store)); b.dataset.noReveal = "1"; b.style.cssText = "min-height:44px;min-width:44px;font-size:16px"; b.onclick = () => { if (!activeExample) return; const correct = EXAMPLES[activeExample] === store; selection.textContent = correct ? LBL[activeExample] + " → " + T("store_" + store, store) : "Try another store for " + LBL[activeExample] + "."; if (correct) filled.add(activeExample); }; targets.append(b); }
  ui.append(choices, selection, targets);
  const pr = predict(ui, "e3d-stores", T("predict"), text.choices);
  const go = el("button", null, T("release", "Release the book")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(el("p", null, T("footer")));
  pr.onPick(() => { go.disabled = false; });
  let t = -1;
  go.addEventListener("click", () => { thr.forEach((r) => { r.mesh.visible = false; }); snd.mesh.visible = false; t = 0; meterScale(scene, (9.8 * H).toFixed(2), "J (1 kg book)"); go.disabled = true; book.position.y = H; fb.textContent = pr.picked() === (text.correct ?? 2) ? T("right") : T("wrong"); ex.show(); });
  onFrame((dt) => {
    P.step(dt);
    if (t < 0) return;
    t += dt * (S.reduce ? 0.7 : 0.35); // slow motion so the fall itself can be seen
    const fallT = Math.sqrt((2 * H) / 9.8), s = Math.min(1, t / fallT), sh = bookFall(t < fallT ? s : 1);
    book.position.y = Math.max(0.08, H - 0.5 * 9.8 * t * t);
    jars.gravitational.set(sh.gravitational); jars.kinetic.set(sh.kinetic); jars.thermal.set(sh.dissipated);
    gRib.set(0.16 * sh.gravitational + 0.001); kRib.set(0.16 * sh.kinetic + 0.001);
    const rest = sh.dissipated > 0; for (const r of thr) { r.mesh.visible = rest; if (rest) r.set(0.16 * 0.32); } snd.mesh.visible = rest; if (rest) snd.set(0.012);
    if (t > fallT + 1) { t = -1; go.disabled = false; }
  });
  return { ...S, dispose() { objectTargets.forEach(({target}) => target.remove()); for (const [n, height, minHeight, aspectRatio] of originalFrames) { n.style.height = height; n.style.minHeight = minHeight; n.style.aspectRatio = aspectRatio; } leaderSvg.remove(); S.dispose(); ui.remove(); labels.forEach((l) => l.d.remove()); } };
}

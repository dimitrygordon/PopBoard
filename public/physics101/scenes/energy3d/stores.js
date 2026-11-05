// Every Joule Sim 1: energy stores board plus one falling-book chain (Tesla C1). Words from text.
import { createEnergyScene, toon, palette, isDark } from "./core.js";
import { STORES, bookFall } from "./physics.js";
import { panel, predict, explain, jar, packets, el } from "./ui.js";

const EXTRA = { magnetic: { light: "#6B2FA3", dark: "#9E66D1" }, electrostatic: { light: "#E8C21A", dark: "#F5D84F" }, nuclear: { light: "#C9971C", dark: "#E6B84A" } };
// example token -> its store
const EXAMPLES = { bicycle: "kinetic", book: "gravitational", spring: "elastic", drink: "thermal", battery: "chemical", magnets: "magnetic", balloon: "electrostatic", sun: "nuclear" };

export function mountStores(host, text = {}, opts = {}) {
  const T = (k, d = "") => text[k] ?? d;
  const S = createEnergyScene(host, { camera: [0, 5, 10], target: [0, 1, 0], ...opts });
  if (!S) return null;
  const { THREE, scene, addDrag, onFrame } = S;
  const dark = isDark(), M = dark ? "dark" : "light", ink = dark ? "#EDE6D6" : "#2B2622";
  const col = (k) => (palette[k] || EXTRA[k])[M];
  const jars = {}, JX = (i) => -4.2 + i * 1.2;
  STORES.forEach((k, i) => { jars[k] = jar(THREE, scene, toon, JX(i), -1.5, col(k), ink); });

  // example tokens, each dragged along x onto its own jar
  const filled = new Set();
  Object.entries(EXAMPLES).forEach(([ex, store], i) => {
    const tok = toon(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5)), col(store));
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ visible: false })); tok.add(hit);
    const home = JX((i * 3) % 8); tok.position.set(home, 0.25, 1.2); scene.add(tok);
    addDrag(tok, { axis: "x", min: -4.6, max: 4.6, onMove: (x) => {
      const near = STORES.findIndex((_, j) => Math.abs(JX(j) - x) < 0.3);
      if (near >= 0 && STORES[near] === store && !filled.has(ex)) { filled.add(ex); jars[store].set(0.5); fb.textContent = T("match").replace("{ex}", T("ex_" + ex, ex)).replace("{store}", T("store_" + store, store)); }
    } });
  });

  // falling book on a shelf (book-Earth system)
  const book = toon(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.45)), col("gravitational"));
  const H = 2.6; book.position.set(5.3, H, 0.5); scene.add(book);
  const shelf = toon(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6)), dark ? "#6F665A" : "#C9B48E"); shelf.position.set(5.7, H - 0.12, 0.5); scene.add(shelf);
  const P = packets(THREE, scene);

  const ui = panel(host, dark);
  ui.append(el("div", null, T("boundary")), el("div", null, T("jarsNote")));
  const pr = predict(ui, "e3d-stores", T("predict"), text.choices);
  const go = el("button", null, T("release", "Release the book")); go.disabled = true; ui.appendChild(go);
  const fb = el("p"); ui.appendChild(fb);
  const ex = explain(ui, T("explainBtn", "Explain"), T("explain"));
  ui.appendChild(el("p", null, T("footer")));
  pr.onPick(() => { go.disabled = false; });
  let t = -1;
  go.addEventListener("click", () => { t = 0; go.disabled = true; book.position.set(5.3, H, 0.5); fb.textContent = pr.picked() === (text.correct ?? 2) ? T("right") : T("wrong"); ex.show(); });
  onFrame((dt) => {
    P.step(dt);
    if (t < 0) return;
    t += dt * (S.reduce ? 2 : 1);
    const fallT = Math.sqrt((2 * H) / 9.8), s = Math.min(1, t / fallT), sh = bookFall(t < fallT ? s : 1);
    book.position.y = Math.max(0.08, H - 0.5 * 9.8 * t * t);
    jars.gravitational.set(sh.gravitational * 0.8); jars.kinetic.set(sh.kinetic * 0.8); jars.thermal.set(sh.dissipated * 0.8);
    if (!S.reduce && t < fallT && Math.random() < 0.2) P.send(jars.gravitational.top(), jars.kinetic.top(), col("kinetic"));
    if (t >= fallT && t - dt < fallT) for (let i = 0; i < (S.reduce ? 1 : 5); i++) P.send(book.position, jars.thermal.top(), col("thermal"));
    if (t > fallT + 1) { t = -1; go.disabled = false; }
  });
  return { ...S, dispose() { S.dispose(); ui.remove(); } };
}

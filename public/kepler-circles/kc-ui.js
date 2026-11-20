import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadKeplerData, presetFromSearch, bodyOrbit, galilean, ellipsePoints,
  emptyFocus, assetCandidates, loadAssetMap, reducedMotion
} from "./kc-model.js";
import { createScene, circlePoints } from "./kc-scene.js";

const $ = (id) => document.getElementById(id);
const GREEN = 0x4caf50;

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

const data = await loadKeplerData();
const preset = presetFromSearch(data.lessons) || { id: "default", mode: "circles" };
const scene = await createScene($("scene"));
await loadAssetMap();
await scene.trySkybox(assetCandidates("skybox"));
if ($("assetFlag")) {
  $("assetFlag").textContent = "Meshes load from gravity-orbits by filename. If a file is missing, a placeholder is shown.";
}

let cut = false;
let angle = 0.7; // radians from +X, counterclockwise; start off the axis so both arrows are on screen
const RADIUS = 1.6;
let vArrow = null, fArrow = null, mass = null;
let stringLine = null;
let loadGen = 0;
const BODY_ASSET = { Earth: "earth", Mars: "mars", "1P/Halley": "comet", Halley: "comet" };


await applyPreset(preset);
wire();

function wire() {
  $("cutBtn")?.addEventListener("click", cutPull);
  $("resetBtn")?.addEventListener("click", () => { cut = false; angle = 0; applyPreset(preset); });
  $("modeCircles")?.addEventListener("click", () => openMode("circles"));
  $("modeEllipses")?.addEventListener("click", () => openMode("ellipses"));
  $("modeMoons")?.addEventListener("click", () => openMode("moons"));
  $("zoomInner")?.addEventListener("click", () => setupEllipses(preset, "inner"));
  $("zoomFull")?.addEventListener("click", () => setupEllipses(preset, "full"));
}

function openMode(mode) {
  applyPreset({ ...preset, mode, id: preset.id });
}

async function applyPreset(p) {
  const my = ++loadGen;
  cut = false;
  $("presetName").textContent = titleFor(p);
  $("note").textContent = noteFor(p);
  const mode = p.mode || "circles";
  $("circleControls").hidden = mode !== "circles";
  if ($("ellipseControls")) $("ellipseControls").hidden = mode !== "ellipses";
  $("cutBtn").disabled = false;
  syncModeButtons(mode);
  scene.clear();
  scene.stopTick();
  if (mode === "circles") await setupCircles(p, my);
  else if (mode === "moons") await setupMoons(my);
  else await setupEllipses(p, "inner", my);
}

async function setupCircles(_p, my = loadGen) {
  scene.setCamera([0, 0.15, innerWidth <= 600 ? 10 : 7.0]);
  scene.addLine(circlePoints(RADIUS), 0x3a3a3a);
  // Center (inward pull points here). No outward arrow is ever created.
  scene.addDot({ x: 0, y: 0, z: 0 }, 0.06, 0xcccccc);
  const stopperGltf = await scene.tryGlb(assetCandidates("stopper"));
  if (my !== loadGen) return;
  if (stopperGltf) {
    mass = scene.addModel(stopperGltf.scene, { p: { x: RADIUS, y: 0, z: 0 }, visualSize: 0.14 });
  } else {
    mass = scene.addDot({ x: RADIUS, y: 0, z: 0 }, 0.1, GREEN);
  }
  stringLine = scene.addDynamicLine(0xcccccc);
  stringLine.userData.setEnds({ x: 0, y: 0, z: 0 }, { x: RADIUS, y: 0, z: 0 });
  placeVectors(0);
  const omega = 0.7; // display rate only, not a published lab number
  if (reducedMotion()) {
    scene.stopTick();
    $("status").textContent = "Motion is paused (reduced motion). Velocity is tangent. The force arrow points inward. Cut the inward pull to see the straight path.";
    return;
  }
  scene.onTick((dt) => {
    if (cut) {
      // Straight line along the tangent at the cut angle: velocity was +theta-hat (CCW).
      const th = angle;
      const speed = omega * RADIUS;
      mass.userData.s = (mass.userData.s || 0) + speed * dt;
      const x = RADIUS * Math.cos(th) - mass.userData.s * Math.sin(th);
      const y = RADIUS * Math.sin(th) + mass.userData.s * Math.cos(th);
      mass.position.set(x, y, 0);
      faceInward(mass, x, y);
      if (stringLine) stringLine.visible = false;
      if (vArrow) {
        scene.root.remove(vArrow);
        vArrow = scene.addArrow({ x, y, z: 0 }, { x: x - 0.9 * Math.sin(th), y: y + 0.9 * Math.cos(th), z: 0 }, GREEN);
      }
      return;
    }
    angle += omega * dt;
    const x = RADIUS * Math.cos(angle);
    const y = RADIUS * Math.sin(angle);
    mass.position.set(x, y, 0);
    faceInward(mass, x, y);
    if (stringLine) stringLine.userData.setEnds({ x: 0, y: 0, z: 0 }, { x, y, z: 0 });
    placeVectors(angle);
  });
  $("status").textContent = "Velocity is along the tangent. The force arrow points toward the center. There is no outward force.";
}

function placeVectors(th) {
  if (vArrow) scene.root.remove(vArrow);
  if (fArrow) scene.root.remove(fArrow);
  const x = RADIUS * Math.cos(th);
  const y = RADIUS * Math.sin(th);
  // CCW tangent: (-sin, cos). Inward force: toward origin, (-x, -y).
  vArrow = scene.addArrow({ x, y, z: 0 }, { x: x - 0.9 * Math.sin(th), y: y + 0.9 * Math.cos(th), z: 0 }, GREEN);
  if (!cut) {
    fArrow = scene.addArrow({ x, y, z: 0 }, { x: x * 0.35, y: y * 0.35, z: 0 }, 0xcccccc);
  } else {
    fArrow = null;
  }
}

function cutPull() {
  cut = true;
  $("cutBtn").disabled = true;
  if (fArrow) { scene.root.remove(fArrow); fArrow = null; }
  if (stringLine) stringLine.visible = false;
  $("status").textContent = "The inward pull is gone. The stopper goes straight along the tangent (path C).";
}

async function setupEllipses(p, zoom = "inner", my = ++loadGen) {
  const names = p.bodies || ["Earth", "Mars", "Halley"];
  const orbits = names.map((n) => bodyOrbit(data.kepler, n)).filter(Boolean);
  // Default view frames Earth and Mars clearly. The comet path is still drawn
  // to the same scale and leaves the screen; "Full comet orbit" pulls back.
  const innerFit = 2.5; // AU, past Mars aphelion
  const fullFit = Math.max(...orbits.map((o) => o.a * (1 + o.e)), innerFit);
  const fit = zoom === "full" ? fullFit : innerFit;
  const scale = 8 / fit;
  scene.clear();
  const narrow = (typeof innerWidth === "number" && innerWidth <= 600);
  scene.setCamera(zoom === "full"
    ? (narrow ? [0, 0, 44] : [0, 0, 20])
    : (narrow ? [0, 0, 32] : [0, 0, 14]));

  const sunSize = zoom === "full" ? 0.36 : 0.44;
  const sunGltf = await scene.tryGlb(assetCandidates("sun"));
  if (my !== loadGen) return;
  if (sunGltf) scene.addModel(sunGltf.scene, { p: { x: 0, y: 0, z: 0 }, visualSize: sunSize });
  else scene.addDot({ x: 0, y: 0, z: 0 }, zoom === "full" ? 0.18 : 0.22, 0xcccccc);
  const bodySize = zoom === "full" ? 0.2 : 0.32;
  for (const o of orbits) {
    scene.addLine(ellipsePoints(o.a, o.e), o.color, scale);
    const peri = { x: o.a * (1 - o.e), y: 0, z: 0 };
    const kind = BODY_ASSET[o.name] || BODY_ASSET[names.find((n) => bodyOrbit(data.kepler, n)?.name === o.name)];
    const isComet = kind === "comet";
    const gltf = kind ? await scene.tryGlb(assetCandidates(kind)) : null;
    if (my !== loadGen) return;
    if (gltf) scene.addModel(gltf.scene, { p: peri, visualSize: isComet ? bodySize * 1.1 : bodySize, scale, comet: isComet });
    else scene.addDot(peri, zoom === "full" ? 0.1 : 0.16, o.color, scale);
    if (p.drawEmptyFocus !== false) scene.addEmptyFocus(emptyFocus(o.a, o.e), scale);
  }
  $("zoomInner")?.setAttribute("aria-pressed", String(zoom === "inner"));
  $("zoomFull")?.setAttribute("aria-pressed", String(zoom === "full"));
  $("status").textContent = zoom === "full"
    ? "Full comet orbit at the same scale. The Sun sits at one focus. The far empty ring is the other focus."
    : "Earth (e = 0.017) looks like a circle. Mars (e = 0.093) is only slightly oval. The comet is the stretched path leaving the frame. The Sun sits at one focus. The other focus is empty. Planet and comet sizes are not to scale; the orbits are.";
}

async function setupMoons(my = ++loadGen) {
  const moons = galilean(data.kepler);
  const maxA = Math.max(...moons.map((m) => m.a));
  const scale = 5 / maxA;
  scene.setCamera([0, 4.5, 10], [0, 0, 0]);
  const jup = await scene.tryGlb(assetCandidates("jupiter"));
  if (my !== loadGen) return;
  if (jup) scene.addModel(jup.scene, { p: { x: 0, y: 0, z: 0 }, radius: 0.55 });
  else scene.addDot({ x: 0, y: 0, z: 0 }, 0.55, 0xc8b48a);
  const moonAsset = { Io: "io", Europa: "europa", Ganymede: "ganymede", Callisto: "callisto" };
  for (const m of moons) {
    scene.addLine(ellipsePoints(m.a, m.e), 0x4caf50, scale);
    const kind = moonAsset[m.name];
    const vis = Math.max(0.07, (m.radius || 0.03) * 8);
    const pos = { x: m.a * (1 - m.e), y: 0, z: 0 };
    const gltf = kind ? await scene.tryGlb(assetCandidates(kind)) : null;
    if (my !== loadGen) return;
    if (gltf) scene.addModel(gltf.scene, { p: pos, visualSize: vis, scale });
    else scene.addDot(pos, Math.max(0.06, m.radius * 8), 0xcccccc, scale);
  }
  $("status").textContent = "Jupiter's four Galilean moons, nearly circular. Periods and distances come from kepler.json.";
}

function faceInward(obj, x, y) {
  if (!obj || typeof scene.pointAxis !== "function") return;
  const len = Math.hypot(x, y);
  if (len < 1e-8) return;
  // Stopper string_attach is along +Y in the GLB; point that axis inward.
  scene.pointAxis(obj, { x: 0, y: 1, z: 0 }, { x: -x / len, y: -y / len, z: 0 });
}

function titleFor(p) {
  if (p.id === "l2-s5") return "Kepler and Circles · Lesson 2";
  if (p.id === "l3-s6") return "Kepler and Circles · Lesson 3";
  if (p.id === "jupiter-moons") return "Kepler and Circles · Jupiter's moons";
  return "Kepler and Circles";
}

function noteFor(p) {
  if (p.id === "l2-s5") return "Watch the tangent velocity arrow and the inward force arrow, then cut the inward pull. The module never draws an outward force.";
  if (p.id === "l3-s6") return "Earth, Mars, and a comet, with orbits to scale. Look first, then check which path looks almost like a circle.";
  return "Circular motion and Kepler ellipses.";
}

function syncModeButtons(mode) {
  for (const [id, m] of [["modeCircles", "circles"], ["modeEllipses", "ellipses"], ["modeMoons", "moons"]]) {
    const b = $(id);
    if (!b) continue;
    b.setAttribute("aria-pressed", String(mode === m));
  }
}

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadOrbitData, constants, orbitEntry, gAt, periodAt, vCirc, vEsc,
  samplePath, placePath, presetFromSearch, l1Speeds, l5ShotSpeeds,
  formatNum, formatPeriod, assetCandidates, loadAssetMap, reducedMotion
} from "./ol-model.js";
import { createScene } from "./ol-scene.js";

const $ = (id) => document.getElementById(id);

const CRAFT_VISUAL = { ISS: 0.09, Hubble: 0.055, GPS: 0.07, GEO: 0.08 };
const CRAFT_ASSET = { ISS: "iss", Hubble: "hubble", GPS: "gps", GEO: "geo" };
const MOON_SCALE = 1737.4 / 6380;
const SAT_PHASE = { ISS: 0, Hubble: 1.15, Moon: 0.7, GPS: 2.1, GEO: 3.4 };


$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

const data = await loadOrbitData();
const { GM, R } = constants(data.orbits);
const h = data.lessons.cannon.altitude_m;
const preset = presetFromSearch(data.lessons) || { id: "default", mode: "cannon", showReadouts: true, readoutToggle: true, showSatellites: true, lockOrbitEscape: false };
const l1 = l1Speeds(data.lessons);

const scene = await createScene($("scene"));
await loadAssetMap();
const loadCannon = (preset.mode || "cannon") === "cannon";
const cannonAnchor = { x: R + h, y: 0, z: 0 };
// Placeholder cannon sits on the surface of the unit sphere at the launch radius.
const launchR = (R + h) / R;
let satGen = 0;
// Wire before the long loads so early taps on Fire, shots, and presets are not dropped.
wire();
await Promise.all([
  scene.trySkybox(assetCandidates("skybox")),
  scene.tryEarth(assetCandidates("earth")),
  loadCannon ? scene.tryCannon(assetCandidates("cannon")) : Promise.resolve(false)
]);

await applyPreset(preset);
layoutHud();
requestAnimationFrame(() => requestAnimationFrame(layoutHud));

function layoutHud() {
  const root = document.documentElement;
  const hud = document.querySelector(".hud");
  if (hud) root.style.setProperty("--ol-hud", `${Math.ceil(hud.getBoundingClientRect().bottom) + 8}px`);
  const dock = document.querySelector(".dock");
  if (dock) root.style.setProperty("--ol-ctl", `${Math.ceil(dock.getBoundingClientRect().height)}px`);
}
addEventListener("resize", layoutHud);
const hudEl = document.querySelector(".hud");
if (hudEl) new ResizeObserver(layoutHud).observe(hudEl);
const dockEl = document.querySelector(".dock");
if (dockEl) new ResizeObserver(layoutHud).observe(dockEl);


function wire() {
  $("resetViewBtn")?.addEventListener("click", () => scene.resetView());
  for (const d of document.querySelectorAll(".hud details")) {
    d.addEventListener("toggle", () => {
      if (!d.open) return;
      for (const o of document.querySelectorAll(".hud details")) if (o !== d) o.open = false;
    });
  }
  $("fireBtn")?.addEventListener("click", () => fire(Number($("speed").value)));
  $("speed")?.addEventListener("input", syncSpeedLabel);
  $("readoutToggle")?.addEventListener("click", () => {
    const on = $("readouts").hidden;
    $("readouts").hidden = !on;
    $("readoutToggle").setAttribute("aria-pressed", String(on));
    $("readoutToggle").textContent = on ? "Hide g and period" : "Show g and period";
  });
  $("shots").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-v]");
    if (!btn) return;
    $("speed").value = btn.dataset.v;
    syncSpeedLabel();
    fire(Number(btn.dataset.v));
  });
  $("sats").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sat]");
    if (!btn) return;
    showSatellite(btn.dataset.sat);
  });
}

async function applyPreset(p) {
  $("presetName").textContent = titleFor(p);
  $("note").textContent = noteFor(p);
  $("status").textContent = teaserFor(p);
  const detail = $("detail");
  if (detail) { detail.hidden = true; detail.textContent = ""; }
  const cannonMode = (p.mode || "cannon") === "cannon";
  $("cannonControls").hidden = !cannonMode;
  $("satControls").hidden = p.showSatellites === false && p.mode !== "scale";
  $("readoutToggle").hidden = !p.readoutToggle;
  // Keep g and period off until a satellite is chosen, so a blank panel does not appear on the cannon start.
  const readoutsOn = !!p.showReadouts && p.mode === "scale";
  $("readouts").hidden = !readoutsOn;
  $("readoutToggle").setAttribute("aria-pressed", String(!$("readouts").hidden));
  $("readoutToggle").textContent = $("readouts").hidden ? "Show g and period" : "Hide g and period";

  if (cannonMode) {
    scene.setCamera(p.lockOrbitEscape ? "cannon-close" : "cannon-wide");
    const max = p.lockOrbitEscape ? (p.speedMax_m_s ?? l1.cap) : Math.ceil(vEsc(R + h, GM));
    const shots = p.lockOrbitEscape ? (p.suggested_m_s || [l1.slow]) : l5ShotSpeeds(data.lessons, GM, R, h).map((s) => Math.round(s.v));
    const start = p.speedDefault_m_s ?? p.suggested_m_s?.[0] ?? shots[0] ?? 0;
    $("speed").min = 0;
    $("speed").max = max;
    // L5 must be able to hold the exact circular speed. A step of 10 snaps 7,893 m/s
    // to 7,890 m/s, which is still a long lob.
    $("speed").step = p.lockOrbitEscape ? 10 : "any";
    $("speed").value = start;
    fillShots(p, max);
    syncSpeedLabel();
    scene.setCannonVisible(true, launchR, scene.loaded.cannon ? 1 : (p.lockOrbitEscape ? 0.05 : 1));
    scene.setProjectileAt(cannonAnchor, R);
    const muzzle = scene.getMuzzle();
    if (muzzle.loaded) scene.setProjectileAt({ x: muzzle.x * R, y: muzzle.y * R, z: muzzle.z * R }, R);
    if (p.autoPath === "slow") fire(l1.slow, { announce: false });
    hide("satControls", p.showSatellites === false);
    if (p.showSatellites) fillSats(p.satelliteKeys || ["ISS", "GPS", "GEO"]);
  } else {
    scene.setCannonVisible(false);
    $("cannonControls").hidden = true;
    $("satControls").hidden = false;
    const bodies = p.bodies || ["ISS"];
    // Earth + ISS (and Hubble) in frame at every width. Moon is a pull-back, not the start.
    scene.setCamera("scale-iss");
    fillSats(bodies);
    const first = bodies[0];
    await showSatellite(first, { all: true, bodies });
    layoutHud();
  }
}

function fillShots(p) {
  const box = $("shots");
  box.innerHTML = "";
  if (p.lockOrbitEscape) {
    const labels = p.suggested_labels || ["Slow", "Faster"];
    const speeds = p.suggested_m_s || [l1.slow, l1.fast];
    speeds.forEach((v, i) => box.append(shotBtn(labels[i], v)));
    return;
  }
  l5ShotSpeeds(data.lessons, GM, R, h).forEach((s) => box.append(shotBtn(s.label, s.v)));
}

function shotBtn(label, v) {
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.v = String(v);
  b.textContent = label;
  return b;
}

function fillSats(keys) {
  const box = $("sats");
  box.innerHTML = "";
  for (const key of keys) {
    const entry = orbitEntry(data.orbits, key === "Hubble" ? "Hubble" : key);
    if (!entry && key !== "Hubble") continue;
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.sat = key;
    b.textContent = key;
    box.append(b);
  }
}

function restoreCannonView() {
  const p = preset;
  if ((p.mode || "cannon") !== "cannon") return;
  scene.setCannonVisible(true, launchR, scene.loaded.cannon ? 1 : (p.lockOrbitEscape ? 0.05 : 1));
  scene.setCamera(p.lockOrbitEscape ? "cannon-close" : "cannon-wide");
}

function fire(v, opts = {}) {
  const p = preset;
  restoreCannonView();
  if (p.lockOrbitEscape && v > (p.speedMax_m_s ?? l1.cap) + 1e-6) v = p.speedMax_m_s ?? l1.cap;
  const path = samplePath(v, h, GM, R);
  const pose = scene.getMuzzle();
  // L1 close-up: stretch the 12/24 km arcs so they read next to the (not-to-scale) cannon.
  const arcScale = p.lockOrbitEscape ? 28 : 1;
  const pts = placePath(path.points, R, pose, arcScale);
  scene.setPath(pts, R);
  const loops = path.kind === "circular" || path.kind === "elliptical" || path.kind === "orbit";
  const seconds = reducedMotion() ? 0 : (loops ? 8 : path.kind === "escape" ? 5 : 2.4);
  scene.playAlong(pts, R, seconds, {
    loop: loops,
    impact: path.kind === "lob" || path.kind === "drop"
  });
  if (opts.announce !== false) $("status").textContent = statusFor(path, v);
  // Cannon-mode readouts, if visible, describe this launch radius, not a satellite.
  if ((p.mode || "cannon") === "cannon" && !$("readouts").hidden) {
    const r = R + h;
    setReadouts({ name: "Launch point", r, optional: true, note: "Values at the cannon altitude, not a published satellite." });
  }
}

async function showSatellite(key, opts = {}) {
  const my = ++satGen;
  const entry = orbitEntry(data.orbits, key === "Hubble" ? "Hubble" : key);
  if (!entry) { $("status").textContent = `${key} is not in orbits.json.`; return; }
  scene.setCannonVisible(false);
  scene.clearSatellites();
  const keys = opts.all ? (opts.bodies || [key]) : [key];
  let maxR = 0;
  for (const k of keys) {
    const e = orbitEntry(data.orbits, k === "Hubble" ? "Hubble" : k);
    if (!e) continue;
    const rr = e.r_m / R;
    maxR = Math.max(maxR, rr);
    scene.addOrbitRing(rr, k === key ? 0x4caf50 : 0x666666);
    const phase = SAT_PHASE[k] || 0;
    if (k === "Moon") {
      await scene.addMoon(assetCandidates("moon"), rr, MOON_SCALE, phase);
    } else {
      const kind = CRAFT_ASSET[k];
      if (kind) await scene.addCraft(assetCandidates(kind), rr, CRAFT_VISUAL[k] || 0.05, phase);
      else scene.addBodyMarker(rr, k, k === key ? 0x4caf50 : 0xcccccc, phase);
    }
    if (my !== satGen) return;
  }
  if (my !== satGen) return;
  setReadouts(entry);
  $("status").textContent = shortScaleCaption(entry, key, opts);
  const detail = $("detail");
  if (detail) {
    detail.hidden = false;
    detail.textContent = fullScaleCaption(entry, key, opts);
  }

  if (key === "Moon") scene.setCamera("scale-wide");
  else if (maxR > 1.5) scene.setCamera("scale-fit", maxR * 1.18);
  else scene.setCamera("scale-iss");
}

function setReadouts(entry) {
  const r = entry.r_m;
  const g = entry.g_N_per_kg ?? (r ? gAt(r, GM) : NaN);
  const T = entry.period_s_computed ?? (r ? periodAt(r, GM) : NaN);
  $("readG").textContent = Number.isFinite(g) ? `${g.toFixed(2)} N/kg` : "—";
  $("readT").textContent = entry.period_h != null ? `${Number(entry.period_h).toFixed(2)} h` : formatPeriod(T);
  $("readAlt").textContent = entry.altitude_km != null ? `${formatNum(entry.altitude_km, 0, "km")} up` : (r ? `${formatNum((r - R) / 1000, 0, "km")} up` : "—");
  $("readName").textContent = entry.name || "";
  $("readWarn").hidden = !entry.optional;
}

function syncSpeedLabel() {
  const el = $("speed");
  const v = Number(el.value);
  // L5 student-facing task should not label the circular-orbit speed.
  $("speedVal").textContent = `${Math.round(v)} m/s`;
  const min = Number(el.min) || 0;
  const max = Number(el.max) || 100;
  const pct = max === min ? 0 : ((v - min) / (max - min)) * 100;
  el.style.setProperty("--slide", `${pct}%`);
}

// L1 shows whole seconds so 40.5 vs 40.6 s can't read as "faster stays up longer".
function airTimeDecimals() {
  return Number.isInteger(preset.airTimeDecimals) ? preset.airTimeDecimals : 1;
}

function statusFor(path, v) {
  if (path.kind === "lob" || path.kind === "drop") {
    return `Lands after ${path.t.toFixed(airTimeDecimals())} s, ${ (path.range / 1000).toFixed(1) } km downrange.`;
  }
  if (path.kind === "escape") return "This shot does not come back.";
  return "This shot never lands.";
}

function titleFor(p) {
  if (p.id === "l1-s8") return "Orbit Lab · Lesson 1";
  if (p.id === "l4-s6") return "Orbit Lab · Lesson 4";
  if (p.id === "l5-s8") return "Orbit Lab · Lesson 5";
  if (p.id === "l5-s12") return "Orbit Lab · Lesson 5, S12";
  return "Orbit Lab";
}

function noteFor(p) {
  if (p.id === "l1-s8") return "Stay on short, slow lobs that hit the ground. The faster shot is twice the slow shot. Orbit and escape are locked out. The mountain is not to scale.";
  if (p.id === "l4-s6") return "True-scale Earth. The ISS sits just above the surface. Use what you see, not a readout, for the S6 task. g and period stay hidden unless you choose to show them later. The station and Hubble are enlarged, not to scale; their orbits are.";
  if (p.id === "l5-s8") return "Fire horizontally at five rising speeds and find the shot that never lands. Satellite presets are there for the later S12 check, not to skip the calculations. The mountain is not to scale.";
  if (p.id === "l5-s12") return "ISS, GPS, and GEO to scale, after you have done the S12 calculations.";
  return "Newton's cannon and Earth-orbit presets.";
}

function teaserFor(p) {
  if (p.id === "l1-s8") return "Short, slow lobs that hit the ground. Faster is twice the slow shot.";
  if (p.id === "l4-s6") return "ISS at 400 km. Orbit to scale; station enlarged.";
  if (p.id === "l5-s8") return "Fire at five rising speeds. Find the shot that never lands.";
  if (p.id === "l5-s12") return "ISS, GPS, and GEO to scale.";
  return "";
}

function shortScaleCaption(entry, key, opts = {}) {
  const k = key || entry.name || "";
  if (opts.all && (opts.bodies || []).includes("Moon") && (k === "ISS" || entry.name === "ISS")) {
    return "ISS sits just above Earth. Open Moon for the true distance.";
  }
  if (k === "ISS" || entry.name === "ISS") return "ISS at 400 km. Orbit to scale; station enlarged.";
  if (k === "Hubble" || entry.name?.includes("Hubble")) return "Hubble at 480 km. Orbit to scale; telescope enlarged.";
  if (k === "Moon" || entry.name?.includes("Moon")) return "Moon at true scale. Open to compare with the ISS distance.";
  if (k === "GPS" || entry.name?.includes("GPS")) return "GPS orbit, to scale.";
  if (k === "GEO" || entry.name?.includes("Geostationary") || entry.name?.includes("GEO")) return "GEO orbit, to scale.";
  return entry.name || k || "";
}

function fullScaleCaption(entry, key, opts = {}) {
  if (opts.all && (opts.bodies || []).includes("Moon")) {
    return "The ISS sits just above Earth. Open Moon to see the true distance. Orbits are to true scale; the stations are enlarged.";
  }
  if (key === "ISS" || entry.name === "ISS") return "ISS at 400 km. The orbit is to true scale. The station is enlarged, not to scale.";
  if (key === "Hubble" || entry.name?.includes("Hubble")) return "Hubble at 480 km. Optional on this lesson. The orbit is to true scale; the telescope is enlarged, not to scale. Do not use a readout on the exit ticket.";
  return entry.name || key || "";
}

function hide(id, yes) { $(id).hidden = !!yes; }

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadOrbitData, constants, orbitEntry, gAt, periodAt, vCirc, vEsc,
  samplePath, presetFromSearch, l1Speeds, l5ShotSpeeds,
  formatNum, formatPeriod, assetCandidates, reducedMotion
} from "./ol-model.js";
import { createScene } from "./ol-scene.js";

const $ = (id) => document.getElementById(id);

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
scene.trySkybox(assetCandidates("skybox"));
scene.tryMesh(scene.earth, assetCandidates("earth"), 1);

const cannonAnchor = { x: R + h, y: 0, z: 0 };
// Placeholder cannon sits on the surface of the unit sphere at the launch radius.
const launchR = (R + h) / R;

applyPreset(preset);
wire();

function wire() {
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

function applyPreset(p) {
  $("presetName").textContent = titleFor(p);
  $("note").textContent = noteFor(p);
  $("assetFlag").hidden = false;

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
    $("speed").value = start;
    fillShots(p, max);
    syncSpeedLabel();
    scene.setCannonVisible(true, launchR, p.lockOrbitEscape ? 0.05 : 1);
    scene.setProjectileAt(cannonAnchor, R);
    if (p.autoPath === "slow") fire(l1.slow, { announce: false });
    hide("satControls", p.showSatellites === false);
    if (p.showSatellites) fillSats(p.satelliteKeys || ["ISS", "GPS", "GEO"]);
  } else {
    scene.setCamera(p.bodies?.includes("Moon") ? "scale-wide" : "scale-iss");
    $("cannonControls").hidden = true;
    $("satControls").hidden = false;
    fillSats(p.bodies || ["ISS"]);
    const first = (p.bodies || ["ISS"])[0];
    showSatellite(first, { all: true, bodies: p.bodies });
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
  l5ShotSpeeds(data.lessons, GM, R, h).forEach((s) => box.append(shotBtn(s.label, Math.round(s.v))));
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

function fire(v, opts = {}) {
  const p = preset;
  if (p.lockOrbitEscape && v > (p.speedMax_m_s ?? l1.cap) + 1e-6) v = p.speedMax_m_s ?? l1.cap;
  const path = samplePath(v, h, GM, R);
  scene.setPath(path.points, R);
  const seconds = reducedMotion() ? 0 : 1.6;
  scene.playAlong(path.points, R, seconds);
  if (opts.announce !== false) $("status").textContent = statusFor(path, v);
  // Cannon-mode readouts, if visible, describe this launch radius, not a satellite.
  if ((p.mode || "cannon") === "cannon" && !$("readouts").hidden) {
    const r = R + h;
    setReadouts({ name: "Launch point", r, optional: true, note: "Values at the cannon altitude, not a published satellite." });
  }
}

function showSatellite(key, opts = {}) {
  const entry = orbitEntry(data.orbits, key === "Hubble" ? "Hubble" : key);
  if (!entry) { $("status").textContent = `${key} is not in orbits.json.`; return; }
  scene.clearSatellites();
  const keys = opts.all ? (opts.bodies || [key]) : [key];
  for (const k of keys) {
    const e = orbitEntry(data.orbits, k === "Hubble" ? "Hubble" : k);
    if (!e) continue;
    const rr = e.r_m / R;
    scene.addOrbitRing(rr, k === key ? 0x4caf50 : 0x666666);
    scene.addBodyMarker(rr, k, k === key ? 0x4caf50 : 0xcccccc);
  }
  setReadouts(entry);
  $("status").textContent = scaleCaption(entry);
  if (entry.r_m / R > 10) scene.setCamera("scale-wide");
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
  const v = Number($("speed").value);
  // L5 student-facing task should not label the circular-orbit speed.
  $("speedVal").textContent = `${Math.round(v)} m/s`;
}

function statusFor(path, v) {
  if (path.kind === "lob" || path.kind === "drop") {
    return `Lands after ${path.t.toFixed(1)} s, ${ (path.range / 1000).toFixed(1) } km downrange.`;
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
  if (p.id === "l1-s8") return "Stay on short, slow lobs that hit the ground. The faster shot is twice the slow shot. Orbit and escape are locked out.";
  if (p.id === "l4-s6") return "True-scale Earth. The ISS sits just above the surface. Use what you see, not a readout, for the S6 task. g and period stay hidden unless you choose to show them later.";
  if (p.id === "l5-s8") return "Fire horizontally at five rising speeds and find the shot that never lands. Satellite presets are there for the later S12 check, not to skip the calculations.";
  if (p.id === "l5-s12") return "ISS, GPS, and GEO to scale, after you have done the S12 calculations.";
  return "Newton's cannon and Earth-orbit presets.";
}

function scaleCaption(entry) {
  if (entry.name === "ISS") return "ISS at 400 km, drawn to true scale.";
  if (entry.name?.includes("Hubble")) return "Hubble at 480 km. Optional on this lesson. Do not use a readout on the exit ticket.";
  return entry.name || "";
}

function hide(id, yes) { $(id).hidden = !!yes; }

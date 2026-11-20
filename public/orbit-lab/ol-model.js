// Orbit Lab model: load Tesla-verified orbits.json, lesson presets, and
// inverse-square cannon flights. Numbers shown as final come from the JSON.
// The only added teaching geometry is the schematic cannon height and the L1 cap.

import { loadAssetMap, assetCandidates, firstExisting, preferMobileSkybox } from "../gravity-orbits/go-assets.js";
export { loadAssetMap, assetCandidates, firstExisting, preferMobileSkybox };

export const ORBITS_URL = new URL("./assets/orbits.json", import.meta.url);
export const PRESETS_URL = new URL("./assets/lesson-presets.json", import.meta.url);


export function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadOrbitData() {
  const [orbits, lessons] = await Promise.all([loadJSON(ORBITS_URL), loadJSON(PRESETS_URL)]);
  return { orbits, lessons };
}

export function constants(orbits) {
  const c = orbits?.constants || {};
  const GM = Number(c.GM_E);
  const R = Number(c.R_E);
  if (!Number.isFinite(GM) || !Number.isFinite(R) || GM <= 0 || R <= 0) {
    throw new Error("orbits.json is missing Tesla-verified GM_E or R_E");
  }
  return { GM, R, g0: GM / (R * R) };
}

export function gAt(r, GM) { return GM / (r * r); }
export function periodAt(r, GM) { return 2 * Math.PI * Math.sqrt((r * r * r) / GM); }
export function vCirc(r, GM) { return Math.sqrt(GM / r); }
export function vEsc(r, GM) { return Math.sqrt((2 * GM) / r); }

export function orbitEntry(orbits, name) {
  if (orbits?.orbits?.[name]) return orbits.orbits[name];
  if (orbits?.optional_presets?.[name]) return { ...orbits.optional_presets[name], optional: true };
  if (name === "Earth" || name === "surface") return orbits.surface;
  return null;
}

/** Exact inverse-square horizontal lob from r0 = R+h to first Earth impact. */
export function flight(v, h, GM, R) {
  const r0 = R + h;
  const vc = Math.sqrt(GM / r0);
  const vesc = Math.sqrt((2 * GM) / r0);
  if (!(h > 0) || !(R > 0) || v < 0) return { kind: "invalid" };
  if (v === 0) {
    const x = R / r0;
    const t = Math.sqrt((r0 ** 3) / (2 * GM)) * (Math.acos(Math.sqrt(x)) + Math.sqrt(x * (1 - x)));
    return { kind: "drop", t, range: 0, angle: 0, vc, vesc };
  }
  const eps = (v * v) / 2 - GM / r0;
  if (eps >= 0) return { kind: "escape", t: null, range: null, angle: null, vc, vesc };
  const a = -GM / (2 * eps);
  if (v < vc) {
    const e = r0 / a - 1;
    const rPeri = a * (1 - e);
    if (rPeri >= R) return { kind: "orbit", t: null, range: null, angle: null, vc, vesc, a, e };
    const p = a * (1 - e * e);
    const c = clamp((p / R - 1) / e, -1, 1);
    const theta = Math.acos(c);
    const cosE = clamp((e + c) / (1 + e * c), -1, 1);
    const E = Math.acos(cosE);
    const n = Math.sqrt(GM / (a ** 3));
    const t = (Math.PI - E + e * Math.sin(E)) / n;
    const angle = Math.PI - theta;
    return { kind: "lob", t, range: R * angle, angle, vc, vesc, a, e };
  }
  return { kind: v > vc ? "orbit" : "circular", t: null, range: null, angle: null, vc, vesc, a };
}

export function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

export function samplePath(v, h, GM, R, steps = 192) {
  const fly = flight(v, h, GM, R);
  const r0 = R + h;
  const points = [];
  const push = (x, y, z = 0) => points.push({ x, y, z });
  // Launch from +X, velocity toward +Y (counterclockwise).
  if (fly.kind === "drop") {
    for (let i = 0; i <= steps; i++) {
      const r = r0 + (R - r0) * (i / steps);
      push(r, 0, 0);
    }
    return { ...fly, points };
  }
  if (fly.kind === "lob") {
    const a = fly.a, e = fly.e;
    const thetaLand = Math.PI - fly.angle;
    for (let i = 0; i <= steps; i++) {
      const th = Math.PI - (Math.PI - thetaLand) * (i / steps);
      const r = a * (1 - e * e) / (1 + e * Math.cos(th));
      push(r * Math.cos(th), r * Math.sin(th), 0);
    }
    return { ...fly, points };
  }
  if (fly.kind === "circular" || fly.kind === "orbit") {
    const a = fly.a || r0;
    const e = fly.e || 0;
    // r0 is periapsis when v > v_circ, apoapsis when equal (e=0).
    const peri = v >= vcApprox(r0, GM);
    for (let i = 0; i <= steps; i++) {
      const th = (peri ? 0 : Math.PI) + (i / steps) * 2 * Math.PI;
      const r = a * (1 - e * e) / (1 + e * Math.cos(th));
      push(r * Math.cos(th), r * Math.sin(th), 0);
    }
    return { ...fly, points };
  }
  if (fly.kind === "escape") {
    // Qualitative outbound arc, not a published trajectory table.
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * (Math.PI * 0.7);
      const r = r0 / Math.max(0.2, Math.cos(th));
      push(r * Math.cos(Math.PI - th), r * Math.sin(Math.PI - th), 0);
    }
    return { ...fly, points };
  }
  return { ...fly, points };
}

function vcApprox(r, GM) { return Math.sqrt(GM / r); }

export function resolvePreset(lessons, raw) {
  const key = String(raw || "").trim();
  const presets = lessons?.presets || {};
  if (presets[key]) return { id: key, ...presets[key] };
  const lower = key.toLowerCase();
  for (const [id, p] of Object.entries(presets)) {
    const aliases = (p.aliases || []).map((a) => String(a).toLowerCase());
    if (id.toLowerCase() === lower || aliases.includes(lower)) return { id, ...p };
  }
  return null;
}

export function presetFromSearch(lessons, search = location.search) {
  const q = new URLSearchParams(search);
  return resolvePreset(lessons, q.get("preset"));
}

export function l1Speeds(lessons) {
  const cap = lessons?.l1_cap || {};
  return {
    cap: cap.speed_cap_m_s,
    slow: cap.slow_m_s,
    fast: cap.fast_m_s
  };
}

export function l5ShotSpeeds(lessons, GM, R, h) {
  const p = lessons?.presets?.["l5-s8"];
  const fracs = p?.shotFractionsOfCircular || [0.25, 0.5, 0.75, 0.9, 1];
  const labels = p?.shotLabels || fracs.map((_, i) => `Shot ${i + 1}`);
  const vc = vCirc(R + h, GM);
  return fracs.map((f, i) => ({ label: labels[i], v: f * vc, fraction: f }));
}

export function formatNum(x, digits = 2, unit = "") {
  if (!Number.isFinite(x)) return "—";
  const n = Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(digits);
  return unit ? `${n} ${unit}` : n;
}

export function formatPeriod(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(2)} h`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${seconds.toFixed(0)} s`;
}


/** Remap a physical path (meters, launch at +X, velocity +Y) onto a visual muzzle pose, in meters.
 *  visual pose is in Earth radii. arcScale stretches the angular span for close-up L1 lobs only. */
export function placePath(points, R, pose, arcScale = 1) {
  if (!points?.length) return [];
  const r0 = Math.hypot(points[0].x, points[0].y, points[0].z || 0) || R;
  const ox = pose.x ?? 0, oy = pose.y ?? 0, oz = pose.z ?? 0;
  const visR0 = Math.hypot(ox, oy, oz) || pose.radius || 1;
  let erx = ox / visR0, ery = oy / visR0, erz = oz / visR0;
  if (!Number.isFinite(erx)) { erx = 1; ery = 0; erz = 0; }
  let tx = pose.direction?.x ?? 0, ty = pose.direction?.y ?? 1, tz = pose.direction?.z ?? 0;
  const dot = tx * erx + ty * ery + tz * erz;
  tx -= dot * erx; ty -= dot * ery; tz -= dot * erz;
  let tlen = Math.hypot(tx, ty, tz);
  if (tlen < 1e-8) { tx = -ery; ty = erx; tz = 0; tlen = Math.hypot(tx, ty, tz) || 1; }
  tx /= tlen; ty /= tlen; tz /= tlen;
  const out = [];
  for (const p of points) {
    const x = p.x, y = p.y, z = p.z || 0;
    const r = Math.hypot(x, y, z);
    const th = Math.atan2(y, x) * arcScale;
    const rVis = (r / r0) * visR0;
    const c = Math.cos(th), s = Math.sin(th);
    out.push({
      x: (rVis * (c * erx + s * tx)) * R,
      y: (rVis * (c * ery + s * ty)) * R,
      z: (rVis * (c * erz + s * tz)) * R
    });
  }
  return out;
}

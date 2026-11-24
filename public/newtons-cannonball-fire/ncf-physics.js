// Newton's Cannonball Fire: orbital classification, paths, and practice answers.
// Earth flights reuse Orbit Lab's Tesla-verified flight() and samplePath().
// Every number shown as a final answer is computed here. Do not hand-type results.

import { flight as olFlight, samplePath as olSamplePath, vCirc, vEsc, gAt, periodAt } from "../orbit-lab/ol-model.js";
import {
  GM_E, R_E, G, M_MOON, R_MOON, H_MOON, H_DEFAULT, H_MIN, ISS_ALTITUDE, PLANET_X, PRESETS, V_STEP
} from "./ncf-config.js";

export { GM_E, R_E, G, vCirc, vEsc, gAt, periodAt };

export function gEarth(r = R_E) { return gAt(r, GM_E); }
export function vOrbit(r, GM = GM_E) { return vCirc(r, GM); }
export function vEscape(r, GM = GM_E) { return vEsc(r, GM); }
export function period(r, GM = GM_E) { return periodAt(r, GM); }

export function launchRadius(h) { return R_E + h; }

// Tesla asked for a ±0.5% circular band, or at least ±V_STEP/2, unless 0.5%
// collides with falls or escape at any height. 0.5% of v_orbit is ~39 m/s,
// but the miss-Earth window is 0 at the surface, only 2.47 m/s at H_MIN
// (8 km), and 45.5 m/s at 150 km. A raw 0.5% band would label falling shots
// as circular at low peaks, and would call 7.78 km/s at 150 km circular
// instead of a smaller ellipse. Use ±V_STEP/2 (5 m/s) and never relabel a
// shot that hits Earth.
export const CIRCULAR_TOL_MPS = V_STEP / 2;

function hitsEarth(olKind) {
  return olKind === "lob" || olKind === "drop";
}

export function classify(v, h, GM = GM_E, R = R_E) {
  const fly = olFlight(v, h, GM, R);
  const r0 = R + h;
  const vc = fly.vc ?? vOrbit(r0, GM);
  const vesc = fly.vesc ?? vEscape(r0, GM);
  let kind = fly.kind;
  // Orbit Lab treats a hair-negative energy as bound; treat v at or above v_esc as escape.
  if (v >= vesc - 1e-6) kind = "escape";
  else if (Math.abs(v - vc) <= CIRCULAR_TOL_MPS && !hitsEarth(fly.kind)) kind = "circular";
  else if (kind === "orbit" || kind === "ellipse") kind = v < vc ? "ellipseApo" : "ellipse";
  else if (kind === "lob" || kind === "drop") kind = "falls";
  else if (kind === "escape") kind = "escape";
  const bound = kind === "circular" || kind === "ellipse" || kind === "ellipseApo";
  const T = bound ? 2 * Math.PI * Math.sqrt(((fly.a || r0) ** 3) / GM) : null;
  return { ...fly, kind, vc, vesc, r0, bound, period: T, g: gAt(r0, GM) };
}

export function outcomeLabel(kind) {
  return {
    invalid: "Need a height and a speed.",
    falls: "Falls back to Earth.",
    drop: "Falls back to Earth.",
    circular: "Circular orbit.",
    ellipseApo: "Elliptical orbit (launch at its high point)",
    ellipse: "Wider elliptical orbit.",
    orbit: "Wider elliptical orbit.",
    escape: "Escapes.",
  }[kind] || "Falls back to Earth.";
}

/** Physical path in meters, launch at +X, velocity +Y (Orbit Lab convention). */
export function samplePath(v, h, GM = GM_E, R = R_E, steps = 360) {
  const fly = classify(v, h, GM, R);
  if (fly.kind === "escape") return { ...fly, points: hyperbolaPoints(v, h, GM, R, steps) };
  if (fly.kind === "circular") {
    // Draw a true circle even when the slider is a few m/s off v_orbit.
    return { ...fly, points: ellipsePoints(fly.vc, h, GM, R, steps) };
  }
  if (fly.kind === "ellipse" || fly.kind === "ellipseApo") {
    return { ...fly, points: ellipsePoints(v, h, GM, R, steps) };
  }
  const sampled = olSamplePath(v, h, GM, R, steps);
  return { ...fly, points: sampled.points || [] };
}

function ellipsePoints(v, h, GM, R, steps) {
  const r0 = R + h;
  const vc = Math.sqrt(GM / r0);
  const eps = (v * v) / 2 - GM / r0;
  const a = eps < 0 ? -GM / (2 * eps) : r0;
  const e = Math.abs(v - vc) <= 1e-6 || !(a > 0) ? 0 : (v > vc ? 1 - r0 / a : r0 / a - 1);
  const th0 = v >= vc - 1e-6 ? 0 : Math.PI; // periapsis on +X, apoapsis on +X would be π... start at launch
  // Launch is at r0: peri if v>=vc (θ=0), apo if v<vc (θ=π). Put that position on +X by shifting.
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const th = th0 + (i / steps) * 2 * Math.PI;
    const r = e === 0 ? r0 : a * (1 - e * e) / (1 + e * Math.cos(th));
    const ang = th - th0; // 0 at launch; +ang is +Y, launch on +X
    points.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0 });
  }
  return points;
}

function hyperbolaPoints(v, h, GM, R, steps) {
  const r0 = R + h;
  const mu = GM;
  const hh = r0 * v;
  const p = (hh * hh) / mu;
  const eps = (v * v) / 2 - mu / r0;
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * hh * hh) / (mu * mu)));
  const thMax = e > 1 ? Math.acos(Math.max(-0.92, Math.min(-0.2, -1 / e))) * 0.92 : Math.PI * 0.7;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * thMax;
    const r = p / (1 + e * Math.cos(th));
    if (!(r > 0) || r > r0 * 40) break;
    points.push({ x: r * Math.cos(th), y: r * Math.sin(th), z: 0 });
  }
  if (!points.length) points.push({ x: r0, y: 0, z: 0 });
  return points;
}

export function presetSpeed(preset, h) {
  const r0 = launchRadius(h);
  const vc = vOrbit(r0);
  const vesc = vEscape(r0);
  if (preset.kind === "esc") return vesc * preset.frac;
  return vc * preset.frac;
}

export function presetsAt(h) {
  return PRESETS.map((p) => {
    const v = presetSpeed(p, h);
    return { ...p, v, flight: classify(v, h) };
  });
}

export function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

export function formatKmS(v, digits = 2) {
  if (!Number.isFinite(v)) return "-";
  return `${(v / 1000).toFixed(digits)} km/s`;
}

export function formatMin(seconds, digits = 1) {
  if (!Number.isFinite(seconds)) return "-";
  return `${(seconds / 60).toFixed(digits)} min`;
}

export function formatMps(v, digits = 0) {
  if (!Number.isFinite(v)) return "-";
  if (Math.abs(v) >= 1000) {
    const exp = Math.floor(Math.log10(Math.abs(v)));
    const mant = v / 10 ** exp;
    return `${mant.toFixed(2)} × 10${expString(exp)} m/s`;
  }
  return `${v.toFixed(digits)} m/s`;
}

export function formatSec(seconds, digits = 0) {
  if (!Number.isFinite(seconds)) return "-";
  if (seconds >= 1000) {
    const exp = Math.floor(Math.log10(seconds));
    const mant = seconds / 10 ** exp;
    return `${mant.toFixed(2)} × 10${expString(exp)} s`;
  }
  return `${seconds.toFixed(digits)} s`;
}

function expString(exp) {
  const sup = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(exp).split("").map((c) => sup[c] ?? c).join("");
}

/** Every practice answer, computed from the constants. Tesla checks these. */
export function practiceAnswers() {
  const surfaceR = R_E;
  const surfaceG = gEarth(surfaceR);
  const surfaceV = vOrbit(surfaceR);
  const surfaceT = period(surfaceR);
  const surfaceEsc = vEscape(surfaceR);

  const issR = R_E + ISS_ALTITUDE;
  const issG = gEarth(issR);
  const issV = vOrbit(issR);
  const issT = period(issR);

  const moonR = R_MOON + H_MOON;
  const moonGM = G * M_MOON;
  const moonV = vOrbit(moonR, moonGM);
  const moonT = period(moonR, moonGM);
  const moonG = gAt(moonR, moonGM);

  const pxV = Math.sqrt(PLANET_X.r * PLANET_X.g);
  const pxT = (2 * Math.PI * PLANET_X.r) / pxV;

  const mountainR = R_E + H_DEFAULT;
  const mountainG = gEarth(mountainR);
  const mountainV = vOrbit(mountainR);
  const mountainT = period(mountainR);
  const mountainEsc = vEscape(mountainR);

  return {
    surface: { r: surfaceR, h: 0, g: surfaceG, vOrbit: surfaceV, period: surfaceT, vEsc: surfaceEsc },
    iss: { r: issR, h: ISS_ALTITUDE, g: issG, vOrbit: issV, period: issT },
    escapeSurface: { r: surfaceR, h: 0, g: surfaceG, vOrbit: surfaceV, vEsc: surfaceEsc },
    moon: { M: M_MOON, R: R_MOON, h: H_MOON, r: moonR, g: moonG, GM: moonGM, vOrbit: moonV, period: moonT },
    planetX: { r: PLANET_X.r, g: PLANET_X.g, vOrbit: pxV, period: pxT },
    mountain: { r: mountainR, h: H_DEFAULT, g: mountainG, vOrbit: mountainV, period: mountainT, vEsc: mountainEsc },
    minHeight: { h: H_MIN },
  };
}

export function applySandbox(id) {
  const a = practiceAnswers();
  if (id === "surface") return { h: H_MIN, v: vOrbit(R_E + H_MIN), note: "surface" };
  if (id === "iss") return { h: a.iss.h, v: a.iss.vOrbit, note: "iss" };
  if (id === "escapeSurface") return { h: H_MIN, v: vEscape(R_E + H_MIN), note: "escape" };
  if (id === "mountain") return { h: a.mountain.h, v: a.mountain.vOrbit, note: "mountain" };
  return null;
}

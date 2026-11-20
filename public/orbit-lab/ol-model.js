// Orbit Lab model: load Tesla-verified orbits.json, lesson presets, and
// inverse-square cannon flights. Numbers shown as final come from the JSON.
// The only added teaching geometry is the schematic cannon height and the L1 cap.

export const ORBITS_URL = new URL("./assets/orbits.json", import.meta.url);
export const PRESETS_URL = new URL("./assets/lesson-presets.json", import.meta.url);

const ASSET_ROOT = new URL("./assets/", import.meta.url);

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

export function assetCandidates(kind) {
  const names = {
    skybox: ["skybox.webp", "skybox.jpg", "skybox.png", "skybox.hdr"],
    earth: ["models/earth.meshopt.glb", "models/earth.glb", "earth.meshopt.glb", "earth.glb"],
    cannon: ["models/newton_cannon.meshopt.glb", "models/newton_cannon.glb", "newton_cannon.meshopt.glb", "newton_cannon.glb"],
    iss: ["models/iss.meshopt.glb", "models/iss.glb", "iss.meshopt.glb", "iss.glb"],
    hubble: ["models/hubble.meshopt.glb", "models/hubble.glb", "hubble.meshopt.glb", "hubble.glb"],
    gps: ["models/gps.meshopt.glb", "models/gps.glb", "gps.meshopt.glb", "gps.glb"],
    geo: ["models/geo_comsat.meshopt.glb", "models/geo_comsat.glb", "models/geo.meshopt.glb", "models/geo.glb", "geo_comsat.meshopt.glb", "geo_comsat.glb"],
    moon: ["models/moon.meshopt.glb", "models/moon.glb", "moon.meshopt.glb", "moon.glb"]
  };
  return (names[kind] || []).map((rel) => new URL(rel, ASSET_ROOT).href);
}

export async function firstExisting(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (e) { /* try the next name */ }
  }
  // Some static hosts reject HEAD; try a range GET as a fallback for the first few.
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Range: "bytes=0-1" } });
      if (res.ok || res.status === 206) return url;
    } catch (e) { /* skip */ }
  }
  return null;
}

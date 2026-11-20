import { loadAssetMap, assetCandidates, firstExisting, preferMobileSkybox } from "../gravity-orbits/go-assets.js";
export { loadAssetMap, assetCandidates, firstExisting, preferMobileSkybox };

export const KEPLER_URL = new URL("./assets/kepler.json", import.meta.url);
export const PRESETS_URL = new URL("./assets/lesson-presets.json", import.meta.url);

export function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadKeplerData() {
  const [kepler, lessons] = await Promise.all([loadJSON(KEPLER_URL), loadJSON(PRESETS_URL)]);
  return { kepler, lessons };
}

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
  return resolvePreset(lessons, new URLSearchParams(search).get("preset"));
}

export function auKm(kepler) { return kepler.au_km || 149597870.7; }

/** Ellipse in the XY plane, Sun at the origin (one focus), perihelion on +X. */
export function ellipsePoints(a, e, steps = 256) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const r = a * (1 - e * e) / (1 + e * Math.cos(th));
    pts.push({ x: r * Math.cos(th), y: r * Math.sin(th), z: 0 });
  }
  return pts;
}

export function emptyFocus(a, e) { return { x: -2 * a * e, y: 0, z: 0 }; }
export function ellipseCenter(a, e) { return { x: -a * e, y: 0, z: 0 }; }

export function bodyOrbit(kepler, name) {
  if (name === "Earth") {
    const b = kepler.earth;
    return { name: "Earth", a: b.semi_major_axis_au, e: b.eccentricity, color: 0x4caf50 };
  }
  if (name === "Mars") {
    const b = kepler.mars;
    return { name: "Mars", a: b.semi_major_axis_au, e: b.eccentricity, color: 0x999999 };
  }
  if (name === "Halley" || name === "comet") {
    const b = kepler.halley;
    return { name: "1P/Halley", a: b.semi_major_axis_au, e: b.eccentricity, color: 0xcccccc };
  }
  return null;
}

export function galilean(kepler) {
  const moons = kepler.galilean_moons || {};
  const Rj = kepler.jupiter.equatorial_radius_km;
  return Object.entries(moons).map(([name, m]) => ({
    name,
    a: m.semi_major_axis_km / Rj,
    e: m.eccentricity,
    period_s: m.period_s,
    radius: m.radius_in_jupiter_radii
  }));
}


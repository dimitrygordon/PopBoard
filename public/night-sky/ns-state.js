// Night Sky: SkyState, URL parse/serialize and reducer. Pure (no DOM), node-testable.
// Scheme: design_v1 section 5. Invalid values fall back to defaults and never throw.
// Unknown params are kept and written back, so later labs can add their own.
import { localToUtcMs, utcToLocalParts } from "./ns-astro.js";

export const SCHEME_VERSION = 1;
export const MIN_MS = Date.UTC(1900, 0, 1);              // planet elements valid 1800-2050 (JPL Table 1)
export const MAX_MS = Date.UTC(2050, 11, 31, 23, 59, 59);
export const MAX_SPEED = 3600;
export const SPEED_LADDER = [0, 1, 60, 600, 3600];

// Named places. Jasper: Wikipedia 38.39139 N, 86.93083 W, Eastern time. Equator and poles keep Jasper's
// longitude and clock so only latitude changes. Quito and Sydney use their own zones.
export const PLACES = {
  jasper: { name: "Jasper, IN", lat: 38.3914, lon: -86.9311, tz: "America/New_York" },
  northpole: { name: "North Pole", lat: 90, lon: -86.9311, tz: "America/New_York" },
  equator: { name: "Equator", lat: 0, lon: -86.9311, tz: "America/New_York" },
  southpole: { name: "South Pole", lat: -90, lon: -86.9311, tz: "America/New_York" },
  sydney: { name: "Sydney", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  quito: { name: "Quito", lat: -0.1807, lon: -78.4678, tz: "America/Guayaquil" },
};
export const GRIDS = ["altaz", "eq", "ecl"];
export const LOOKS = { north: [0, 20], east: [90, 20], south: [180, 20], west: [270, 20] };
export const LOCK_GROUPS = ["time", "place", "sky"];
const KNOWN = ["v", "loc", "lat", "lon", "tz", "date", "time", "utc", "speed", "lines", "art", "names", "artalpha", "starnames", "grid",
  "planets", "trails", "ground", "sky", "mag", "look", "hl", "ui", "lock", "lab", "debug"];

const SKY_DEFAULTS = { lines: false, art: false, names: false, artalpha: 0.35, starnames: false, grid: [], planets: true, trails: 0, ground: true, sky: "night", mag: 6.5 };

export function defaultState(wallMs = Date.now()) {
  const p = PLACES.jasper;
  return {
    v: SCHEME_VERSION, loc: "jasper", lat: p.lat, lon: p.lon, tz: p.tz, tzGiven: false, latLonGiven: false,
    timeSpec: { kind: "now" }, clock: { t0: wallMs, w0: wallMs, speed: 1 }, clampNote: false,
    ...structuredClone(SKY_DEFAULTS),
    look: "south", hl: null, ui: true, vignette: true, lock: [], lab: null, debug: false, extra: [],
  };
}

// ---- parsing helpers (return undefined on anything invalid) ----
const num = (s, lo, hi) => { if (s == null || s === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(String(s).trim())) return undefined; const n = +s; return n >= lo && n <= hi ? n : undefined; };
const bool = (s) => (s === "1" ? true : s === "0" ? false : undefined);
export function validTimeZone(tz) { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; } }
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return undefined;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? { y, mo, d } : undefined;
}
export function parseTime(s) { const m = /^(\d{2}):(\d{2})$/.exec(s || ""); if (!m) return undefined; const H = +m[1], Mi = +m[2]; return H < 24 && Mi < 60 ? { H, Mi } : undefined; }
function parseUtc(s) { if (!s || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(s)) return undefined; const t = Date.parse(s); return Number.isFinite(t) ? t : undefined; }
export function parseLook(s) {
  if (!s) return undefined;
  if (s === "polaris" || LOOKS[s]) return s;
  const m = /^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)$/.exec(s); if (!m) return undefined;
  const az = +m[1], alt = +m[3];
  return az >= 0 && az <= 360 && alt >= -90 && alt <= 90 ? `${az},${alt}` : undefined;
}
function parseHl(s) { if (!s) return undefined; s = s.toLowerCase(); if (s === "polaris" || /^[a-z]{3}$/.test(s) || /^hip:\d+$/.test(s)) return s; return undefined; }
export function clampMs(ms) { return Math.min(MAX_MS, Math.max(MIN_MS, ms)); }

/** Parse a query string (with or without "?") into a SkyState. wallMs is "now". */
export function parseQuery(query, wallMs = Date.now()) {
  const st = defaultState(wallMs);
  let params;
  try { params = new URLSearchParams(query || ""); } catch { return st; }
  const get = (k) => params.get(k);
  const loc = get("loc"); if (loc && PLACES[loc]) { st.loc = loc; Object.assign(st, { lat: PLACES[loc].lat, lon: PLACES[loc].lon, tz: PLACES[loc].tz }); }
  const lat = num(get("lat"), -90, 90), lon = num(get("lon"), -180, 180);
  if (lat !== undefined && lon !== undefined) { st.lat = lat; st.lon = lon; st.loc = null; st.latLonGiven = true; }
  else if (lat !== undefined || lon !== undefined) { // one of the pair: apply it on top of loc
    if (lat !== undefined) st.lat = lat; if (lon !== undefined) st.lon = lon; st.loc = null; st.latLonGiven = true;
  }
  const tz = get("tz"); if (tz && validTimeZone(tz)) { st.tz = tz; st.tzGiven = true; }
  else if (st.latLonGiven) st.tz = deviceTimeZone();
  // time: utc wins over date/time
  const utc = parseUtc(get("utc")), date = parseDate(get("date")), time = parseTime(get("time"));
  let t = undefined;
  if (utc !== undefined) { t = utc; st.timeSpec = { kind: "utc", iso: get("utc") }; }
  else if (date || time) {
    const now = utcToLocalParts(wallMs, st.tz);
    const d = date || { y: now.y, mo: now.mo, d: now.d }, h = time || { H: now.H, Mi: now.Mi };
    t = localToUtcMs(d.y, d.mo, d.d, h.H, h.Mi, st.tz);
    st.timeSpec = { kind: "local", date: date ? get("date") : null, time: time ? get("time") : null };
  }
  const speed = num(get("speed"), -MAX_SPEED, MAX_SPEED);
  if (speed !== undefined) st.clock.speed = speed;
  if (t !== undefined) { const c = clampMs(t); st.clampNote = c !== t; st.clock.t0 = c; st.clock.w0 = wallMs; }
  for (const k of ["lines", "art", "names", "starnames", "planets"]) { const b = bool(get(k)); if (b !== undefined) st[k] = b; }
  const g = get("ground"); if (g === "1" || g === "0") st.ground = g === "1";
  const aa = num(get("artalpha"), 0, 1); if (aa !== undefined) st.artalpha = aa;
  const grid = get("grid");
  if (grid) { const parts = grid.split(",").map((x) => x.trim()); if (parts.every((x) => GRIDS.includes(x) || x === "off")) st.grid = GRIDS.filter((x) => parts.includes(x)); }
  const tr = num(get("trails"), 0, 12); if (tr !== undefined) st.trails = tr;
  const sky = get("sky"); if (sky === "night" || sky === "real") st.sky = sky;
  const mag = num(get("mag"), 4, 6.5); if (mag !== undefined) st.mag = mag;
  const look = parseLook(get("look")); if (look) st.look = look;
  const hl = parseHl(get("hl")); if (hl) st.hl = hl;
  const ui = bool(get("ui")); if (ui !== undefined) st.ui = ui;
  const lock = get("lock"); if (lock) st.lock = LOCK_GROUPS.filter((x) => lock.split(",").includes(x));
  const lab = get("lab"); if (lab && /^[\w-]{1,64}$/.test(lab)) st.lab = lab;
  const dbg = bool(get("debug")); if (dbg !== undefined) st.debug = dbg;
  for (const [k, v] of params) if (!KNOWN.includes(k)) st.extra.push([k, v]);
  return st;
}
export function deviceTimeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } }

const fmtNum = (n, d = 4) => String(+n.toFixed(d));
/** Serialize back to a query string (no "?"), writing only values that differ from defaults.
 *  Time: if the student moved time, writes utc= at the current sim minute (and speed). */
export function serialize(st, wallMs = Date.now()) {
  const p = [];
  if (st.latLonGiven || st.loc === null) { p.push(["lat", fmtNum(st.lat)], ["lon", fmtNum(st.lon)]); }
  else if (st.loc && st.loc !== "jasper") p.push(["loc", st.loc]);
  if (st.tzGiven) p.push(["tz", st.tz]);
  if (st.timeSpec.kind === "local") { if (st.timeSpec.date) p.push(["date", st.timeSpec.date]); if (st.timeSpec.time) p.push(["time", st.timeSpec.time]); }
  else if (st.timeSpec.kind === "utc") p.push(["utc", st.timeSpec.iso]);
  if (st.clock.speed !== 1) p.push(["speed", fmtNum(st.clock.speed)]);
  for (const k of ["lines", "art", "names"]) if (st[k]) p.push([k, "1"]);
  if (st.artalpha !== SKY_DEFAULTS.artalpha) p.push(["artalpha", fmtNum(st.artalpha, 2)]);
  if (st.starnames) p.push(["starnames", "1"]);
  if (st.grid.length) p.push(["grid", st.grid.join(",")]);
  if (!st.planets) p.push(["planets", "0"]);
  if (st.trails) p.push(["trails", fmtNum(st.trails, 2)]);
  if (!st.ground) p.push(["ground", "0"]);
  if (st.sky !== "night") p.push(["sky", st.sky]);
  if (st.mag !== 6.5) p.push(["mag", fmtNum(st.mag, 2)]);
  if (st.look !== "south") p.push(["look", st.look]);
  if (st.hl) p.push(["hl", st.hl]);
  if (!st.ui) p.push(["ui", "0"]);
  if (st.lock.length) p.push(["lock", st.lock.join(",")]);
  if (st.lab) p.push(["lab", st.lab]);
  if (st.debug) p.push(["debug", "1"]);
  for (const kv of st.extra) p.push(kv);
  return p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/%2C/g, ",").replace(/%3A/g, ":")}`).join("&");
}

/** Simulated Unix ms at a wall-clock instant: simTime = t0 + speed * (wall - w0), clamped to 1900..2050. */
export function simTimeMs(st, wallMs = Date.now()) { return clampMs(st.clock.t0 + st.clock.speed * (wallMs - st.clock.w0)); }

// Which lock group an action belongs to.
const GROUP = { setSpeed: "time", togglePlay: "time", jump: "time", setTime: "time", now: "time", tonight: "time", season: "time", scrub: "time",
  setPlace: "place", nudge: "place",
  toggle: "sky", set: "sky", helpOff: "sky", reset: "sky", setGrid: "sky", toggleGrid: "sky" };
const SKY_KEYS = new Set(["lines", "art", "names", "starnames", "planets", "ground", "artalpha", "trails", "sky", "mag", "hl", "look", "debug", "ui"]);

function retime(st, newT, wallMs, speed = st.clock.speed) {
  const c = clampMs(newT);
  return { ...st, clampNote: c !== newT, clock: { t0: c, w0: wallMs, speed }, timeSpec: { kind: "utc", iso: isoMinute(c) } };
}
function addMonths(ms, n, tz) {
  const p = utcToLocalParts(ms, tz); let mo = p.mo - 1 + n; const y = p.y + Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
  const dim = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return localToUtcMs(y, mo + 1, Math.min(p.d, dim), p.H, p.Mi, tz);
}
// Approximate equinox and solstice dates (design section 12 item 19; buttons say "about").
export const SEASONS = { mar: [3, 20], jun: [6, 21], sep: [9, 22], dec: [12, 21] };

/** Reducer. Every action carries wallMs (so it stays pure). Locked groups are no-ops. */
export function reduce(st, a) {
  const g = GROUP[a.type];
  if (!g) return st;
  if (a.type === "toggle" && a.key === "vignette") return { ...st, vignette: !st.vignette }; // comfort: never locked
  if (st.lock.includes(g)) return st;
  const wall = a.wallMs ?? Date.now();
  const t = simTimeMs(st, wall);
  switch (a.type) {
    case "toggle": if (!SKY_KEYS.has(a.key) || typeof st[a.key] !== "boolean") return st; return { ...st, [a.key]: !st[a.key] };
    case "set": {
      if (!SKY_KEYS.has(a.key)) return st;
      const probe = parseQuery(`${a.key}=${encodeURIComponent(a.value === true ? "1" : a.value === false ? "0" : a.value)}`, wall);
      return { ...st, [a.key]: probe[a.key] };
    }
    case "setGrid": return { ...st, grid: GRIDS.filter((x) => (a.grid || []).includes(x)) };
    case "toggleGrid": return { ...st, grid: GRIDS.filter((x) => (x === a.grid ? !st.grid.includes(x) : st.grid.includes(x))) };
    case "helpOff": return { ...st, lines: false, art: false, names: false };
    case "reset": return { ...st, ...structuredClone(SKY_DEFAULTS), hl: null };
    case "setSpeed": { const s = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, +a.speed || 0)); return { ...st, clock: { t0: t, w0: wall, speed: s } }; }
    case "togglePlay": { const s = st.clock.speed === 0 ? (st.lastSpeed || 1) : 0; return { ...st, lastSpeed: st.clock.speed || st.lastSpeed, clock: { t0: t, w0: wall, speed: s } }; }
    case "jump": return retime(st, a.months ? addMonths(t, a.months, st.tz) : t + (+a.deltaMs || 0), wall);
    case "scrub": return { ...st, clock: { t0: clampMs(t + (+a.deltaMs || 0)), w0: wall, speed: st.clock.speed }, timeSpec: { kind: "utc", iso: isoMinute(clampMs(t + (+a.deltaMs || 0))) } };
    case "setTime": return retime(st, +a.utcMs, wall);
    case "now": return { ...st, clampNote: false, timeSpec: { kind: "now" }, clock: { t0: wall, w0: wall, speed: 1 } };
    case "tonight": { const p = utcToLocalParts(wall, st.tz); return retime(st, localToUtcMs(p.y, p.mo, p.d, 21, 0, st.tz), wall, 0); }
    case "season": { const s = SEASONS[a.season]; if (!s) return st; const p = utcToLocalParts(t, st.tz); return retime(st, localToUtcMs(p.y, s[0], s[1], 22, 0, st.tz), wall, 0); }
    case "setPlace": { const P = PLACES[a.loc]; if (!P) return st; return { ...st, loc: a.loc, lat: P.lat, lon: P.lon, tz: P.tz, tzGiven: false, latLonGiven: false }; }
    case "nudge": {
      const lat = Math.max(-90, Math.min(90, st.lat + (+a.dLat || 0)));
      let lon = st.lon + (+a.dLon || 0); lon = ((lon + 180) % 360 + 360) % 360 - 180;
      return { ...st, lat: +lat.toFixed(4), lon: +lon.toFixed(4), loc: null, latLonGiven: true };
    }
  }
  return st;
}
export function isoMinute(ms) { return new Date(Math.round(ms / 60000) * 60000).toISOString().slice(0, 16) + "Z"; }

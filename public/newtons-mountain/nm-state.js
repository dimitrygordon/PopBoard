// Newton's Mountain: state, URL scheme (spec_v1 section 6) and the reducer. Pure and serializable, like ns-state.js.
// Invalid values fall back to the config defaults and never throw. Unknown params survive a round trip.
import { NM_CONFIG as C } from "./nm-config.js";
import { bracketOf } from "./nm-sim.js";

export const LOCKS = ["speed", "height", "help", "air", "vectors", "view"];
const KNOWN = ["h", "vel", "help", "view", "trail", "velvec", "gravec", "warp", "consts", "size", "rings", "air", "mass", "gdial", "shots", "lock", "lab", "ui", "sound", "debug", "v"];
const SIZES = [...new Set([...C.sizeVr, ...C.sizeAr])];
const RINGS = ["iss", "geo", "moon"];

export function defaultState() {
  return { h: C.defaultHeightKm, vel: C.speedDefault, help: C.helpDefault, view: "mountain", trail: true, velvec: false, gravec: false,
    warp: "auto", consts: C.consts, size: null, rings: [], air: C.airDefault, mass: C.ball.massKg, gdial: C.gdialDefault, shots: [], lock: [],
    lab: "", ui: true, sound: false, debug: false, v: 1, extra: [],
    // runtime, not in the URL
    paused: false, warpNow: 1, fired: [], results: {}, nextN: 1, selected: null };
}
const bit = (x, d) => (x === "1" ? true : x === "0" ? false : d);
const num = (x) => (x === null || x === undefined || x === "" ? NaN : Number(x));

export function parseQuery(search) {
  const s = defaultState(), q = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const h = num(q.get("h")); if (C.heightsKm.includes(h)) s.h = h;
  const vel = num(q.get("vel")); if (Number.isFinite(vel) && vel >= C.speedMin && vel <= C.speedMax) s.vel = Math.round(vel);
  const help = num(q.get("help")); if (C.helpLevels.includes(help)) s.help = help;
  if (q.get("view") === "model") s.view = "model";
  s.trail = bit(q.get("trail"), s.trail); s.velvec = bit(q.get("velvec"), s.velvec); s.gravec = bit(q.get("gravec"), s.gravec);
  const w = q.get("warp"); if (w && w !== "auto" && C.warpLadder.includes(Number(w))) s.warp = Number(w);
  if (C.CONSTS[q.get("consts")]) s.consts = q.get("consts");
  const sz = num(q.get("size")); if (SIZES.includes(sz)) s.size = sz;
  if (q.get("rings")) s.rings = q.get("rings").split(",").filter((r, i, a) => RINGS.includes(r) && a.indexOf(r) === i);
  s.air = bit(q.get("air"), s.air);
  const m = num(q.get("mass")); if (C.ball.massChoices.includes(m)) s.mass = m;
  const g = num(q.get("gdial")); if (Number.isFinite(g) && g >= 0 && g <= 100) s.gdial = g;
  if (q.get("shots")) s.shots = q.get("shots").split(",").map(Number).filter((v) => Number.isFinite(v) && v >= C.speedMin && v <= C.speedMax).slice(0, C.maxShots);
  if (q.get("lock")) s.lock = q.get("lock").split(",").filter((l, i, a) => LOCKS.includes(l) && a.indexOf(l) === i);
  if (q.get("lab")) s.lab = q.get("lab").slice(0, 40);
  s.ui = bit(q.get("ui"), s.ui); s.sound = bit(q.get("sound"), s.sound); s.debug = q.get("debug") === "1";
  const v = num(q.get("v")); if (Number.isInteger(v) && v > 0) s.v = v;
  for (const [k, val] of q.entries()) if (!KNOWN.includes(k)) s.extra.push([k, val]);
  return s;
}

/** Query string (no leading "?") with only the values that differ from the defaults, plus unknown params. */
export function serialize(s) {
  const d = defaultState(), q = new URLSearchParams();
  if (s.h !== d.h) q.set("h", s.h);
  if (s.vel !== d.vel) q.set("vel", s.vel);
  if (s.help !== d.help) q.set("help", s.help);
  if (s.view !== d.view) q.set("view", s.view);
  if (s.trail !== d.trail) q.set("trail", s.trail ? 1 : 0);
  if (s.velvec) q.set("velvec", 1);
  if (s.gravec) q.set("gravec", 1);
  if (s.warp !== d.warp) q.set("warp", s.warp);
  if (s.consts !== d.consts) q.set("consts", s.consts);
  if (s.size !== null) q.set("size", s.size);
  if (s.rings.length) q.set("rings", s.rings.join(","));
  if (s.air) q.set("air", 1);
  if (s.mass !== d.mass) q.set("mass", s.mass);
  if (s.gdial !== d.gdial) q.set("gdial", s.gdial);
  if (s.shots.length) q.set("shots", s.shots.join(","));
  if (s.lock.length) q.set("lock", s.lock.join(","));
  if (s.lab) q.set("lab", s.lab);
  if (!s.ui) q.set("ui", 0);
  if (s.sound) q.set("sound", 1);
  if (s.debug) q.set("debug", 1);
  if (s.v !== d.v) q.set("v", s.v);
  for (const [k, v] of s.extra) q.append(k, v);
  return q.toString().replace(/%2C/gi, ","); // keep lists readable in a copied link
}

const locked = (s, g) => s.lock.includes(g);
const clampV = (v) => Math.max(C.speedMin, Math.min(C.speedMax, Math.round(v)));

/** a.type: fire, speedStep(delta), setSpeed(v), warpStep(dir), warpAuto, setWarpNow(w), pauseToggle, setPaused(on), clear, setHeight(km),
 *  setView(view), toggleView, setHelp(level), toggle(key), setMass, setGdial, setSize, setRings(list), result(n, landed), select(n). */
export function reduce(s, a) {
  switch (a.type) {
    case "fire": {
      const n = s.nextN, shot = { n, v: s.vel, h: s.h, consts: s.consts, air: s.air, mass: s.mass, gdial: s.gdial };
      const fired = [...s.fired, shot].slice(-C.maxShots); // the ninth removes the oldest
      const keep = new Set(fired.map((f) => f.n)), results = {};
      for (const k of Object.keys(s.results)) if (keep.has(+k)) results[k] = s.results[k];
      return { ...s, fired, results: { ...results, [n]: null }, nextN: n + 1, selected: n };
    }
    case "speedStep": if (locked(s, "speed")) return s; return { ...s, vel: clampV(s.vel + a.delta) };
    case "setSpeed": if (locked(s, "speed")) return s; return { ...s, vel: clampV(a.v) };
    case "warpStep": {
      const L = C.warpLadder; let i = L.indexOf(s.warpNow); if (i < 0) i = 0;
      const warp = L[Math.max(0, Math.min(L.length - 1, i + (a.dir > 0 ? 1 : -1)))];
      return { ...s, warp, warpNow: warp };
    }
    case "warpAuto": return { ...s, warp: "auto" };
    case "setWarpNow": return s.warpNow === a.w ? s : { ...s, warpNow: a.w };
    case "pauseToggle": return { ...s, paused: !s.paused };
    case "setPaused": return s.paused === !!a.on ? s : { ...s, paused: !!a.on };
    case "clear": return { ...s, fired: [], results: {}, selected: null };
    case "setHeight": {
      if (locked(s, "height") || !C.heightsKm.includes(a.km) || a.km === s.h) return s;
      return { ...s, h: a.km, fired: [], results: {}, selected: null };
    }
    case "setView": if (locked(s, "view") || (a.view !== "mountain" && a.view !== "model")) return s; return { ...s, view: a.view };
    case "toggleView": if (locked(s, "view")) return s; return { ...s, view: s.view === "mountain" ? "model" : "mountain" };
    case "setHelp": if (locked(s, "help") || !C.helpLevels.includes(a.level)) return s; return { ...s, help: a.level };
    case "toggle": {
      const k = a.key;
      if ((k === "velvec" || k === "gravec") && locked(s, "vectors")) return s;
      if (k === "air" && locked(s, "air")) return s;
      if (!["trail", "velvec", "gravec", "air", "sound"].includes(k)) return s;
      return { ...s, [k]: !s[k] };
    }
    case "setMass": if (locked(s, "air") || !C.ball.massChoices.includes(a.kg)) return s; return { ...s, mass: a.kg };
    case "setGdial": if (!(a.pct >= 0 && a.pct <= 100)) return s; return { ...s, gdial: Math.round(a.pct) };
    case "setSize": if (!SIZES.includes(a.cm)) return s; return { ...s, size: a.cm };
    case "setRings": return { ...s, rings: (a.rings || []).filter((r, i, l) => RINGS.includes(r) && l.indexOf(r) === i) };
    case "result": if (!(a.n in s.results) || s.results[a.n] === a.landed) return s; return { ...s, results: { ...s.results, [a.n]: a.landed } };
    case "select": return s.selected === a.n ? s : { ...s, selected: a.n };
    default: return s;
  }
}

/** Bracket lines from the student's own shots at the current height. */
export function bracket(s) {
  return bracketOf(s.fired.filter((f) => f.h === s.h).map((f) => ({ v: f.v, landed: f.n in s.results ? s.results[f.n] : null })));
}

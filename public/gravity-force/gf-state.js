// Gravity Force Lab: URL state. Pure (no DOM). Same round-trip rule as ns-state.js.
// Invalid values fall back to defaults and never throw. Unknown params are written back.
// Scheme: teaching spec v1.2, section 12.

export const SCENES = Object.freeze(["pull", "mass", "weigh", "iss", "well"]);
export const HELP_LEVELS = Object.freeze([0, 1, 2]);
export const LOCK_GROUPS = Object.freeze(["help", "scene", "predict"]);
export const CHIPS = Object.freeze(["ball", "earth", "sun", "wd"]);
export const WORLDS = Object.freeze(["earth", "moon", "mars", "jupiter", "ns"]);
export const ALTS = Object.freeze([0, 100, 400, 35786, 384400]);
export const SHEET_OBJS = Object.freeze(["earth", "wd", "sun", "bh"]);

const KNOWN = new Set(["scene", "help", "lock", "dist", "a", "b", "world", "alt", "obj", "twin", "ui", "v"]);

/**
 * QR gating for help level 2 is undecided (Dimitry).
 * Flip HELP2_REQUIRES_URL.
 * false (default): the Help tab can select 0, 1, and 2.
 * true: help=2 is accepted only when canSetHelp is called with source "url" or "qr".
 * parseState still honors help=2 on the query string either way. The flag gates later changes.
 * Spec section 5 and acceptance test T15 describe the true setting.
 */
export const flags = {
  HELP2_REQUIRES_URL: false,
};

export function defaultState() {
  return {
    v: 1,
    scene: "pull",
    help: 0,
    lock: [],
    dist: 1,
    a: "earth",
    b: "sun",
    world: "earth",
    alt: 0,
    obj: "earth",
    twin: false,
    ui: true,
    extra: [],
  };
}

function queryFrom(input) {
  if (input == null) return "";
  if (typeof input === "object") {
    if (typeof input.search === "string") return input.search;
    if (typeof input.href === "string") return queryFrom(input.href);
  }
  const s = String(input);
  if (s.includes("://")) {
    try { return new URL(s).search; } catch { return ""; }
  }
  const i = s.indexOf("?");
  return i >= 0 ? s.slice(i + 1) : s;
}

function oneOf(s, list) {
  if (s == null || s === "") return undefined;
  const t = String(s).trim();
  return list.includes(t) ? t : undefined;
}

function numIn(s, lo, hi) {
  if (s == null || s === "") return undefined;
  const t = String(s).trim();
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : undefined;
}

function parseHelp(s) {
  return s === "0" || s === "1" || s === "2" ? Number(s) : undefined;
}

function parseAlt(s) {
  if (s == null || s === "" || !/^\d+$/.test(String(s).trim())) return undefined;
  const n = Number(s);
  return ALTS.includes(n) ? n : undefined;
}

function parseV(s) {
  if (s == null || s === "" || !/^\d+$/.test(String(s).trim())) return undefined;
  const n = Number(s);
  return Number.isInteger(n) && n <= 1e6 ? n : undefined;
}

function parseBit(s) {
  if (s === "0" || s === "1") return s === "1";
  return undefined;
}

function parseLock(s) {
  if (s == null || s === "") return undefined;
  const parts = String(s).split(",").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return undefined;
  return LOCK_GROUPS.filter((g) => parts.includes(g));
}

/** Parse a URL, a URL object, or a query string (with or without "?"). */
export function parseState(input) {
  const st = defaultState();
  try {
    const raw = queryFrom(input);
    const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
    const scene = oneOf(params.get("scene"), SCENES);
    const help = parseHelp(params.get("help"));
    const lock = parseLock(params.get("lock"));
    const dist = numIn(params.get("dist"), 0.25, 4);
    const a = oneOf(params.get("a"), CHIPS);
    const b = oneOf(params.get("b"), CHIPS);
    const world = oneOf(params.get("world"), WORLDS);
    const alt = parseAlt(params.get("alt"));
    const obj = oneOf(params.get("obj"), SHEET_OBJS);
    const twin = parseBit(params.get("twin"));
    const ui = parseBit(params.get("ui"));
    const v = parseV(params.get("v"));
    if (scene !== undefined) st.scene = scene;
    if (help !== undefined) st.help = help;
    if (lock !== undefined) st.lock = lock;
    if (dist !== undefined) st.dist = dist;
    if (a !== undefined) st.a = a;
    if (b !== undefined) st.b = b;
    if (world !== undefined) st.world = world;
    if (alt !== undefined) st.alt = alt;
    if (obj !== undefined) st.obj = obj;
    if (twin !== undefined) st.twin = twin;
    if (ui !== undefined) st.ui = ui;
    if (v !== undefined) st.v = v;
    for (const [k, val] of params) if (!KNOWN.has(k)) st.extra.push([k, val]);
  } catch {
    return defaultState();
  }
  return st;
}

function trimNum(n) {
  return String(+Number(n).toFixed(8));
}

function enc(k, v) {
  return `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%2C/gi, ",").replace(/%3A/gi, ":")}`;
}

/** Query string with no leading "?". Defaults are omitted. Unknown params are kept, in order. */
export function serializeState(state) {
  const s = state || defaultState();
  const p = [];
  if (s.scene && s.scene !== "pull") p.push(["scene", s.scene]);
  if (s.help) p.push(["help", String(s.help)]);
  if (s.lock && s.lock.length) p.push(["lock", s.lock.join(",")]);
  if (s.dist != null && s.dist !== 1) p.push(["dist", trimNum(s.dist)]);
  if (s.a && s.a !== "earth") p.push(["a", s.a]);
  if (s.b && s.b !== "sun") p.push(["b", s.b]);
  if (s.world && s.world !== "earth") p.push(["world", s.world]);
  if (s.alt) p.push(["alt", String(s.alt)]);
  if (s.obj && s.obj !== "earth") p.push(["obj", s.obj]);
  if (s.twin) p.push(["twin", "1"]);
  if (s.ui === false) p.push(["ui", "0"]);
  if (s.v != null && s.v !== 1) p.push(["v", String(s.v)]);
  for (const kv of s.extra || []) p.push(kv);
  return p.map(([k, v]) => enc(k, v)).join("&");
}

export function isLocked(state, group) {
  return Array.isArray(state?.lock) && state.lock.includes(group);
}

/**
 * Whether a control may set the help level.
 * source "url" or "qr" is the address bar (the QR code). Anything else is the Help tab.
 * lock=help blocks a change away from state.help, from every source.
 * When flags.HELP2_REQUIRES_URL is true, level 2 is refused unless source is "url" or "qr".
 */
export function canSetHelp(level, source, state) {
  const lv = Number(level);
  if (lv !== 0 && lv !== 1 && lv !== 2) return false;
  const st = state || defaultState();
  if (isLocked(st, "help") && lv !== st.help) return false;
  const fromUrl = source === "url" || source === "qr";
  if (lv === 2 && flags.HELP2_REQUIRES_URL && !fromUrl) return false;
  return true;
}

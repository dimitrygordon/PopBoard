// PopBoard shared fun layer: pure logic (no DOM). Safe to import in Node tests.
// Challenge engine, streak counter, medal storage, share-link codec.

export const TIERS = ["bronze", "silver", "gold"];
export const MEDAL_KEY = "popboard.fun.medals";

// ---------- storage (localStorage or any {getItem,setItem}) ----------
function defaultStore() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}
export function loadMedals(store = defaultStore()) {
  if (!store) return {};
  try {
    const v = JSON.parse(store.getItem(MEDAL_KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch (e) { return {}; }
}
export function saveMedal(moduleId, tier, store = defaultStore()) {
  if (!TIERS.includes(tier)) throw new Error("unknown tier " + tier);
  const all = loadMedals(store);
  const list = new Set(Array.isArray(all[moduleId]) ? all[moduleId] : []);
  const isNew = !list.has(tier);
  list.add(tier);
  all[moduleId] = TIERS.filter((t) => list.has(t));
  if (store) { try { store.setItem(MEDAL_KEY, JSON.stringify(all)); } catch (e) {} }
  return isNew;
}
export function medalsFor(moduleId, store = defaultStore()) {
  const v = loadMedals(store)[moduleId];
  return Array.isArray(v) ? TIERS.filter((t) => v.includes(t)) : [];
}
export function bestMedal(moduleId, store) {
  const m = medalsFor(moduleId, store);
  return m.length ? m[m.length - 1] : null;
}

// ---------- challenge engine ----------
// goals: [{ tier, title, check(event, ctx) -> bool }]. Each module supplies check().
// ctx is a per-engine scratch object a predicate may use for "in a row" goals.
export function createChallenges({ moduleId, goals, store = defaultStore(), onEarn } = {}) {
  if (!moduleId) throw new Error("moduleId required");
  const ctx = {};
  const earned = new Set(medalsFor(moduleId, store));
  return {
    goals,
    ctx,
    earned: () => TIERS.filter((t) => earned.has(t)),
    // Feed one sim event; returns the list of tiers newly earned this call.
    report(event) {
      const fresh = [];
      for (const g of goals) {
        let ok = false;
        try { ok = !!g.check(event, ctx); } catch (e) { ok = false; }
        if (ok && !earned.has(g.tier)) {
          earned.add(g.tier); saveMedal(moduleId, g.tier, store); fresh.push(g.tier);
          if (onEarn) onEarn(g);
        }
      }
      return fresh;
    }
  };
}

// ---------- streak (resets gently: no failure state, just back to 0) ----------
export function createStreak({ moduleId, store = defaultStore() } = {}) {
  const key = moduleId ? `popboard.fun.${moduleId}.bestStreak` : null;
  let best = 0;
  if (key && store) { try { best = Number(store.getItem(key)) || 0; } catch (e) {} }
  let count = 0;
  return {
    get count() { return count; },
    get best() { return best; },
    record(correct) {
      if (correct) {
        count++;
        if (count > best) { best = count; if (key && store) { try { store.setItem(key, String(best)); } catch (e) {} } }
      } else count = 0;
      return { count, best, correct: !!correct };
    }
  };
}

// ---------- predict-then-run ----------
// predict(guess) before a run; resolve(actual) after. judge(guess, actual) -> bool.
export function createPrediction({ judge, streak } = {}) {
  let guess = null;
  return {
    get pending() { return guess !== null; },
    predict(g) { guess = g; },
    resolve(actual) {
      if (guess === null) return null;
      const correct = !!judge(guess, actual);
      const out = { guess, actual, correct, streak: streak ? streak.record(correct) : null };
      guess = null;
      return out;
    }
  };
}

// ---------- share link (sim state in URL hash) ----------
const PREFIX = "s=";
export function encodeState(obj) {
  const json = JSON.stringify(obj);
  const b64 = typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, "utf8").toString("base64");
  return "#" + PREFIX + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeState(hash) {
  if (!hash) return null;
  const h = hash.replace(/^#/, "");
  if (!h.startsWith(PREFIX)) return null;
  let b64 = h.slice(PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  try {
    const json = typeof atob === "function"
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, "base64").toString("utf8");
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : null;
  } catch (e) { return null; }
}
// Keep only whitelisted numeric/bool keys, clamped to [min,max].
export function sanitizeState(obj, schema) {
  const out = {};
  if (!obj) return out;
  for (const [k, s] of Object.entries(schema)) {
    const v = obj[k];
    if (s.type === "bool" && typeof v === "boolean") out[k] = v;
    else if (s.type === "num" && typeof v === "number" && Number.isFinite(v)) out[k] = Math.min(s.max, Math.max(s.min, v));
    else if (s.type === "enum" && s.values.includes(v)) out[k] = v;
  }
  return out;
}

// ---------- bottom-sheet snap selection ----------
// snaps: visible heights in px, ascending (e.g. [peek, half, full]).
// h: current visible height; v: release velocity in px/s (+ = growing / dragged up).
// A flick (|v| >= flick) moves toward the projected rest point, at least one snap in the
// flick direction. A slow release snaps to the nearest point. Returns { index, flicked }.
export function pickSnap(snaps, h, v = 0, { flick = 400, d = 0.998 } = {}) {
  if (!snaps.length) throw new Error("no snaps");
  const nearest = (x, list) => list.reduce((bi, s, i) => (Math.abs(s - x) < Math.abs(list[bi] - x) ? i : bi), 0);
  if (Math.abs(v) < flick || !Number.isFinite(v)) return { index: nearest(h, snaps), flicked: false };
  const proj = h + (v / 1000) * d / (1 - d);
  const ahead = snaps.map((s, i) => ({ s, i })).filter(({ s }) => (v > 0 ? s > h + 0.5 : s < h - 0.5));
  if (!ahead.length) return { index: v > 0 ? snaps.length - 1 : 0, flicked: true };
  const first = v > 0 ? ahead[0] : ahead[ahead.length - 1];
  const best = ahead.reduce((b, c) => (Math.abs(c.s - proj) < Math.abs(b.s - proj) ? c : b), first);
  return { index: best.i, flicked: true };
}

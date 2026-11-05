// Physics 101 Custom Quiz: pure logic (no DOM, no Firebase) so tests can run it in node.
// Pool = existing Study Questions / Practice Questions items by stable id (physics101/sq/index.json).
// No new content: a quiz is just a weighted draw of ids from the lessons a student ticks.

// ---------- scope: units are whole modules ("m3") or single lessons ("m03-l02") ----------
// index: sq/index.json ({slug: {mq, sol, t: [[id, title]]}}); decks: p101-catalog DECKS.
export function unitIds(unit, index, decks) {
  const slugs = /^m\d+$/.test(unit) ? decks.filter((d) => "m" + d.q === unit).map((d) => d.slug) : [unit];
  return slugs.flatMap((s) => (index[s]?.t || []).map(([id]) => ({ id, slug: s })));
}
export function unitName(unit, decks) {
  if (/^m\d+$/.test(unit)) { const d = decks.find((x) => "m" + x.q === unit); return d ? `M${d.q} ${d.module}` : unit; }
  const d = decks.find((x) => x.slug === unit); return d ? `M${d.q} L${d.lesson} ${d.title}` : unit;
}
// A whole-module tick replaces any of that module's single-lesson ticks.
export function normalizeScope(units, decks) {
  const mods = new Set(units.filter((u) => /^m\d+$/.test(u)));
  return [...new Set(units)].filter((u) => mods.has(u) || !mods.has("m" + (decks.find((d) => d.slug === u)?.q)));
}

// ---------- weights: percentages per unit, always summing to exactly 100 ----------
export function balance(units) {
  const n = units.length, w = {}; if (!n) return w;
  const base = Math.floor(100 / n); let extra = 100 - base * n;
  for (const u of units) w[u] = base + (extra-- > 0 ? 1 : 0);
  return w;
}
// Set one unit's weight and rescale the others so the total stays 100 (integers, largest remainder).
export function setWeight(weights, unit, value) {
  const units = Object.keys(weights); if (units.length <= 1) return units.length ? { [unit]: 100 } : {};
  const v = Math.max(0, Math.min(100, Math.round(value))), others = units.filter((u) => u !== unit);
  const rest = others.reduce((t, u) => t + weights[u], 0);
  const raw = others.map((u) => [u, rest > 0 ? (weights[u] / rest) * (100 - v) : (100 - v) / others.length]);
  return { ...largest(raw, 100 - v), [unit]: v };
}
export function normalizeWeights(weights, units) {
  const raw = units.map((u) => [u, Math.max(0, +weights[u] || 0)]), t = raw.reduce((s, [, x]) => s + x, 0);
  if (!t) return balance(units);
  return largest(raw.map(([u, x]) => [u, (x / t) * 100]), 100);
}
function largest(raw, total) {
  const out = {}; let s = 0;
  for (const [u, x] of raw) { out[u] = Math.floor(x); s += out[u]; }
  for (const [u] of [...raw].sort((a, b) => (b[1] % 1) - (a[1] % 1))) { if (s >= total) break; out[u]++; s++; }
  return out;
}

// ---------- allocation: how many questions each unit gives, clamped to what exists ----------
// Returns {take: {unit: n}, notes: [{unit, available}], total}. Shortfall from a clamped unit moves to
// units that still have room, in proportion to their weights.
export function allocate(units, weights, count, avail) {
  const w = normalizeWeights(weights, units), take = {}, notes = [];
  const cap = units.reduce((t, u) => t + avail[u], 0), n = Math.max(0, Math.min(count, cap));
  const raw = units.map((u) => [u, (w[u] / 100) * n]);
  Object.assign(take, largest(raw, n));
  for (const u of units) if (take[u] > avail[u]) { notes.push({ unit: u, available: avail[u] }); take[u] = avail[u]; }
  let left = n - units.reduce((t, u) => t + take[u], 0);
  while (left > 0) {
    const open = units.filter((u) => take[u] < avail[u]); if (!open.length) break;
    const best = open.sort((a, b) => (w[b] + 1) / (take[b] + 1) - (w[a] + 1) / (take[a] + 1))[0];
    take[best]++; left--;
  }
  return { take, notes, total: units.reduce((t, u) => t + take[u], 0) };
}

// ---------- draw: seeded so Retry with new mix gives a different but reproducible set ----------
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function draw(units, take, index, decks, seed = Date.now(), avoid = new Set()) {
  const r = rng(seed), out = [];
  for (const u of units) {
    const ids = unitIds(u, index, decks), fresh = ids.filter((x) => !avoid.has(x.id)), stale = ids.filter((x) => avoid.has(x.id));
    const pick = [...shuffle(fresh, r), ...shuffle(stale, r)].slice(0, take[u] || 0);
    out.push(...pick.map((x) => ({ ...x, unit: u })));
  }
  return shuffle(out, r);
}
function shuffle(a, r) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---------- grading: never pretend to know more than we do ----------
// Auto-check only when an item carries a machine-checkable key. Today no Study Questions item has one
// (answers are worked prose), so every question is self-graded. Socrates/Tesla: add item.key as
// {type: "number", value, tol} or {type: "choice", value} and it auto-checks with no UI change.
export function answerKey(item) { return item && item.key && (item.key.type === "number" || item.key.type === "choice") ? item.key : null; }
export function autoCheck(key, response) {
  if (!key || response == null || response === "") return null;
  if (key.type === "choice") return String(response).trim().toLowerCase() === String(key.value).trim().toLowerCase();
  const x = parseFloat(String(response).replace(/[, ]/g, "")); if (!isFinite(x)) return false;
  const tol = key.tol ?? 0.02; return Math.abs(x - key.value) <= Math.abs(key.value) * tol + 1e-12;
}
// result per question: "right" | "wrong" | "skipped"; how: "auto" | "self" | null
export function score(answers) {
  const graded = answers.filter((a) => a.result === "right" || a.result === "wrong");
  const right = graded.filter((a) => a.result === "right").length;
  return { right, total: answers.length, graded: graded.length, pct: answers.length ? Math.round((right / answers.length) * 100) : 0,
    missed: answers.filter((a) => a.result !== "right").map((a) => a.id), flagged: answers.filter((a) => a.flag).map((a) => a.id) };
}

// ---------- struggle signal: placeholder until Socrates/Tesla define it ----------
// Per lesson: missed + flagged + low auto-check, over questions attempted. 0 = fine, 1 = all struggle.
export function struggle(answers) {
  const by = {};
  for (const a of answers) {
    const s = (by[a.slug] ||= { seen: 0, missed: 0, flagged: 0, autoLow: 0 });
    s.seen++; if (a.result !== "right") s.missed++; if (a.flag) s.flagged++; if (a.how === "auto" && a.result === "wrong") s.autoLow++;
  }
  for (const s of Object.values(by)) s.score = Math.min(1, (s.missed + 0.5 * s.flagged + 0.5 * s.autoLow) / Math.max(1, s.seen));
  return by;
}

// ---------- presets: ticket stubs in localStorage ----------
export const PRESET_KEY = "p101.customQuiz.presets";
export function loadPresets(store) { try { const p = JSON.parse(store.getItem(PRESET_KEY) || "[]"); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
export function savePreset(store, preset) {
  const list = loadPresets(store).filter((p) => p.name !== preset.name).map((p) => ({ ...p, last: false }));
  list.unshift({ ...preset, last: true, saved: preset.saved || Date.now() });
  store.setItem(PRESET_KEY, JSON.stringify(list.slice(0, 24))); return loadPresets(store);
}
export function markUsed(store, name) { const l = loadPresets(store).map((p) => ({ ...p, last: p.name === name })); store.setItem(PRESET_KEY, JSON.stringify(l)); return l; }
export function deletePreset(store, name) { const l = loadPresets(store).filter((p) => p.name !== name); store.setItem(PRESET_KEY, JSON.stringify(l)); return l; }

// ---------- session record: what goes to localStorage and, when signed in, the student's record ----------
// Shape written to boards/{b}/students/{s}.studyQuiz (see docs/physics101-custom-quiz.md). Bounded so the
// student doc stays small: last 20 sessions, 40 flagged ids, per-lesson rollups.
export function sessionRecord(quiz, answers, now = Date.now()) {
  const s = score(answers);
  return { at: now, units: quiz.units, n: answers.length, right: s.right, pct: s.pct, missed: s.missed, flagged: s.flagged,
    viewed: answers.filter((a) => a.viewed).length, interacted: answers.filter((a) => a.interacted).length, lessons: struggle(answers) };
}
export function mergeProfile(prev, rec) {
  const p = { sessions: [], flagged: [], lessons: {}, modules: [], viewed: 0, interacted: 0, ...(prev || {}) };
  p.sessions = [{ at: rec.at, units: rec.units, n: rec.n, right: rec.right, pct: rec.pct }, ...p.sessions].slice(0, 20);
  p.flagged = [...new Set([...rec.flagged, ...p.flagged])].slice(0, 40);
  for (const [slug, l] of Object.entries(rec.lessons)) {
    const o = (p.lessons[slug] ||= { seen: 0, missed: 0, flagged: 0, autoLow: 0 });
    for (const k of ["seen", "missed", "flagged", "autoLow"]) o[k] += l[k];
    o.score = Math.min(1, (o.missed + 0.5 * o.flagged + 0.5 * o.autoLow) / Math.max(1, o.seen));
  }
  p.modules = [...new Set([...p.modules, ...Object.keys(rec.lessons).map((s) => +s.slice(1, 3))])].sort((a, b) => a - b);
  p.viewed += rec.viewed; p.interacted += rec.interacted; p.updatedAt = rec.at;
  return p;
}
// Weak areas: lessons with struggle score >= 0.5 over at least 2 questions, worst first.
export function weakAreas(profile, limit = 5) {
  return Object.entries(profile?.lessons || {}).filter(([, l]) => l.seen >= 2 && l.score >= 0.5).sort((a, b) => b[1].score - a[1].score).slice(0, limit).map(([slug, l]) => ({ slug, ...l }));
}
// One-line teacher summary of a student's studyQuiz profile (student file v1).
export function teacherSummary(profile) {
  if (!profile || !profile.sessions?.length) return "No Custom Quiz sessions yet.";
  const w = weakAreas(profile, 3).map((l) => l.slug.toUpperCase()).join(", ");
  return `${profile.sessions.length} quiz session${profile.sessions.length === 1 ? "" : "s"}, modules ${profile.modules.join(", ")}; ${profile.viewed} questions viewed, ${profile.interacted} interacted; ${profile.flagged.length} flagged` + (w ? `; struggling: ${w}` : "");
}
// Teacher notebook rows (Leo's cq-heat-notebook / cq-teacher-page as data): lessons worst first, heat 0-4.
export function heatRows(profile, limit = 12) {
  return Object.entries(profile?.lessons || {}).sort((a, b) => b[1].score - a[1].score).slice(0, limit)
    .map(([slug, l]) => ({ slug, heat: Math.min(4, Math.round(l.score * 4)), seen: l.seen, missed: l.missed, flagged: l.flagged }));
}

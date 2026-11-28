// Stellar Life Cycle VR: track data and stage rules. Pure functions (no DOM, no three) so node tests can run them.
// Every L, Teff, R, age and current mass on screen comes from here: MIST v1.2 EEP tracks interpolated by EEP
// (Tesla section 0), Bedard et al. 2020 white dwarf cooling, and two drawn-not-modelled segments that are always dashed:
// 0.2 Suns after the MIST end ("predicted") and 40 Suns after 4.99 million years ("models differ from here").
export const MASSES = ["0.2", "1", "3", "15", "40"];
export const MASS_LABEL = { "0.2": "0.2 Suns", "1": "1 Sun", "3": "3 Suns", "15": "15 Suns", "40": "40 Suns" };

export function prepareTracks(json) {
  const out = {};
  for (const m of MASSES) {
    const e = json.masses[m]; const t = e.track; const sh = e.shift || { dlogTeff: 0, dlogL: 0, dlogR: 0 };
    const n = t.eep.length; const rows = [];
    for (let i = 0; i < n; i++) rows.push({ eep: t.eep[i], age: t.age[i], mass: t.mass[i], logL: t.logL[i] + sh.dlogL, logT: t.logT[i] + sh.dlogTeff, logR: t.logR[i] + sh.dlogR, phase: t.phase[i], xh1: t.xh1[i], logTc: t.logTc[i] });
    const wd = e.wd ? e.wd.coolAge.map((ca, i) => ({ coolAge: ca, logL: e.wd.logL[i], logT: e.wd.logT[i], logR: e.wd.logR[i] })) : null;
    out[m] = { m, rows, wd, wdSeq: e.wd ? e.wd.seq : null, shift: e.shift || null, eepMax: rows[n - 1].eep, end: rows[n - 1] };
    const zi = rows.findIndex((r) => r.phase === 0); const ms = rows.filter((r) => r.phase === 0);
    out[m].zams = rows[zi]; out[m].msEnd = ms[ms.length - 1]; out[m].tMS = ms[ms.length - 1].age - rows[zi].age;
    out[m].tPMS = rows[zi].age;
  }
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
/** Interpolate a MIST track at a (fractional) EEP. Interpolates log L, log Teff, log R, log age by EEP (Tesla section 0). */
export function atEEP(tr, eep) {
  const R = tr.rows; if (eep <= R[0].eep) return { ...R[0] }; if (eep >= R[R.length - 1].eep) return { ...R[R.length - 1] };
  let lo = 0, hi = R.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (R[mid].eep <= eep) lo = mid; else hi = mid; }
  const a = R[lo], b = R[hi], t = (eep - a.eep) / (b.eep - a.eep);
  return { eep, age: Math.pow(10, lerp(Math.log10(a.age), Math.log10(b.age), t)), mass: lerp(a.mass, b.mass, t), logL: lerp(a.logL, b.logL, t), logT: lerp(a.logT, b.logT, t), logR: lerp(a.logR, b.logR, t), phase: t < 0.5 ? a.phase : b.phase, xh1: lerp(a.xh1, b.xh1, t), logTc: lerp(a.logTc, b.logTc, t) };
}
export function eepAtAge(tr, age) { const R = tr.rows; for (let i = 1; i < R.length; i++) if (R[i].age >= age) { const a = R[i - 1], b = R[i]; const t = (Math.log10(age) - Math.log10(a.age)) / (Math.log10(b.age) - Math.log10(a.age)); return lerp(a.eep, b.eep, Math.max(0, Math.min(1, t))); } return R[R.length - 1].eep; }

/** White dwarf cooling at fraction u of the shown cooling run (log cooling age from 10^4 yr to the end of the grid row set). */
export function wdAt(tr, u) {
  const W = tr.wd; const end = tr.end; const n = W.length;
  const a0 = Math.max(W[1].coolAge, 1e4), a1 = W[n - 1].coolAge; const ca = u <= 0 ? 0 : Math.pow(10, lerp(Math.log10(a0), Math.log10(a1), u));
  let i = 1; while (i < n - 1 && W[i].coolAge < ca) i++;
  const A = W[i - 1], B = W[i]; const t = B.coolAge > A.coolAge ? Math.max(0, Math.min(1, (ca - A.coolAge) / (B.coolAge - A.coolAge))) : 0;
  return { coolAge: ca, age: (tr.m === "0.2" ? end.age : end.age) + ca, logL: lerp(A.logL, B.logL, t), logT: lerp(A.logT, B.logT, t), logR: lerp(A.logR, B.logR, t), mass: tr.m === "0.2" ? null : end.mass, phase: 10 };
}

/** 0.2 Suns after the MIST end: a dashed, labelled "predicted" curve from the MIST end to the start of the cooling grid.
 * The shape is schematic (hotter and a little brighter, then shrinking), after Laughlin, Bodenheimer & Adams 1997; it is not digitized. */
export function predictedAt(tr, u) {
  const a = tr.end, w = tr.wd[0];
  const p0 = [a.logT, a.logL], p1 = [a.logT + 0.22, a.logL + 0.18], p2 = [w.logT - 0.18, w.logL + 0.25], p3 = [w.logT, w.logL];
  const b = (k) => (1 - u) ** 3 * p0[k] + 3 * (1 - u) ** 2 * u * p1[k] + 3 * (1 - u) * u * u * p2[k] + u ** 3 * p3[k];
  return { logT: b(0), logL: b(1), logR: lerp(a.logR, w.logR, u * u), age: a.age, mass: a.mass, phase: 11, predicted: true };
}
export function predictedPath(tr, n = 40) { const pts = []; for (let i = 0; i <= n; i++) pts.push(predictedAt(tr, i / n)); return pts; }

/** Resolve a stage's MIST EEP range for a mass. */
export function stageRange(tr, stage, prevRange) {
  const seg = stage.seg; if (seg.type !== "mist" && seg.type !== "mist+wd") return null;
  const f = seg.from, t = seg.to;
  let e0 = f.eep != null ? f.eep : f.after ? (prevRange ? prevRange[1] : 1) : 1;
  let e1 = t.end ? tr.eepMax : t.eep != null ? t.eep : 202;
  if (t.ageMax != null) { const age = Math.min(t.ageMax, (t.fracPMS || 1) * tr.tPMS); e1 = eepAtAge(tr, age); }
  return [Math.min(e0, tr.eepMax), Math.min(e1, tr.eepMax)];
}

/** Tesla's star-type labels. Red supergiant rule (15 Suns, H2): log Teff < 3.60 and MIST phase >= 2. */
export function typeLabel(mass, row) {
  if (!row) return "";
  const m = +mass;
  if (row.phase === 10) return m < 0.5 ? "Helium white dwarf (predicted)" : "White dwarf";
  if (row.phase === 11) return "Late life (predicted)";
  if (row.phase === -1) return "Young star, contracting";
  if (row.phase === 0) return m < 0.5 ? "Red dwarf, main sequence" : "Main sequence";
  if (m < 0.5) return "Red dwarf, end of its main sequence";
  if (m >= 10) {
    if (row.logT < 3.60 && row.phase >= 2) return "Red supergiant";
    return row.logT < 3.75 ? "Yellow supergiant" : "Blue supergiant";
  }
  if (row.phase === 2) return row.logR > 1.2 ? "Red giant" : "Subgiant";
  if (row.phase === 3) return "Core helium fusion";
  if (row.phase === 4 || row.phase === 5) return "Asymptotic giant branch";
  if (row.phase === 6) return row.logT > 4.0 ? "Hot core of a planetary nebula" : "Leaving the giant branch";
  return "";
}
export const isRSG = (row) => row && row.logT < 3.60 && row.phase >= 2;
/** H3 (fusion in shells) starts at MIST phase 4, which is EEP 707. */
export const shellsStart = (tr) => { const r = tr.rows.find((x) => x.phase >= 4); return r ? r.eep : null; };

/** Caption cards: a caption of more than two sentences is split over cards of at most two sentences (teaching spec 3, T3). */
export function splitCaption(s) {
  if (!s) return [];
  const parts = s.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g).map((x) => x.trim()).filter(Boolean);
  const merged = []; for (const p of parts) { if (merged.length && /\($/.test(merged[merged.length - 1])) merged[merged.length - 1] += " " + p; else merged.push(p); }
  const out = []; for (let i = 0; i < merged.length; i += 2) out.push(merged.slice(i, i + 2).join(" "));
  return out;
}

export function stagesFor(S, mass) {
  const f = S.formation.map((st) => ({ ...st, caption: st.captionBy ? st.captionBy[mass] : st.caption, act: (st.actBy && st.actBy[mass]) || st.act }));
  return f.concat(S.tracks[mass]);
}

/** Round to the house style: about N, 1 or 2 significant figures, with commas. */
export function about(v, sig = 2) {
  if (!isFinite(v)) return "?"; if (v === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(v))); const p = Math.pow(10, e - sig + 1); const r = Math.round(v / p) * p;
  if (r >= 1000) return Math.round(r).toLocaleString("en-US");
  if (e - sig + 1 >= 0) return String(Math.round(r)); const t = r.toFixed(Math.min(12, sig - 1 - e)); return t.includes(".") ? t.replace(/\.?0+$/, "") : t;   // plain decimals, never 7e-7
}
export function fmtYears(y) {
  if (y < 1 / 365.25 * 2) return `${about(y * 365.25 * 24, 2)} hours`;
  if (y < 1) return `${about(y * 365.25, 2)} days`;
  if (y < 1e6) return `${about(y, 2)} years`;
  if (y < 1e9) return `${about(y / 1e6, 2)} million years`;
  if (y < 1e12) return `${about(y / 1e9, 3)} billion years`;
  return `${about(y / 1e12, 3)} trillion years`;
}
/** Main-sequence lifetime ratio to the Sun's, from MIST at run time (Tesla answer 8). */
export function msRatio(tracks, mass) { return tracks["1"].tMS / tracks[mass].tMS; }

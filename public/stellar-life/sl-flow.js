// Stellar Life Cycle VR: the lesson flow (teaching spec v1.3 sections 2 and 3). Pure state, no DOM or three,
// so node tests can drive it. HUB (pick a mass, predict) -> formation F1 to F5 -> the mass track -> remnant -> HUB.
// Rule T1: a stage with a P (predict) action cannot play until the choice is committed. The reveal shows the
// student's choice next to the model and never marks it wrong.
import { createCompare, newCard, applyFrame, snapToZone } from "./sl-compare.js";
import { stagesFor, stageRange, atEEP, wdAt, predictedAt, predictedPath, typeLabel, isRSG, msRatio, about, fmtYears, MASS_LABEL } from "./sl-data.js";

export function createFlow(S, tracks, opts = {}) {
  const st = {
    screen: "hub", hubStep: "pick", mass: null, stages: [], ranges: [], si: 0, t: 0, phase: "predict", playing: true,
    answers: {}, cardIdx: 0, toggles: { ir: false, cut: true, scope: false, swap: false }, pins: [], help: opts.help || 0, lockHelp: !!opts.lockHelp,
    tier: [1, 2, 3].includes(opts.tier) ? opts.tier : 2, card: newCard(), seen: [],
    runs: [], ghosts: [], skipFormation: false, pathFirst: null, massGuess: {}, timebar: null, peek: false, optionalShown: {},
  };
  const api = { st, S, tracks };
  api.cmp = createCompare(tracks);

  api.pickMass = (m) => { if (!tracks[m]) return; st.mass = m; st.hubStep = "end"; st.pins = []; };
  api.answerHub = (choice) => { st.answers["H-End"] = choice; st.hubStep = "pins"; };
  api.addPin = (p0) => { if (st.pins.length >= 3) return; const p = st.tier === 1 ? snapToZone(p0) : p0;   // Tier 1: pins snap to the highlighted zones
    st.pins.push({ ...p, n: st.pins.length + 1, label: S.hub[2].act[0].pins[st.pins.length] }); if (st.pins.length === 3) st.hubStep = "ready"; };
  api.undoPin = () => { st.pins.pop(); st.hubStep = "pins"; };
  /** Teaching spec 3.0: "Skip" is offered only after the first track. A skipped formation drops F1 to F5, except that
   * 15 and 40 Suns still play F4 (the massive-star difference: still wrapped in its cloud) as a 20 s fast version. */
  api.canSkip = () => st.runs.length > 0;
  api.hubReady = () => !!st.mass && st.answers["H-End"] != null && st.pins.length === 3;
  api.start = () => {
    if (!api.hubReady()) return false;   // skipping never jumps past the HUB prediction
    let list = stagesFor(S, st.mass); const massive = st.mass === "15" || st.mass === "40";
    st.skipped = api.canSkip() && st.skipFormation;
    if (st.skipped) list = list.filter((x) => !/^F/.test(x.id) || (x.id === "F4" && massive)).map((x) => (x.id === "F4" ? { ...x, dur: 20, act: [{ code: "O" }], fast: true } : x));
    st.stages = list; st.ranges = []; let prev = null;
    for (const x of list) { const r = stageRange(tracks[st.mass], x, prev); st.ranges.push(r); if (r) prev = r; }
    st.screen = "stage"; api.enter(0); return true;
  };
  api.stage = () => st.stages[st.si];
  api.actKey = (i) => `${api.stage().id}:${i}`;
  api.pending = () => {   // the first uncommitted prediction (P, or a K with choices) of this stage
    const s = api.stage(); if (!s) return null;
    const acts = s.act || [];
    for (let i = 0; i < acts.length; i++) { const a = acts[i]; if (a.kind === "pathOrder") { if (!st.pathFirst) return { i, a }; continue; }
      const needs = (a.code === "P") || (a.code === "K" && a.choices && !a.kind); if (needs && st.answers[api.actKey(i)] == null) return { i, a }; }
    return null;
  };
  api.enter = (i) => { st.hold = 0; st.held = false;
    st.si = Math.max(0, Math.min(st.stages.length - 1, i)); st.t = 0; st.cardIdx = 0; st.playing = true; st.timebar = null; st.peek = false;
    st.phase = api.pending() ? "predict" : "play";
    const s = api.stage(); st.toggles.cut = true; st.toggles.scope = false; st.toggles.swap = false; if (s.id === "F1") st.toggles.ir = false;
  };
  api.commit = (i, choice) => {
    const a = (api.stage().act || [])[i]; if (a && a.kind === "pathOrder") st.pathFirst = choice; else st.answers[api.actKey(i)] = choice;
    if (a && a.kind === "massMeter") st.massGuess[api.stage().id] = +choice;
    if (!api.pending()) { st.phase = "play"; st.t = 0; }
  };
  api.tick = (dt) => {
    if (st.screen !== "stage" || st.phase !== "play" || !st.playing) return;
    const s = api.stage(); const h = api.holdT();
    // S7 (1 Sun): dwell about 3 s at today's age of the universe, 13.8 billion years, then keep cooling (Leo's frame 2c)
    if (h != null && !st.held && st.t <= h && st.t + dt / (s.dur || 10) >= h) { st.t = h; st.hold = 3; st.held = true; return; }
    if (st.hold > 0) { st.hold -= dt; return; }
    st.t = Math.min(1, st.t + dt / (s.dur || 10)); if (st.t >= 1) st.phase = "done";
  };
  /** The stage fraction where the white dwarf reaches stage.holdAge (years since the star formed), or null. */
  api.holdT = () => {
    const s = api.stage(); if (!s || !s.holdAge || st.mass !== "1" || !s.seg || s.seg.type !== "wd") return null; const tr = api.tracks[st.mass]; if (!tr || !tr.wd) return null;
    const W = tr.wd, n = W.length; const a0 = Math.max(W[1].coolAge, 1e4), a1 = W[n - 1].coolAge; const ca = s.holdAge - tr.end.age; if (!(ca > a0 && ca < a1)) return null;
    return (Math.log10(ca) - Math.log10(a0)) / (Math.log10(a1) - Math.log10(a0));
  };
  api.setT = (t) => { st.t = Math.max(0, Math.min(1, t)); st.held = false; st.hold = 0; if (st.phase === "predict") return; st.phase = st.t >= 1 ? "done" : "play"; };
  api.next = () => {
    if (st.si < st.stages.length - 1) {
      const skipping = st.phase !== "done" ? api.skipYears() : 0;
      api.enter(st.si + 1); return { skipped: skipping };
    }
    api.finishRun(); return { toHub: true };
  };
  api.prev = () => { if (st.si > 0) api.enter(st.si - 1); };
  api.finishRun = () => {
    if (!st.runs.includes(st.mass)) st.runs.push(st.mass); if (!st.seen.includes(st.mass)) st.seen.push(st.mass);
    const g = api.trailFor(st.mass, 1e9, true); st.ghosts = st.ghosts.filter((x) => x.mass !== st.mass).concat([{ mass: st.mass, label: MASS_LABEL[st.mass], pts: g.pts, dashed: false }]);
    st.screen = "hub"; st.hubStep = "pick"; st.mass = null; st.skipFormation = true;
  };
  api.toHub = () => { st.screen = "hub"; st.hubStep = "pick"; st.mass = null; };
  // COMPARE is offered any time after one track (section 2.2, branch point 5); the Mass Card and exit ticket too.
  api.canCompare = () => st.runs.length > 0;
  api.openCompare = () => { if (!api.canCompare()) return false; api.cmp.reset(); st.screen = "compare"; return true; };
  api.compareDone = () => { for (const m of api.cmp.c.pair) if (!st.seen.includes(m)) st.seen.push(m); };
  api.openCard = () => { if (!api.canCompare()) return false; st.screen = "card"; return true; };
  api.openTicket = () => { st.screen = "ticket"; return true; };
  api.setCard = (m, field, value) => { if (m === "frame") { st.card.frame[+field] = value; applyFrame(st.card); } else if (m === "sentence") st.card[field] = value; else if (st.card.rows[m]) st.card.rows[m][field] = value; };
  api.setHelp = (h, fromUrl = false) => { if (st.lockHelp && !fromUrl) return false; if (h === 2 && !fromUrl) return false; st.help = h; return true; };   // T6: level 2 only from the QR URL
  api.skipYears = () => { const a = api.view(); const s = api.stage(); const end = api.view({ t: 1 }); return a.age != null && end.age != null ? end.age - a.age : 0; };

  // full trail for a mass (ZAMS on for massive stars, LOOK-SPEC 4), up to eep
  api.trailFor = (m, eep, ghost = false) => {
    const tr = tracks[m]; const fromZ = ghost || m === "15" || m === "40"; const z = tr.zams.eep;
    const pts = tr.rows.filter((r) => r.eep <= eep && (!fromZ || r.eep >= z)).map((r) => ({ logT: r.logT, logL: r.logL }));
    return { pts };
  };

  /** Everything the screen needs at the current (or a given) moment. */
  api.view = (o = {}) => {
    const s = api.stage(); const m = st.mass; const tr = m ? tracks[m] : null; const t = o.t != null ? o.t : st.t;
    const v = { stage: s, mass: m, t, row: null, dot: null, noDot: null, trail: [], fork: null, predictedLabel: null, today: null, age: null, ageLabel: "", view: "normal", hideTeff: false, clock: null, onion: null, type: "", rsg: false, cooling: null, sceneKind: s ? s.scene : "hub" };
    if (!s || !tr) return v;
    const r = st.ranges[st.si]; const seg = s.seg;
    let row = null, eepNow = null;
    if (seg.type === "mist" || seg.type === "mist+wd") {
      let u = t; if (seg.thenFreeze) u = Math.min(1, t / 0.35); if (seg.thenFork) u = Math.min(1, t / 0.7); if (seg.type === "mist+wd") u = Math.min(1, t / 0.5);
      if (st.timebar != null && s.act && s.act.some((a) => a.kind === "timebar")) u = st.timebar;
      eepNow = r[0] + (r[1] - r[0]) * u; row = atEEP(tr, eepNow);
      if (seg.type === "mist+wd" && t > 0.5) { row = wdAt(tr, (t - 0.5) / 0.5 * 0.55); v.cooling = row; v.sceneKind = "wd"; }
      if (seg.thenFork && t > 0.7) v.fork = tr.end;
      if (seg.thenFreeze && t > 0.35) v.onion = (t - 0.35) / 0.65;
    } else if (seg.type === "wd") { row = wdAt(tr, t); v.cooling = row; v.view = "wide"; }
    else if (seg.type === "predicted") { row = predictedAt(tr, t); }
    else if (seg.type === "freeze" || seg.type === "fork" || seg.type === "gone") { row = { ...tr.end }; }
    else if (seg.type === "clock") { v.clock = { years: seg.from + (seg.to - seg.from) * t, label: "since the collapse began" }; }
    if (s.scene === "cutaway" && s.cut === "onionBars") v.onion = t;
    const massive = m === "15" || m === "40"; const hideDot = s.seg.zamsOnlyFor && s.seg.zamsOnlyFor.includes(m);
    v.row = row; v.type = row ? typeLabel(m, row) : ""; v.rsg = isRSG(row);
    // trail: MIST up to now, then the dashed pieces
    const eepTrail = eepNow != null ? eepNow : (seg.type === "none" || seg.type === "clock") ? 0 : tr.eepMax;
    const pre = st.si < st.stages.findIndex((x) => x.id === "F3");
    if (!pre && !hideDot) {
      const base = api.trailFor(m, eepTrail).pts; if (row && eepNow != null) base.push({ logT: row.logT, logL: row.logL });
      v.trail.push({ pts: base });
      const after = (k) => st.stages.findIndex((x) => x.id === k) <= st.si;
      if (m === "0.2" && (seg.type === "predicted" || seg.type === "wd")) {
        const p = predictedPath(tr).filter((q, i, a) => seg.type === "wd" || i / (a.length - 1) <= t); if (seg.type === "predicted" && row) p.push({ logT: row.logT, logL: row.logL });
        v.trail.push({ pts: p, dashed: true }); v.predictedLabel = p[Math.floor(p.length / 2)] || null;
      }
      if (v.cooling) { const W = tr.wd; const pts = []; for (let i = 0; i <= 60; i++) { const q = wdAt(tr, (i / 60) * (seg.type === "mist+wd" ? (t - 0.5) / 0.5 * 0.55 : t)); pts.push({ logT: q.logT, logL: q.logL }); } v.trail.push({ pts, dashed: m === "0.2" }); if (m !== "0.2") v.view = "wide"; }
      if (m === "40" && (seg.type === "fork" || seg.type === "gone" || v.fork)) v.fork = tr.end;
      if (s.id === "S1" && after("S1")) { v.today = atEEP(tr, eepAtAgeSafe(tr, 4.6e9)); }
    }
    if (row && !hideDot && !pre && seg.type !== "gone" && seg.type !== "fork" && !(m === "40" && v.fork)) v.dot = { logT: row.logT, logL: row.logL };
    if (seg.type === "gone") v.noDot = { logT: tr.end.logT, logL: tr.end.logL };
    if (m === "40" && (seg.type === "gone")) v.fork = tr.end;
    v.age = v.clock ? null : row ? row.age : null;
    v.hideTeff = !!s.hideTeff || seg.type === "gone" || seg.type === "fork";
    if (s.ref === "msRing") v.refR = Math.pow(10, tr.end.logR);
    // the stage's largest radius (Suns), for the camera framing: the star fills Leo's share of the frame at its biggest
    if (row && (seg.type === "mist" || seg.type === "mist+wd" || seg.type === "predicted")) { const key = m + ":" + st.si; if (st._maxRKey !== key) { let mx = 0; for (let i = 0; i <= 48; i++) { const q = seg.type === "predicted" ? predictedAt(tr, i / 48) : atEEP(tr, r[0] + (r[1] - r[0]) * i / 48); if (q) mx = Math.max(mx, Math.pow(10, q.logR)); } st._maxRKey = key; st._maxR = mx; } v.maxR = st._maxR; }   // R2: its size at the end of its main sequence, same scale
    // round 9: the swell window (a swell of about 3 s): centred on the steepest growth of the radius, with the radius at both ends, so the scene can ease its drawn size in and out (smoothstep on log radius) and then rejoin the track exactly
    if (row && seg.type === "mist" && !seg.thenFreeze && !seg.thenFork && /^(H2|V2)$/.test(s.id)) { const key = m + ":" + st.si;
      if (st._swKey !== key) { const N = 80, lg = []; for (let i = 0; i <= N; i++) lg.push(atEEP(tr, r[0] + (r[1] - r[0]) * i / N).logR); let bi = 0, bd = -1; for (let i = 0; i < N; i++) if (lg[i + 1] - lg[i] > bd) { bd = lg[i + 1] - lg[i]; bi = i; }
        const half = 1.5 / (s.dur || 14), tc = (bi + 0.5) / N, a = Math.max(0, tc - half), b = Math.min(1, a + 2 * half); const ia = Math.round(a * N), ib = Math.round(b * N);
        st._swKey = key; st._sw = { a: ia / N, b: ib / N, la: lg[ia], lb: lg[ib] }; }
      v.swell = st._sw; }
    v.hideDotNote = hideDot ? "Its track starts on the main sequence. It is still wrapped in its cloud." : "";
    return v;
  };
  function eepAtAgeSafe(tr, age) { const R = tr.rows; for (let i = 1; i < R.length; i++) if (R[i].age >= age) { const a = R[i - 1], b = R[i]; return a.eep + (b.eep - a.eep) * (Math.log10(age) - Math.log10(a.age)) / (Math.log10(b.age) - Math.log10(a.age)); } return R[R.length - 1].eep; }

  /** The model's answer for a prediction (derived from MIST at run time where the spec says so). */
  api.modelAnswer = (a) => {
    const m = st.mass; const tr = tracks[m];
    if (a.answer) return a.answer;
    if (a.answerFrom === "msRatio") { const r = msRatio(tracks, m); return r > 100 ? "about 300" : r > 10 ? "about 30" : "about 3"; }
    if (a.answerFrom === "finalMass") return `about ${about(tr.end.mass, 2)} Suns`;
    if (a.answerFrom === "mistEndMass") return `about ${about(tr.end.mass, 3)} Suns at the end of the model trail, then models differ from here`;
    if (a.reveal) return a.reveal;
    return "";
  };
  api.revealText = (a) => {
    const m = st.mass;
    if (a.revealFrom === "msRatio") return `Shorter. Its life is about ${about(msRatio(tracks, m), 1)} times shorter than the Sun's.`;
    if (a.answerFrom === "msRatio") return `About ${about(msRatio(tracks, m), 1)} times shorter (from the model ages).`;
    return "";
  };
  return api;
}

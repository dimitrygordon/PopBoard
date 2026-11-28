// Live score and sound effects for the VR storybook. Oscillators and noise only,
// so there is nothing to license. A recorded track replaces the score when
// audio/vr4d/manifest.json sets "score" to a filename next to the clips.
// Narration itself is the storybook player (ac-narrate.js); this file ducks under it.

const NOTE = {
  D2: 73.42, D3: 146.83, A3: 220, D4: 293.66, Fs4: 369.99,
  Cs5: 554.37, D5: 587.33, E5: 659.25, A5: 880,
};

const PATTERNS = {
  open: { period: 8, notes: [
    { t: 0, f: NOTE.D3, d: 8.2, k: "pad", g: 0.11 },
    { t: 3.2, f: NOTE.D5, d: 0.7, k: "bell", g: 0.05 },
  ] },
  lullaby: { period: 7, notes: [
    { t: 0.2, f: NOTE.D3, d: 0.45, k: "box", g: 0.07 },
    { t: 1.8, f: NOTE.A3, d: 0.4, k: "box", g: 0.055 },
    { t: 3.6, f: NOTE.D3, d: 0.5, k: "box", g: 0.05 },
    { t: 5.2, f: NOTE.A3, d: 0.35, k: "box", g: 0.045 },
  ] },
  out: { period: 8, notes: [
    { t: 0, f: NOTE.D3, d: 8.2, k: "pad", g: 0.1 },
    { t: 0, f: NOTE.Fs4, d: 8.2, k: "pad", g: 0.045 },
  ] },
  lamp: { period: 4, notes: [
    { t: 0.0, f: NOTE.D4, d: 0.12, k: "pizz", g: 0.05 },
    { t: 0.7, f: NOTE.A3, d: 0.12, k: "pizz", g: 0.045 },
    { t: 1.6, f: NOTE.Fs4, d: 0.12, k: "pizz", g: 0.04 },
    { t: 2.5, f: NOTE.D4, d: 0.14, k: "pizz", g: 0.04 },
  ] },
  build: { period: 8, notes: [
    { t: 0, f: NOTE.D3, d: 8.2, k: "pad", g: 0.08 },
  ] },
  inside: { period: 10, notes: [
    { t: 0, f: NOTE.D3, d: 10.2, k: "pad", g: 0.07 },
    { t: 0, f: NOTE.A3, d: 10.2, k: "pad", g: 0.04 },
    { t: 0, f: NOTE.Fs4, d: 10.2, k: "pad", g: 0.03 },
    { t: 0, f: NOTE.Cs5, d: 10.2, k: "pad", g: 0.02 },
    { t: 0, f: NOTE.E5, d: 10.2, k: "pad", g: 0.018 },
  ] },
  turn: { period: 8, notes: [
    { t: 0, f: NOTE.D3, d: 8.2, k: "pad", g: 0.08 },
    { t: 0.4, f: NOTE.A3, d: 0.35, k: "bell", g: 0.05 },
    { t: 1.1, f: NOTE.D4, d: 0.4, k: "bell", g: 0.045 },
    { t: 1.9, f: NOTE.A3, d: 0.5, k: "bell", g: 0.04 },
  ] },
};

const CUE_FOR = {
  cover: "open", flick: "lullaby", flatland: "out", shadow: "lamp",
  build: "build", tesseract: "inside", hyper: "turn", finale: "turn",
};

export function createAudio() {
  let ctx = null, master, musicGain, sfxGain, shimmer, hum;
  let cue = "open", nextAt = 0, synthOn = true, recorded = null;
  let started = false;
  const bed = 0.18;

  function start() {
    if (started) { if (ctx.state === "suspended") ctx.resume(); return; }
    started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createDynamicsCompressor();
    master.threshold.value = -2;
    master.knee.value = 6;
    master.ratio.value = 3;
    master.attack.value = 0.01;
    master.release.value = 0.25;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = bed;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    shimmer = held(NOTE.D4);
    hum = held(NOTE.D3);
    if (ctx.listener.positionX) {
      ctx.listener.positionX.value = 0;
      ctx.listener.positionY.value = 1.35;
      ctx.listener.positionZ.value = 0;
    }
  }

  function held(freq) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g); g.connect(musicGain); o.start();
    return { o, g };
  }

  function env(g, t, peak, attack, dur) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, type, peak, at, dest) {
    if (!ctx) return;
    const t = at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    env(g, t, peak, Math.min(0.03, dur * 0.3), dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }

  function noise(dur, freq, q, peak, type = "bandpass") {
    if (!ctx) return;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    env(g, t, peak, 0.01, dur);
    src.connect(f); f.connect(g); g.connect(sfxGain); src.start(t);
    return { g, f };
  }

  function playNote(n, t) {
    if (n.k === "pad") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = n.f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(n.g, t + 0.6);
      g.gain.setValueAtTime(n.g, t + n.d - 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + n.d + 0.05);
    } else if (n.k === "box" || n.k === "bell") {
      tone(n.f, n.d, "sine", n.g, t, musicGain);
      if (n.k === "bell") tone(n.f * 2.01, n.d * 0.6, "sine", n.g * 0.3, t, musicGain);
    } else if (n.k === "pizz") {
      tone(n.f, n.d, "triangle", n.g, t, musicGain);
    }
  }

  function tickMusic() {
    if (!ctx || !synthOn) return;
    const t = ctx.currentTime;
    if (t + 0.15 < nextAt) return;
    const p = PATTERNS[cue] || PATTERNS.open;
    const base = Math.max(t + 0.05, nextAt || t + 0.05);
    for (const n of p.notes) playNote(n, base + n.t);
    nextAt = base + p.period;
  }

  function setCue(scene) {
    const next = CUE_FOR[scene] || "open";
    if (next === cue) return;
    cue = next; nextAt = 0;
  }

  // Drop the bed 9 dB while narration plays. SFX drop 3 dB and stay audible.
  function duck(on) {
    if (!ctx) return;
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    sfxGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(on ? bed * 0.355 : bed, now, on ? 0.05 : 0.18);
    sfxGain.gain.setTargetAtTime(on ? 0.7 : 1, now, 0.05);
  }

  // Slot for a later recording. Passing a url takes the synth out and loops the file.
  async function useRecordedScore(url) {
    start();
    const el = new Audio(url);
    el.loop = true;
    el.preload = "auto";
    await el.play();
    const src = ctx.createMediaElementSource(el);
    src.connect(musicGain);
    recorded = el;
    synthOn = false;
  }

  async function loadScoreSlot(manifestUrl) {
    try {
      const r = await fetch(manifestUrl);
      if (!r.ok) return;
      const data = await r.json();
      if (!data.score) return;
      const url = new URL(data.score, new URL(manifestUrl, location.href)).href;
      await useRecordedScore(url);
    } catch { /* the generated bed keeps playing */ }
  }

  function place(node) {
    // SFX stay on the sfx bus; position is a light stereo hint, not a moving source.
    return node;
  }

  return {
    start, pump: tickMusic, setCue, duck, useRecordedScore, loadScoreSlot,
    get live() { return !!ctx; },
    pinch() { tone(1200, 0.04, "triangle", 0.12); },
    release() { tone(1500, 0.05, "triangle", 0.08); },
    extrude() { noise(0.4, 900, 0.7, 0.08, "lowpass"); tone(220, 0.4, "sine", 0.05); },
    slice() { noise(0.15, 1800, 1.2, 0.1); tone(880, 0.12, "sine", 0.06); },
    detent() { tone(520, 0.03, "triangle", 0.05); },
    tick90() { tone(NOTE.D4, 0.16, "sine", 0.08); },
    swap() { tone(NOTE.D3, 0.28, "sine", 0.09); tone(NOTE.D5, 0.22, "sine", 0.05); },
    plane(i) {
      if (!ctx) return;
      const fs = [NOTE.D3, NOTE.A3, NOTE.Fs4];
      const t0 = ctx.currentTime;
      fs.forEach((f, k) => tone(f, 0.18, "sine", k === i ? 0.09 : 0.04, t0 + k * 0.07));
    },
    page() { noise(0.9, 700, 0.4, 0.07, "lowpass"); },
    reveal() {
      if (!ctx) return;
      tone(NOTE.D5, 0.22, "sine", 0.07);
      tone(NOTE.A5, 0.28, "sine", 0.05, ctx.currentTime + 0.12);
    },
    hush() { noise(1.5, 400, 0.5, 0.05, "lowpass"); },
    lock() { tone(900, 0.04, "triangle", 0.1); },
    sparkle() { [NOTE.D5, NOTE.Fs4, NOTE.A5].forEach((f, i) => tone(f, 0.12, "sine", 0.04, ctx.currentTime + i * 0.05)); },
    nudge() { tone(NOTE.D3, 0.18, "sine", 0.05); },
    whoosh() { noise(0.8, 180, 0.6, 0.08, "lowpass"); },
    pop(up) { tone(up ? 660 : 440, 0.1, "sine", 0.07); },
    rise(i) { tone(NOTE.D3 * Math.pow(2, i / 12), 0.12, "sine", 0.05); },
    motif() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(NOTE.A3, 0.22, "sine", 0.06, t, musicGain);
      tone(NOTE.D4, 0.22, "sine", 0.06, t + 0.18, musicGain);
      tone(NOTE.A3, 0.3, "sine", 0.05, t + 0.36, musicGain);
    },
    chordNote(freq) { tone(freq, 0.6, "sine", 0.07, undefined, musicGain); },
    swell() {
      if (!ctx) return;
      [NOTE.D3, NOTE.A3, NOTE.Fs4, NOTE.Cs5, NOTE.E5].forEach((f, i) => tone(f, 2.2, "sine", 0.05, ctx.currentTime + i * 0.04, musicGain));
    },
    // Segment hum and the scene-5 shimmer follow the hand. Silent at rest.
    hum(amount) {
      if (!hum) return;
      const a = Math.max(0, Math.min(1, amount));
      hum.g.gain.setTargetAtTime(a * 0.05, ctx.currentTime, 0.05);
      hum.o.frequency.setTargetAtTime(NOTE.D3 + (NOTE.A3 - NOTE.D3) * a, ctx.currentTime, 0.08);
    },
    shimmer(speed) {
      if (!shimmer) return;
      const a = Math.max(0, Math.min(1, speed));
      shimmer.g.gain.setTargetAtTime(a * 0.04, ctx.currentTime, 0.05);
      shimmer.o.frequency.setTargetAtTime(NOTE.D4 + 180 * a, ctx.currentTime, 0.05);
    },
    place,
  };
}

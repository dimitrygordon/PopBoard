// Waves & Interference: pure physics and data. No DOM, no canvas.
// Every number shown to students comes from here (see docs/waves-science.md).

export const TAU = 2 * Math.PI;
export const SOUND_SPEED = 343;        // m/s, dry air at 20 C
export const RIPPLE_SPEED = 0.25;      // m/s, representative shallow ripple-tank speed
export const STRING_MU = 0.005;        // kg/m, linear density of the standing-wave string
export const BEAT_F1 = 440;            // Hz, tuning fork A4
export const DOPPLER_F = 440;          // Hz, source frequency
export const SINGLE_SLIT_WIDTH = 0.02e-3; // m, width of each slit in the double slit

// ---------- basic wave relations ----------
export const waveSpeed = (f, lambda) => f * lambda;          // v = f lambda
export const wavelength = (v, f) => v / f;                   // lambda = v / f
export const period = (f) => 1 / f;                          // T = 1 / f
export const stringSpeed = (tension, mu) => Math.sqrt(tension / mu); // v = sqrt(T / mu)

/** Displacement of a sinusoidal travelling wave. dir = +1 moves toward +x. */
export function travelling(x, t, { A, lambda, f, dir = 1, phase = 0 }) {
  return A * Math.sin(TAU * (x / lambda - dir * f * t) + phase);
}

/** A Gaussian pulse shape centered at 0 with half-width w. */
export const pulseShape = (s, A, w) => A * Math.exp(-(s * s) / (w * w));

/**
 * A pulse on a string of length L that starts at x0 moving toward +x at speed v.
 * At x = L the end is fixed (reflected pulse inverted) or free (upright).
 * Method of images: the reflected pulse is a mirror pulse coming from x = 2L.
 */
export function pulseOnString(x, t, { A, w, v, L, x0, end }) {
  const sign = end === "fixed" ? -1 : 1;
  const inc = pulseShape(x - (x0 + v * t), A, w);
  const ref = sign * pulseShape(x - (2 * L - x0 - v * t), A, w);
  return inc + ref;
}
export const reflectionSign = (end) => (end === "fixed" ? -1 : 1);
export const roundTripTime = (distance, v) => 2 * distance / v;

/** Two pulses heading toward each other. Superposition: displacements add. */
export function twoPulses(x, t, { A1, A2, w, v, L }) {
  const p1 = pulseShape(x - (0.2 * L + v * t), A1, w);
  const p2 = pulseShape(x - (0.8 * L - v * t), A2, w);
  return { p1, p2, sum: p1 + p2 };
}
export const overlapTime = (L, v) => (0.3 * L) / v;           // when the two centers meet at L/2
export const peakWhenOverlapping = (A1, A2) => A1 + A2;      // signed amplitudes add

// ---------- standing waves ----------
export const harmonicFrequency = (n, v, L) => (n * v) / (2 * L); // f_n = n v / 2L
export const harmonicWavelength = (n, L) => (2 * L) / n;         // lambda_n = 2L / n
export const nodePositions = (n, L) => Array.from({ length: n + 1 }, (_, k) => (k * L) / n);
export const antinodePositions = (n, L) => Array.from({ length: n }, (_, k) => ((k + 0.5) * L) / n);
/** Standing wave y = 2A sin(k x) cos(w t), the sum of two equal waves moving opposite ways. */
export function standing(x, t, { A, n, L, v }) {
  const lam = harmonicWavelength(n, L), f = harmonicFrequency(n, v, L);
  return 2 * A * Math.sin((TAU * x) / lam) * Math.cos(TAU * f * t);
}

// ---------- two-source interference (ripple tank) ----------
/** Sources at (0, +d/2) and (0, -d/2), in phase. */
export function pathDifference(px, py, d) {
  const r1 = Math.hypot(px, py - d / 2), r2 = Math.hypot(px, py + d / 2);
  return { r1, r2, delta: Math.abs(r1 - r2) };
}
/** Constructive when the path difference is a whole number of wavelengths, destructive at half numbers. */
export function interferenceKind(delta, lambda, tol = 0.1) {
  const m = delta / lambda, frac = m - Math.floor(m);
  if (frac < tol || frac > 1 - tol) return "constructive";
  if (Math.abs(frac - 0.5) < tol) return "destructive";
  return "in between";
}
/** Water height from point sources (circular waves, 1/sqrt(r) amplitude falloff). */
export function rippleHeight(px, py, t, sources, lambda, f) {
  let h = 0;
  for (const s of sources) {
    const r = Math.hypot(px - s.x, py - s.y);
    const lead = f * t - r / lambda;          // wave has not arrived where lead < 0
    if (lead < 0) continue;
    h += Math.cos(TAU * lead) / Math.sqrt(1 + r / lambda);
  }
  return h;
}
/** Number of antinodal lines on one side of the center line: whole m with m lambda < d. */
export const maxOrder = (d, lambda) => Math.floor(d / lambda - 1e-12);
/** Direction of the m-th antinodal line far away: d sin(theta) = m lambda. */
export function orderAngle(m, d, lambda) {
  const s = (m * lambda) / d;
  return Math.abs(s) <= 1 ? Math.asin(s) : NaN;
}

// ---------- double slit ----------
export const fringeAngle = orderAngle;                    // d sin(theta) = m lambda
export const fringeSpacing = (lambda, L, d) => (lambda * L) / d; // small angle: dy = lambda L / d
export const brightPosition = (m, lambda, L, d) => L * Math.tan(fringeAngle(m, d, lambda));
/** Intensity on the screen at angle theta: two-slit cos^2 times single-slit envelope. */
export function slitIntensity(theta, { lambda, d, a, slits }) {
  const s = Math.sin(theta);
  const beta = (Math.PI * a * s) / lambda;
  const env = Math.abs(beta) < 1e-9 ? 1 : (Math.sin(beta) / beta) ** 2;
  if (slits === 1) return env;
  const alpha = (Math.PI * d * s) / lambda;
  return env * Math.cos(alpha) ** 2;
}
/** Single slit of width a: dark fringes where a sin(theta) = m lambda (m = 1, 2, ...). */
export const singleSlitDark = (m, a, lambda) => orderAngle(m, a, lambda);
export const centralWidth = (lambda, L, a) => 2 * L * Math.tan(singleSlitDark(1, a, lambda));

/** Rough sRGB color for a visible wavelength in nm (for tinting the beam and fringes). */
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else r = 1;
  const k = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  return [r, g, b].map((c) => Math.round(255 * Math.min(1, Math.max(0, c * k)) ** 0.8));
}

// ---------- beats ----------
export const beatFrequency = (f1, f2) => Math.abs(f1 - f2);
export function beatSignal(t, f1, f2) {
  const a = Math.sin(TAU * f1 * t), b = Math.sin(TAU * f2 * t);
  const env = 2 * Math.abs(Math.cos(Math.PI * (f1 - f2) * t));
  return { a, b, sum: a + b, env };
}

// ---------- Doppler (moving source, still air, still listener) ----------
export const dopplerAhead = (f, vs, v = SOUND_SPEED) => (f * v) / (v - vs);
export const dopplerBehind = (f, vs, v = SOUND_SPEED) => (f * v) / (v + vs);
export const wavelengthAhead = (f, vs, v = SOUND_SPEED) => (v - vs) / f;
export const wavelengthBehind = (f, vs, v = SOUND_SPEED) => (v + vs) / f;

// ---------- sliders ----------
// Every slider is logarithmic over STEPS steps with a positive minimum, so a
// shown value never jumps 2x or more between adjacent steps.
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  amp: Object.freeze({ min: 0.5, max: 5, unit: "cm", label: "Amplitude A", def: 2 }),
  freq: Object.freeze({ min: 0.5, max: 4, unit: "Hz", label: "Frequency f", def: 1 }),
  speed: Object.freeze({ min: 0.5, max: 4, unit: "m/s", label: "Wave speed v", def: 1 }),
  pulseSpeed: Object.freeze({ min: 0.2, max: 2, unit: "m/s", label: "Pulse speed v", def: 0.6 }),
  pulseWidth: Object.freeze({ min: 3, max: 15, unit: "cm", label: "Pulse width", def: 6 }),
  amp2: Object.freeze({ min: 0.2, max: 1.6, unit: "cm", label: "Pulse 2 size |A\u2082|", def: 1 }),
  tension: Object.freeze({ min: 5, max: 200, unit: "N", label: "Tension", def: 20 }),
  length: Object.freeze({ min: 0.5, max: 2, unit: "m", label: "String length L", def: 1 }),
  rippleF: Object.freeze({ min: 2, max: 20, unit: "Hz", label: "Frequency f", def: 5 }),
  sep: Object.freeze({ min: 2, max: 12, unit: "cm", label: "Source separation d", def: 6 }),
  lambdaNm: Object.freeze({ min: 400, max: 700, unit: "nm", label: "Wavelength \u03bb", def: 650 }),
  slitD: Object.freeze({ min: 0.05, max: 0.5, unit: "mm", label: "Slit separation d", def: 0.25 }),
  screenL: Object.freeze({ min: 0.5, max: 5, unit: "m", label: "Screen distance L", def: 2 }),
  beatDf: Object.freeze({ min: 0.5, max: 20, unit: "Hz", label: "Frequency difference", def: 3 }),
  srcSpeed: Object.freeze({ min: 1, max: 300, unit: "m/s", label: "Source speed", def: 100 }),
  a1: Object.freeze({ min: 0.2, max: 2, unit: "cm", label: "Wave 1 amplitude", def: 1 }),
  a2: Object.freeze({ min: 0.2, max: 2, unit: "cm", label: "Wave 2 amplitude", def: 1 }),
  f1: Object.freeze({ min: 0.2, max: 4, unit: "Hz", label: "Wave 1 frequency", def: 1 }),
  f2: Object.freeze({ min: 0.2, max: 4, unit: "Hz", label: "Wave 2 frequency", def: 1 }),
  boxV: Object.freeze({ min: 0.5, max: 4, unit: "m/s", label: "Wave speed v", def: 1 })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(STEPS, Math.max(0, Math.round(step))) / STEPS;
  return s.min * (s.max / s.min) ** u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = Math.log(value / s.min) / Math.log(s.max / s.min);
  return Math.min(STEPS, Math.max(0, Math.round(u * STEPS)));
}

// ---------- modes and deep links ----------
export const MODES = Object.freeze(["basics", "reflect", "superpose", "standing", "ripple", "slit", "beats", "doppler", "sandbox"]);
export const MODE_LABELS = Object.freeze({
  basics: "Wave basics", reflect: "Reflection", superpose: "Superposition", standing: "Standing waves",
  ripple: "Ripple tank", slit: "Double slit", beats: "Beats", doppler: "Doppler", sandbox: "Sandbox"
});
export const MODE_ALIASES = Object.freeze({
  basics: "basics", basic: "basics", intro: "basics", transverse: "basics", longitudinal: "basics", properties: "basics",
  reflect: "reflect", reflection: "reflect", ends: "reflect",
  superpose: "superpose", superposition: "superpose", interference: "superpose", pulses: "superpose",
  standing: "standing", harmonics: "standing", string: "standing", nodes: "standing",
  ripple: "ripple", "ripple-tank": "ripple", "two-source": "ripple", tank: "ripple",
  slit: "slit", "double-slit": "slit", young: "slit", doubleslit: "slit",
  beats: "beats", beat: "beats",
  doppler: "doppler",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "basics";
  return { mode };
}

// ---------- defaults and readouts ----------
export function defaults() {
  const d = {};
  for (const k of Object.keys(SLIDERS)) d[k] = SLIDERS[k].def;
  return Object.assign(d, { kind: "transverse", end: "fixed", side: "same", n: 2, slits: 2, dir1: 1, dir2: -1, probe: { x: 0.3, y: 0.08 } });
}

const r3 = (x) => +x.toPrecision(3);
/** Numbers shown in each mode's readout. Pure, so tests can sweep every slider. */
export function readouts(mode, s) {
  switch (mode) {
    case "basics": {
      const lam = wavelength(s.speed, s.freq);
      return { A_cm: s.amp, f_Hz: s.freq, T_s: period(s.freq), v_ms: s.speed, lambda_m: lam };
    }
    case "reflect":
      return { v_ms: s.pulseSpeed, w_cm: s.pulseWidth, back_s: roundTripTime(1, s.pulseSpeed), sign: reflectionSign(s.end) };
    case "superpose": {
      const A1 = 2, A2 = (s.side === "same" ? 1 : -1) * s.amp2;
      return { A1_cm: A1, A2_cm: A2, peak_cm: peakWhenOverlapping(A1, A2) };
    }
    case "standing": {
      const v = stringSpeed(s.tension, STRING_MU);
      return { v_ms: v, f_Hz: harmonicFrequency(s.n, v, s.length), lambda_m: harmonicWavelength(s.n, s.length),
        f1_Hz: harmonicFrequency(1, v, s.length), nodes: s.n + 1, antinodes: s.n };
    }
    case "ripple": {
      const lam = wavelength(RIPPLE_SPEED, s.rippleF), pd = pathDifference(s.probe.x, s.probe.y, s.sep / 100);
      return { lambda_cm: lam * 100, r1_cm: pd.r1 * 100, r2_cm: pd.r2 * 100, delta_cm: pd.delta * 100, ratio: pd.delta / lam,
        kind: interferenceKind(pd.delta, lam) };
    }
    case "slit": {
      const lam = s.lambdaNm * 1e-9, d = s.slitD * 1e-3, L = s.screenL;
      if (s.slits === 1) {
        const th = singleSlitDark(1, d, lam);
        return { theta1_deg: (th * 180) / Math.PI, central_mm: centralWidth(lam, L, d) * 1000 };
      }
      const th = fringeAngle(1, d, lam);
      return { theta1_deg: (th * 180) / Math.PI, spacing_mm: fringeSpacing(lam, L, d) * 1000, y1_mm: brightPosition(1, lam, L, d) * 1000 };
    }
    case "beats": {
      const f2 = BEAT_F1 + s.beatDf;
      return { f1_Hz: BEAT_F1, f2_Hz: f2, beat_Hz: beatFrequency(BEAT_F1, f2), beatPeriod_s: 1 / beatFrequency(BEAT_F1, f2) };
    }
    case "doppler": {
      const vs = s.srcSpeed;
      return { vs_ms: vs, ahead_Hz: dopplerAhead(DOPPLER_F, vs), behind_Hz: dopplerBehind(DOPPLER_F, vs),
        lamAhead_m: wavelengthAhead(DOPPLER_F, vs), lamBehind_m: wavelengthBehind(DOPPLER_F, vs), mach: vs / SOUND_SPEED };
    }
    case "sandbox":
      return { lambda1_m: wavelength(s.boxV, s.f1), lambda2_m: wavelength(s.boxV, s.f2), T1_s: period(s.f1), T2_s: period(s.f2), v_ms: s.boxV, a1_cm: s.a1, a2_cm: s.a2 };
    default: return {};
  }
}
export const MODE_SLIDERS = Object.freeze({
  basics: ["amp", "freq", "speed"], reflect: ["pulseSpeed", "pulseWidth"], superpose: ["amp2", "pulseSpeed"],
  standing: ["tension", "length"], ripple: ["rippleF", "sep"], slit: ["lambdaNm", "slitD", "screenL"],
  beats: ["beatDf"], doppler: ["srcSpeed"], sandbox: ["a1", "a2", "f1", "f2", "boxV"]
});

export function fmtNum(x, digits = 3) {
  if (!Number.isFinite(x)) return "n/a";
  return String(r3(x)).length > 8 ? x.toPrecision(digits) : String(+x.toPrecision(digits));
}

// ---------- art anchors (from assets/MANIFEST.md) ----------
export const ART = Object.freeze({
  posts: Object.freeze({ w: 1024, h: 256, left: [80, 128], right: [944, 128] }),
  barrier: Object.freeze({ size: 1024, plate: [312, 112, 712, 912], single: { x: 512, w: 40, y0: 232, y1: 792 }, double: { xs: [452, 572], w: 28 } }),
  rippleBarrier: Object.freeze({ size: 1024, x0: 492, x1: 532, y0: 112, y1: 912, singleGap: { y: 512, h: 90 }, doubleGaps: [412, 612], gapH: 60 }),
  screen: Object.freeze({ size: 1024, panel: [212, 92, 812, 772] }),
  screenEdge: Object.freeze({ size: 1024, x0: 496, x1: 528 })
});

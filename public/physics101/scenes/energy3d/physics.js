// Pure bouncing-ball physics for the energy3d scenes. No DOM, no three.js.
export const g = 9.8;

// Reference-test presets cleared by Tesla (every_joule_art_specs.md Sim 4, tesla-energy-check.md C4).
// Mass in kg, drop and rebound in m, e = coefficient of restitution, h_rebound / h_drop = e^2.
export const BALLS = Object.freeze({
  tennis: Object.freeze({ m: 0.0577, drop: 2.54, rebound: 1.41, e: 0.745, r: 0.0335 }),
  basketball: Object.freeze({ m: 0.6, drop: 1.8, rebound: 1.06, e: 0.767, r: 0.12 }),
  tableTennis: Object.freeze({ m: 0.0027, drop: 0.3, rebound: 0.23, e: 0.876, r: 0.02 }),
});
// Radii (r) are typical regulation sizes, not from Tesla; they only set the drawn size.

// Heights h0, e^2 h0, e^4 h0, ... (n + 1 values: the drop and n rebounds).
export function bounceHeights(h0, e, n) {
  const out = [h0];
  for (let i = 0; i < n; i++) out.push(out[i] * e * e);
  return out;
}

// Mechanical energy split for mass m at height h with speed v.
export function energyAt(m, h, v) {
  const gpe = m * g * h, ke = 0.5 * m * v * v;
  return { gpe, ke, total: gpe + ke };
}

// Mechanical energy lost in one impact when dropped from h: m g h (1 - e^2).
export function lossPerBounce(m, h, e) {
  return m * g * h * (1 - e * e);
}

// Height and speed at time t of a ball bouncing from h0 with restitution e (floor at 0).
export function ballState(h0, e, t) {
  let h = h0, v0 = 0, start = 0, bounces = 0;
  let fall = Math.sqrt((2 * h) / g);
  if (t < fall) return { y: h0 - 0.5 * g * t * t, v: g * t, bounces, peak: h0 };
  start = fall;
  for (;;) {
    h *= e * e;
    v0 = Math.sqrt(2 * g * h);
    const dur = (2 * v0) / g;
    bounces++;
    if (h < 1e-3 || bounces > 60) return { y: 0, v: 0, bounces, peak: 0, rest: true };
    if (t < start + dur) { const s = t - start; return { y: v0 * s - 0.5 * g * s * s, v: Math.abs(v0 - g * s), bounces, peak: h }; }
    start += dur;
  }
}

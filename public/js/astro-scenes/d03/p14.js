// D03 p14 "Kepler's 2nd law": the planet runs on an ellipse with the Sun at one focus, with true
// Kepler timing (M = E - e sin E). The line from the Sun sweeps a fresh one-month wedge each sim month,
// alternating the drawn green and orange, so every wedge has the same area: short and wide near the
// Sun, long and thin far away. Press Play to release the planet (or drag it, or scrub the Month slider);
// the Eccentricity slider reshapes the orbit and 0 gives a circle with equal wedges. The drawn
// eccentricity (0.68) is exaggerated versus Earth's 0.0167. Art: Leo's d03-p14 layers.
const ART = "v2/art/";
const SUN = [677, 531], A = 360, E_DRAWN = 0.68, MONTHS = 12, PERIOD_S = 8;
const WEDGE = ["#8FC79A", "#F2C77A"], KEEP = 3;
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];

// solve Kepler's equation M = E - e sin E by Newton steps; returns the true anomaly
export function trueAnomaly(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}
// page position at month m (0 = perihelion on the right of the Sun); the planet moves counterclockwise on screen
export function where(m, e) {
  const nu = trueAnomaly(2 * Math.PI * m / MONTHS, e), r = A * (1 - e * e) / (1 + e * Math.cos(nu));
  return [SUN[0] + r * Math.cos(nu), SUN[1] - r * Math.sin(nu)];
}
// area swept between months a and b (shoelace over a fine fan), used by the tests
export function sweptArea(a, b, e, n = 400) {
  let s = 0, p = where(a, e);
  for (let i = 1; i <= n; i++) { const q = where(a + (b - a) * i / n, e); s += (p[0] - SUN[0]) * (q[1] - SUN[1]) - (q[0] - SUN[0]) * (p[1] - SUN[1]); p = q; }
  return Math.abs(s) / 2;
}

export default function build(ctx) {
  const { reducedMotion } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  art("p14-labels.webp", [50, 35, 1475, 834], { layer: "fg" });
  art("p14-fg-art.webp", [78, 113, 1258, 230], { layer: "fg" });
  art("p14-kepler.webp", [1185, 504, 1434, 820], { ink: false });
  const plane = ctx.paint([0, 120, 1200, 900], { z: 0.01 });
  const sun = art("p14-sun.webp", [643, 497, 712, 566], { z: 0.03, ink: false });
  const planet = art("p14-planet-far.webp", [62, 550, 99, 590], { z: 0.04, ink: false });
  ctx.touchable(planet, { r: 0.5 });

  let e = E_DRAWN, m = MONTHS / 2, playing = !reducedMotion, dragging = false, stepAt = -99;
  const mSlider = ctx.ui && ctx.ui.slider({ label: "Month", min: 0, max: MONTHS, step: 0.05, value: m, fmt: (v) => v.toFixed(1) }, (v) => { m = v; stop(); draw(); });
  ctx.ui && ctx.ui.slider({ label: "Eccentricity", min: 0, max: 0.8, step: 0.01, value: e, fmt: (v) => v.toFixed(2) }, (v) => { e = v; draw(); });
  const play = ctx.ui && ctx.ui.button(playing ? "Pause" : "Play", () => { playing = !playing; play.set(playing ? "Pause" : "Play"); });
  function stop() { playing = false; play && play.set("Play"); }

  function draw() {
    const cx = SUN[0] - A * e, b = A * Math.sqrt(1 - e * e);
    plane.redraw((g) => {
      // the wedges: the month in progress grows from its start, the last few whole months stay shaded
      const now = Math.floor(m);
      for (let k = now - KEEP; k <= now; k++) {
        const a0 = k, a1 = k === now ? m : k + 1; if (a1 - a0 < 0.01) continue;
        g.fillStyle = WEDGE[((k % 2) + 2) % 2]; g.globalAlpha = k === now ? 0.6 : 0.6 - 0.15 * (now - k);
        g.beginPath(); g.moveTo(SUN[0], SUN[1]);
        for (let i = 0; i <= 40; i++) { const p = where(a0 + (a1 - a0) * i / 40, e); g.lineTo(p[0], p[1]); }
        g.closePath(); g.fill(); g.globalAlpha = 0.7; g.strokeStyle = "#3D3D3D"; g.lineWidth = 1; g.stroke();
      }
      g.globalAlpha = 1; g.strokeStyle = "#3D3D3D"; g.lineWidth = 3;
      g.beginPath(); g.ellipse(cx, SUN[1], A, b, 0, 0, 7); g.stroke();
      // the empty focus
      const fx = SUN[0] - 2 * A * e; g.lineWidth = 2; g.beginPath(); g.moveTo(fx - 6, SUN[1] - 6); g.lineTo(fx + 6, SUN[1] + 6); g.moveTo(fx + 6, SUN[1] - 6); g.lineTo(fx - 6, SUN[1] + 6); g.stroke();
      const p = where(m, e); g.lineWidth = 1.6; g.beginPath(); g.moveTo(SUN[0], SUN[1]); g.lineTo(p[0], p[1]); g.stroke();
    });
    const p = where(m, e), q = ctx.at(p[0], p[1]); planet.position.x = q[0]; planet.position.y = q[1];
    mSlider && mSlider.set(Math.round(m * 20) / 20);
  }
  ctx.onPointer(({ phase, x, y }) => {
    const p = where(m, e);
    if (phase === "down") { if (Math.hypot(x - p[0], y - p[1]) > 50) return false; dragging = true; stop(); }
    if (!dragging) return false;
    if (phase === "up") { dragging = false; return true; }
    // move to the month whose point is nearest the pointer
    let best = m, bd = 1e9;
    for (let i = 0; i < 240; i++) { const mm = MONTHS * i / 240, q = where(mm, e), d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < bd) { bd = d; best = mm; } }
    m = best; draw(); return true;
  });
  draw();
  return {
    update(t, dt) {
      sun.scale.setScalar(reducedMotion ? 1 : 1 + 0.0075 * (1 - Math.cos(2 * Math.PI * t / 6)));
      if (!playing || dragging) return;
      // reduced motion: no glide, the planet jumps one month every 0.67 s (the same 8 s orbit)
      if (reducedMotion) { if (t - stepAt < PERIOD_S / MONTHS) return; stepAt = t; m = (Math.floor(m) + 1) % MONTHS; }
      else m = (m + MONTHS * dt / PERIOD_S) % MONTHS;
      draw();
    },
    dispose() {},
  };
}

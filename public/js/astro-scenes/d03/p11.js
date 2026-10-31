// D03 p11 "Copernicus's way": top-down Sun, Earth on the faster inside track, Mars outside, the star
// wall behind. Scrub the positions 1 to 7 (or drag Earth along its track): the current Earth and Mars
// dots are at full ink, the sight line from Earth through Mars lands Mars on the star wall, and the
// apparent path builds up; the drawn dots stay at 30 percent. Earth's angular speed is 1.88 times
// Mars's (Mars period 1.881 yr), so Mars slides backward on the wall while Earth passes it (3 to 5)
// although Mars itself never reverses. Orbits are not to scale.
// Art: Leo's d03-p11 layers (decks/d03/v2/art).
const ART = "v2/art/";
const SUN = [683, 841], RE = 67, RM = 102, WALL_Y = 407;
// drawn position 1 sits at screen angle +16 deg for Earth and -33.7 deg for Mars; both orbit
// counterclockwise seen from above, so the screen angle (y down) decreases. Earth covers 212 deg from 1 to 7.
const E0 = 16, M0 = -33.7, SPAN = 212, RATIO = 1.881;
const EARTH = "#4A7FC1", MARS = "#B85B5B", STEP_S = 0.8;
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const rad = (d) => d * Math.PI / 180;

export function positions(s) {
  const e = rad(E0 - SPAN * s), m = rad(M0 - SPAN / RATIO * s);
  const E = [SUN[0] + RE * Math.cos(e), SUN[1] + RE * Math.sin(e)], M = [SUN[0] + RM * Math.cos(m), SUN[1] + RM * Math.sin(m)];
  const t = (E[1] - WALL_Y) / (E[1] - M[1]);
  return { E, M, sky: [E[0] + (M[0] - E[0]) * t, WALL_Y] };
}

export default function build(ctx) {
  const { reducedMotion } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  art("p11-labels.webp", [84, 35, 1487, 806], { layer: "fg" });
  // "Earth (inside, faster)" and its leader, lifted 40 px so the Try it tab no longer covers it
  art("p11-label-earth.webp", [274, 714, 587, 787], { layer: "fg" });
  art("p11-fg-art.webp", [79, 113, 697, 777], { layer: "fg" });
  art("p11-starwall.webp", [136, 341, 1336, 490]);
  const faded = [art("p11-mars-sky.webp", [269, 371, 1117, 453], { z: 0.01 }), art("p11-earth.webp", [589, 764, 760, 870], { z: 0.01, ink: false }), art("p11-mars-orbit.webp", [583, 729, 800, 820], { z: 0.01, ink: false })];
  for (const m of faded) m.material.opacity = 0.3;
  const sun = art("p11-sun.webp", [659, 817, 708, 866], { z: 0.02, ink: false });
  const live = ctx.paint([120, 330, 1360, 900], { z: 0.03 });
  const grab = new ctx.THREE.Object3D(); ctx.layers.mid.add(grab); ctx.touchable(grab, { r: 0.3 });

  let s = 0, playing = !reducedMotion, dragging = false, stepAt = -99;
  const slider = ctx.ui && ctx.ui.slider({ label: "Position", min: 1, max: 7, step: 0.05, value: 1, fmt: (v) => v.toFixed(1) }, (v) => { s = (v - 1) / 6; stop(); draw(); });
  const play = ctx.ui && ctx.ui.button(playing ? "Pause" : "Play", () => { if (!playing && s >= 1) s = 0; playing = !playing; play.set(playing ? "Pause" : "Play"); });
  const cur = () => s;
  function stop() { playing = false; play && play.set("Play"); }

  function dot(g, p, c, r) { g.fillStyle = c; g.globalAlpha = 1; g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); g.strokeStyle = "#3D3D3D"; g.lineWidth = 1.5; g.stroke(); }
  function draw() {
    const s = Math.min(1, cur()), now = positions(s);
    live.redraw((g) => {
      // the apparent path on the star wall so far, sampled finely
      g.strokeStyle = MARS; g.lineWidth = 3.5; g.globalAlpha = 0.9; g.beginPath();
      for (let k = 0; k <= 60; k++) { const q = positions(s * k / 60); const y = WALL_Y - 14 * Math.sin(Math.PI * s * k / 60); k ? g.lineTo(q.sky[0], y) : g.moveTo(q.sky[0], y); }
      g.stroke();
      // sight lines at the whole positions already passed, faint
      g.lineWidth = 1.2; g.globalAlpha = 0.35; g.strokeStyle = "#3D3D3D"; g.setLineDash([6, 6]);
      for (let k = 0; k <= 6 && k / 6 <= s + 1e-6; k++) { const q = positions(k / 6); g.beginPath(); g.moveTo(q.E[0], q.E[1]); g.lineTo(q.sky[0], WALL_Y); g.stroke(); }
      // the live sight line from Earth through Mars to the wall
      g.globalAlpha = 1; g.lineWidth = 2.4; g.setLineDash([]); g.strokeStyle = "#3D3D3D";
      g.beginPath(); g.moveTo(now.E[0], now.E[1]); g.lineTo(now.sky[0], WALL_Y - 14 * Math.sin(Math.PI * s)); g.stroke();
      dot(g, now.E, EARTH, 8); dot(g, now.M, MARS, 8);
      dot(g, [now.sky[0], WALL_Y - 14 * Math.sin(Math.PI * s)], MARS, 10);
      g.globalAlpha = 1;
    });
    const p = ctx.at(now.E[0], now.E[1]); grab.position.set(p[0], p[1], 0.05);
    slider && slider.set(Math.round((1 + 6 * s) * 20) / 20);
  }
  ctx.onPointer(({ phase, x, y }) => {
    const d = Math.hypot(x - SUN[0], y - SUN[1]);
    if (phase === "down") { if (d < RE - 40 || d > RE + 40 || y > SUN[1] + 40) return false; dragging = true; stop(); }
    if (!dragging) return false;
    if (phase === "up") { dragging = false; return true; }
    const a = Math.atan2(y - SUN[1], x - SUN[0]) * 180 / Math.PI;
    s = Math.min(1, Math.max(0, (E0 - (a > 90 ? a - 360 : a)) / SPAN));
    draw(); return true;
  });
  draw();
  return {
    update(t, dt) {
      sun.scale.setScalar(reducedMotion ? 1 : 1 + 0.0075 * (1 - Math.cos(2 * Math.PI * t / 6)));
      if (!playing || dragging) return;
      // one position every 0.8 s (5.6 s for 1 to 7, then a short rest and replay); reduced motion steps whole positions
      if (reducedMotion) { if (t - stepAt < STEP_S) return; stepAt = t; s = s >= 1 ? 0 : Math.min(1, Math.round(s * 6 + 1) / 6); }
      else { s += dt / (6 * STEP_S); if (s > 1.25) s = 0; }
      draw();
    },
    dispose() {},
  };
}

// D02 p20 "Moon phases": top-down view, sunlight from the left. Drag the Moon around Earth (or press
// Play for a 20 s month). The Moon orbits counterclockwise seen from above and its lit half always
// faces the Sun: new Moon on the left, full Moon on the right. The Moon nearest the moving one stays
// bright, the rest fade, and the matching phase (as seen from Earth) lights up on the outer ring.
// Art: Leo's d02-p20 layers (one Moon and one phase drawing every 45 deg).
const ART = "v2/art/";
const C = [1039.5, 508.5], R = 181.5, MONTH = 20, DAYS = 29.5;
const HIGHLIGHT = "#F3D157";
// file angle = screen angle (y down): 000 right (full), 090 bottom (1st quarter), 180 left (new), 270 top (3rd quarter)
const MOONS = { "000": [1193, 479, 1249, 536], "045": [1141, 609, 1196, 662], "090": [1009, 661, 1070, 716], "135": [881, 608, 942, 667], "180": [828, 481, 889, 539], "225": [888, 355, 942, 409], "270": [1014, 301, 1069, 357], "315": [1141, 355, 1195, 409] };
const PHASES = { "000": [1306, 478, 1368, 539], "045": [1220, 688, 1280, 749], "090": [1011, 774, 1071, 834], "135": [802, 688, 860, 749], "180": [715, 478, 774, 538], "225": [801, 268, 860, 329], "270": [1011, 183, 1071, 243], "315": [1220, 268, 1281, 329] };
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const angDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };

export default function build(ctx) {
  const { THREE: T, reducedMotion } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  art("p20-labels.webp", [85, 40, 1429, 835], { layer: "fg" });
  art("p20-fg-art.webp", [79, 115, 1368, 834], { layer: "fg" });
  art("p20-sunlight.webp", [272, 386, 586, 775]);
  art("p20-orbit.webp", [863, 331, 1219, 687]);
  art("p20-connectors.webp", [783, 250, 1298, 767]);
  art("p20-earth.webp", [978, 446, 1103, 572], { ink: false });
  const ring = ctx.paint([680, 150, 1400, 870], { z: 0.01 });
  const fixed = Object.entries(MOONS).map(([k, b]) => ({ a: +k, m: art(`p20-moon-orbit-${k}.webp`, b, { z: 0.02, ink: false }) }));
  const outer = Object.entries(PHASES).map(([k, b]) => ({ a: +k, b, m: art(`p20-phase-${k}.webp`, b, { z: 0.02, ink: false }) }));
  // the moving Moon: Leo's drawing, lit side to the left (toward the Sun) wherever it is
  const moon = art("p20-moon-orbit-180.webp", MOONS["180"], { z: 0.05, ink: false });
  ctx.touchable(moon, { r: 0.42 });

  let ang = 180, playing = false, dragging = false, stepAt = -99;
  const day = () => (((180 - ang) % 360 + 360) % 360) / 360 * DAYS;
  const slider = ctx.ui && ctx.ui.slider({ label: "Day", min: 0, max: DAYS, step: 0.1, value: 0, fmt: (v) => `${v.toFixed(1)} of ${DAYS}` }, (v) => { ang = 180 - v / DAYS * 360; stop(); place(); });
  const play = ctx.ui && ctx.ui.button("Play", () => { playing = !playing; play.set(playing ? "Pause" : "Play"); });
  function stop() { playing = false; play && play.set("Play"); }

  function place() {
    const r = ang * Math.PI / 180, p = ctx.at(C[0] + R * Math.cos(r), C[1] + R * Math.sin(r));
    moon.position.x = p[0]; moon.position.y = p[1];
    let best = null;
    for (const f of fixed) { const w = Math.max(0, 1 - angDist(ang, f.a) / 45); f.m.material.opacity = 0.22 + 0.5 * w; }
    for (const o of outer) { const w = Math.max(0, 1 - angDist(ang, o.a) / 45); o.w = w; o.m.material.opacity = 0.3 + 0.7 * w; if (!best || w > best.w) best = o; }
    ring.redraw((g) => {
      for (const o of outer) if (o.w > 0.05) {
        const [x0, y0, x1, y1] = o.b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr = (x1 - x0) / 2 + 9;
        g.strokeStyle = HIGHLIGHT; g.globalAlpha = o.w; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.stroke();
        g.globalAlpha = o.w * 0.5; g.lineWidth = 2; g.beginPath(); g.arc(cx + 1.5, cy - 1, rr + 3, 0.3, 6.1); g.stroke();
      }
      g.globalAlpha = 1;
    });
    slider && slider.set(Math.round(day() * 10) / 10);
  }
  ctx.onPointer(({ phase, x, y }) => {
    const d = Math.hypot(x - C[0], y - C[1]);
    if (phase === "down") { if (Math.abs(d - R) > 60) return false; dragging = true; stop(); }
    if (!dragging) return false;
    if (phase === "up") { dragging = false; return true; }
    ang = Math.atan2(y - C[1], x - C[0]) * 180 / Math.PI; place(); return true;
  });
  place();
  return {
    update(t, dt) {
      if (!playing || dragging) return;
      // counterclockwise seen from above: the screen angle (y down) decreases; one month takes 20 s
      // reduced motion: no glide, the Moon steps one drawn phase (45 deg) every 2.5 s, the same 20 s month
      if (reducedMotion) { if (t - stepAt < MONTH / 8) return; stepAt = t; ang = Math.round(ang / 45) * 45 - 45; }
      else ang -= 360 * dt / MONTH;
      place();
    },
    dispose() {},
  };
}

// D03 p18 "Venus's phases": two boards. Left, Ptolemy: Venus rides an epicycle on the Earth-Sun line,
// always between Earth and the Sun. Right, Galileo: Venus circles the Sun. Drag Venus in either panel
// (or press Play); the other panel follows the same date. The nearest drawn Venus is at full ink, the
// rest fade; the live Venus keeps its lit half toward the Sun. Seen from Earth, Ptolemy's Venus only
// shows crescents (its phase on the drawn strip lights up), while Galileo's runs the full set: small
// and nearly full on the far side of the Sun, big and crescent on our side (the two insets crossfade).
// This rules out Ptolemy; it does not prove Earth moves. Not to scale. Art: Leo's d03-p18 layers.
const ART = "v2/art/";
const G = { sun: [1133, 583], earth: [1133, 775], r: 134 };
const P = { c: [417, 594], earth: [137, 754], sun: [699, 433], r: 161 };
const HIGHLIGHT = "#F3D157", PERIOD_S = 10;
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;
const angDist = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
// a = the date as an angle: 0 puts Venus nearest Earth in both models (new), 180 farthest
const toEarthG = 90, toEarthP = deg(Math.atan2(P.earth[1] - P.c[1], P.earth[0] - P.c[0]));
export function venusAt(a) {
  const g = rad(toEarthG + a), p = rad(toEarthP + a);
  return { g: [G.sun[0] + G.r * Math.cos(g), G.sun[1] + G.r * Math.sin(g)], p: [P.c[0] + P.r * Math.cos(p), P.c[1] + P.r * Math.sin(p)] };
}
// fraction of Venus's disk lit as seen from Earth: (1 + cos(phase angle)) / 2, phase angle = Sun-Venus-Earth
export function litFraction(v, sun, earth) {
  const a = [sun[0] - v[0], sun[1] - v[1]], b = [earth[0] - v[0], earth[1] - v[1]];
  const c = (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b);
  return (1 + c) / 2;
}
const GV = [[1155, 434, 1196, 470], [978, 561, 1015, 602], [1252, 562, 1288, 602], [1051, 688, 1089, 724]];
const PV = [[262, 484, 304, 522], [559, 546, 598, 587], [258, 654, 298, 694], [402, 736, 445, 776]];
const PHASES = [[333, 801], [398, 801], [462, 801], [529, 801]]; // Ptolemy's drawn strip, left to right
const angOf = (b, c, toE) => deg(Math.atan2((b[1] + b[3]) / 2 - c[1], (b[0] + b[2]) / 2 - c[0])) - toE;

export default function build(ctx) {
  const { reducedMotion } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  art("p18-labels.webp", [83, 37, 1478, 865], { layer: "fg" });
  art("p18-fg-art.webp", [72, 113, 1494, 886], { layer: "fg" });
  for (const [n, b] of [["ptolemy-sun", [651, 384, 749, 483]], ["ptolemy-earth", [105, 721, 170, 787]], ["galileo-sun", [1088, 538, 1178, 628]], ["galileo-earth", [1102, 744, 1164, 806]], ["ptolemy-phases", [309, 766, 552, 826]]]) art(`p18-${n}.webp`, b, { ink: false });
  const gv = GV.map((b, i) => ({ a: angOf(b, G.sun, toEarthG), m: art(`p18-galileo-venus-${i}.webp`, b, { z: 0.01, ink: false }) }));
  const pv = PV.map((b, i) => ({ a: angOf(b, P.c, toEarthP), m: art(`p18-ptolemy-venus-${i}.webp`, b, { z: 0.01, ink: false }) }));
  const insFull = art("p18-inset-full.webp", [1338, 455, 1363, 480], { z: 0.01, ink: false });
  const insCres = art("p18-inset-crescent.webp", [1344, 669, 1422, 747], { z: 0.01, ink: false });
  const plane = ctx.paint([80, 120, 1500, 880], { z: 0.02 });
  const grabG = new ctx.THREE.Object3D(), grabP = new ctx.THREE.Object3D(); ctx.layers.mid.add(grabG, grabP);
  ctx.touchable(grabG, { r: 0.3 }); ctx.touchable(grabP, { r: 0.3 });

  let a = 180, playing = !reducedMotion, drag = null, stepAt = -99;
  const play = ctx.ui && ctx.ui.button(playing ? "Pause" : "Play", () => { playing = !playing; play.set(playing ? "Pause" : "Play"); });
  const slider = ctx.ui && ctx.ui.slider({ label: "Venus", min: 0, max: 360, step: 1, value: a, fmt: (v) => `${Math.round(v)}°` }, (v) => { a = v; stop(); draw(); });
  function stop() { playing = false; play && play.set("Play"); }

  function venus(g, v, sun, r) {
    // dark disk, then the half facing the Sun lit
    const t = Math.atan2(sun[1] - v[1], sun[0] - v[0]);
    g.globalAlpha = 1; g.fillStyle = "#6B6B6B"; g.beginPath(); g.arc(v[0], v[1], r, 0, 7); g.fill();
    g.fillStyle = "#FFF4D6"; g.beginPath(); g.arc(v[0], v[1], r, t - Math.PI / 2, t + Math.PI / 2); g.fill();
    g.strokeStyle = "#3D3D3D"; g.lineWidth = 1.6; g.beginPath(); g.arc(v[0], v[1], r, 0, 7); g.stroke();
  }
  function draw() {
    const v = venusAt(a), kG = litFraction(v.g, G.sun, G.earth), kP = litFraction(v.p, P.sun, P.earth);
    for (const o of gv) o.m.material.opacity = 0.25 + 0.75 * Math.max(0, 1 - angDist(a, o.a) / 60);
    for (const o of pv) o.m.material.opacity = 0.25 + 0.75 * Math.max(0, 1 - angDist(a, o.a) / 60);
    // Galileo's insets follow Venus's distance: far side, small and nearly full; our side, big crescent
    const far = (Math.hypot(v.g[0] - G.earth[0], v.g[1] - G.earth[1]) - (192 - G.r)) / (2 * G.r);
    insFull.material.opacity = 0.2 + 0.8 * far; insCres.material.opacity = 0.2 + 0.8 * (1 - far);
    // Ptolemy's strip: light the drawn phase closest to what Earth sees (new to the thickest crescent Ptolemy allows, about 20 percent lit)
    const idx = Math.max(0, Math.min(3, Math.round(kP / 0.2 * 3)));
    plane.redraw((g) => {
      g.strokeStyle = HIGHLIGHT; g.lineWidth = 5; g.beginPath(); g.arc(PHASES[idx][0], PHASES[idx][1], 31, 0, 7); g.stroke();
      venus(g, v.g, G.sun, 15); venus(g, v.p, P.sun, 15);
    });
    const q = ctx.at(...v.g), r = ctx.at(...v.p); grabG.position.set(q[0], q[1], 0.05); grabP.position.set(r[0], r[1], 0.05);
    slider && slider.set(Math.round(((a % 360) + 360) % 360));
    return { kG, kP };
  }
  ctx.onPointer(({ phase, x, y }) => {
    if (phase === "down") {
      const dg = Math.abs(Math.hypot(x - G.sun[0], y - G.sun[1]) - G.r), dp = Math.abs(Math.hypot(x - P.c[0], y - P.c[1]) - P.r);
      if (dg < 45 && x > 800) drag = "g"; else if (dp < 45 && x < 800) drag = "p"; else return false;
      stop();
    }
    if (!drag) return false;
    if (phase === "up") { drag = null; return true; }
    a = drag === "g" ? deg(Math.atan2(y - G.sun[1], x - G.sun[0])) - toEarthG : deg(Math.atan2(y - P.c[1], x - P.c[0])) - toEarthP;
    a = ((a % 360) + 360) % 360; draw(); return true;
  });
  draw();
  return {
    update(t, dt) {
      if (!playing || drag) return;
      // counterclockwise on screen; reduced motion steps 45 deg every 1.25 s (the same 10 s cycle)
      if (reducedMotion) { if (t - stepAt < PERIOD_S / 8) return; stepAt = t; a = (Math.round(a / 45) * 45 - 45 + 360) % 360; }
      else a = (a - 360 * dt / PERIOD_S + 360) % 360;
      draw();
    },
    dispose() {},
  };
}

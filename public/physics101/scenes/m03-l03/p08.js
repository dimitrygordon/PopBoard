// What if a = 0? Toss the ball (+19.6 m/s, up is +). If the switch turns gravity off, the ball keeps whatever
// velocity it has; at the top that is 0, so it hovers. Turn gravity back on and it falls at 9.8 m/s^2.
import { svg, path, caption, tapCut, NAVY } from "../kit.js";
const G = 9.8, V0 = 19.6, BX = 700, GROUND = 820, K = 620 / ((V0 * V0) / (2 * G));
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const ball = path(s, `M ${BX} ${GROUND} h 0.1`, { stroke: "#D98B6A", "stroke-width": 44 }); path(s, `M ${BX - 60} ${GROUND + 24} h 120`, { stroke: NAVY, "stroke-width": 4 });
  const cap = caption(layer, [420, 40, 980, 110], 24, "gravity: on");
  let grav = true, h = 0, v = 0, raf = 0, last = 0;
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000) * 1.5; last = now;
    if (grav) v -= G * dt; h += v * dt; if (h <= 0) { h = 0; v = 0; ball.setAttribute("d", `M ${BX} ${GROUND} h 0.1`); cap.textContent = "landed. Toss again."; return; }
    ball.setAttribute("d", `M ${BX} ${GROUND - h * K} h 0.1`); cap.textContent = `gravity: ${grav ? "on" : "OFF"}   v = ${v >= 0 ? "+" : ""}${v.toFixed(1)} m/s`;
    raf = requestAnimationFrame(tick);
  };
  const toss = () => { cancelAnimationFrame(raf); h = 0.01; v = V0; if (reduce) { h = (V0 * V0) / (2 * G); v = 0; ball.setAttribute("d", `M ${BX} ${GROUND - h * K} h 0.1`); return; } last = performance.now(); raf = requestAnimationFrame(tick); };
  const sw = () => {
    grav = !grav;
    say(grav ? "Gravity is back: the ball speeds up downward at 9.8 meters per second squared." : Math.abs(v) < 1.5 && h > 1 ? "With zero acceleration at the top, nothing changes its zero velocity, so it hovers. A real ball never does: a is 9.8 down the whole time." : `With a = 0 the velocity stays ${v.toFixed(1)} meters per second, so the ball keeps going in a straight line at constant speed.`, true);
  };
  ui.button("Toss", toss);
  tapCut(ctx, "whatif", "What if switch: tap to turn gravity off or on", sw);
  art.touchable(["whatif"]);
  return { destroy() { cancelAnimationFrame(raf); } };
}

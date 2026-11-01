// Five runners: tap a v-t line and its runner moves on an east-west track (east is +). Velocities in m/s
// read from Leo's Figure 6 lines (full scale is 4 m/s; the graph has no numbers, so these are relative).
import { svg, path, tween, caption, tapCut, arrowD, RED, NAVY } from "../kit.js";
const V = { A: [3, 3], B: [0.16, 1.92], C: [2.2, 0, 0.3], D: [-1.4, 0.88], E: [-2.48, -2.48] };
const TELL = {
  A: "A: constant velocity east, zero acceleration.", B: "B: moving east and speeding up, positive acceleration.",
  C: "C: moving east and slowing to a stop.", D: "D: moving west, stops where the line crosses the axis, then speeds up east.",
  E: "E: constant velocity west, zero acceleration.",
};
const TX0 = 300, TX1 = 1300, TY = 840, PX = 40;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); path(s, `M ${TX0} ${TY + 20} H ${TX1}`, { stroke: NAVY, "stroke-width": 3 });
  const dot = path(s, "", { stroke: RED, "stroke-width": 26 }), arr = path(s, "", { stroke: RED, "stroke-width": 6 });
  const cap = caption(layer, [1180, 640, 1590, 760], 22, "Tap a line. East is to the right.");
  const run = async (k) => {
    const [v0, v1, tEnd = 1] = V[k], T = 4, vt = (u) => (u <= tEnd ? v0 + (v1 - v0) * (u / tEnd) : v1);
    const xs = [800]; for (let i = 1; i <= 200; i++) xs.push(xs[i - 1] + vt((i - 0.5) / 200) * PX * T / 200);
    await tween(2400, (u) => {
      const x = xs[Math.round(u * 200)], v = vt(u); dot.setAttribute("d", `M ${x} ${TY} h 0.1`); arr.setAttribute("d", arrowD(x, TY - 30, x + v * 40, TY - 30, 12));
    }, reduce);
    cap.textContent = `runner ${k}`; say(TELL[k], true);
  };
  const ids = ["lineA", "lineB", "lineC", "lineD", "lineE"];
  for (const k of Object.keys(V)) tapCut(ctx, "line" + k, `Graph line ${k}: tap to watch runner ${k}`, () => run(k));
  art.touchable(ids);
  return { destroy() {} };
}

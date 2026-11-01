// Push and watch: an unbalanced push takes the book from rest to 1.5 m/s in 2.0 s (a = 0.75 m/s^2).
// A dot is dropped every 0.25 s, and the gaps grow as the speed readout climbs.
import { svg, path, tween, caption, tapCut, NAVY, f2 } from "../kit.js";
const A = 0.75, X0 = 300, Y = 720, PXM = 600;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const dots = path(s, "", { stroke: NAVY, "stroke-width": 18 });
  const cap = caption(layer, [1000, 820, 1400, 880], 24, "speed 0.0 m/s");
  const run = async () => {
    await tween(2400, (u) => { const t = u * 2; let d = ""; for (let k = 0; k <= Math.floor(t / 0.25 + 1e-6); k++) { const tk = k * 0.25; d += `M ${X0 + 0.5 * A * tk * tk * PXM} ${Y} h 0.1 `; } dots.setAttribute("d", d); cap.textContent = `t = ${f2(t)} s   speed ${f2(A * t, 2)} m/s`; }, reduce);
    say("From rest to 1.5 meters per second in 2 seconds. The dots spread out because an unbalanced force makes the book accelerate.", true);
  };
  tapCut(ctx, "push", "Push button", run);
  art.touchable(["push"]);
  return { destroy() {} };
}

// Skydiver: terminal speeds head-down 90 m/s (sandbox value), spread-eagle 60 m/s and parachute 5 m/s (from
// the table). dv/dt = g(1 - v|v|/vt^2), run 15 s of fall in 3 s.
import { tween, caption, tapCut, f2 } from "../kit.js";
const P = [["head-down", 90], ["spread-eagle", 60], ["parachute", 5]];
export default function build(ctx) {
  const { say, layer, reduce } = ctx;
  const cap = caption(layer, [1390, 440, 1595, 560], 20, "speed 0 m/s");
  let v = 0, busy = false;
  ["pose0", "pose1", "pose2"].forEach((id, i) => tapCut(ctx, id, `Pose: ${P[i][0]}`, async () => {
    if (busy) return; busy = true; const vt = P[i][1]; let last = 0;
    await tween(3000, (u) => { const T = u * 15; for (let t = last; t < T; t += 0.01) v += 9.8 * (1 - (v * Math.abs(v)) / (vt * vt)) * 0.01; last = T; cap.textContent = `${P[i][0]}\nspeed ${f2(v, 0)} m/s`; }, reduce);
    busy = false; say(`${P[i][0]}: the speed levels off near ${vt} meters per second, where drag equals weight.`, true);
  }));
  ctx.art.touchable(["pose0", "pose1", "pose2"]);
  return { destroy() {} };
}

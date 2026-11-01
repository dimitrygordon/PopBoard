// Changing arrows: the dot runs for 5 s, dropping a dot and a red velocity arrow each second.
// The slider sets the acceleration, so arrows grow (speeding up) or shrink (slowing down).
import { svg, path, tween, caption, tapCut, arrowD, RED, NAVY, f2 } from "../kit.js";
const PX = 110, Y = 250, X0 = 160, HOME = 1380; // 110 px per m
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const dots = path(s, "", { stroke: NAVY, "stroke-width": 20 }), arr = path(s, "", { stroke: RED, "stroke-width": 6 });
  const cap = caption(layer, [520, 140, 1100, 200], 24, "Set the change in speed, then tap the dot.");
  let a = 0.5; const v0 = 2.0;
  const run = async () => {
    art.touched("dot"); let d = "", ad = "", vfin = v0;
    const xAt = (t) => X0 + PX * (v0 * t + 0.5 * a * t * t), tStop = a < 0 ? Math.min(4, -v0 / a) : 4;
    await tween(3200, (u) => {
      const t = u * tStop; art.set("dot", { dx: xAt(t) - HOME });
      const n = Math.floor(t + 1e-6); d = ""; ad = "";
      for (let k = 0; k <= n; k++) { const x = xAt(k), v = v0 + a * k; d += `M ${x} ${Y + 60} h 0.1 `; if (v > 0.05) ad += arrowD(x, Y + 30, x + v * PX * 0.45, Y + 30, 14) + " "; vfin = v; }
      dots.setAttribute("d", d); arr.setAttribute("d", ad);
    }, reduce);
    cap.textContent = `start 2.0 m/s, change ${f2(a, 1)} m/s each second, last arrow ${f2(Math.max(0, vfin), 1)} m/s`;
    say(a > 0 ? "Each arrow is longer and the dots spread out: speeding up." : a < 0 ? "Each arrow is shorter and the dots bunch up: slowing down." : "Equal arrows and equal gaps: constant velocity.", true);
  };
  ui.slider({ label: "Change in speed each second", min: -0.5, max: 0.8, step: 0.1, value: 0.5, fmt: (x) => f2(x, 1) + " m/s" }, (x) => (a = x));
  ui.button("Run", run);
  tapCut(ctx, "dot", "Moving dot: tap to run", run);
  art.touchable(["dot"]);
  return { destroy() {} };
}

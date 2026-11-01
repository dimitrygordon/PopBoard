// Constant speed, changing velocity: the runner bounces between the walls at 4.0 m/s. At each turn the
// velocity arrow flips, and a violet arrow shows the acceleration pointing away from that wall.
import { svg, path, tween, caption, tapCut, arrowD, RED, VIOLET } from "../kit.js";
const L = -620, R = 240, Y = 470;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const va = path(s, "", { stroke: RED, "stroke-width": 6 }), aa = path(s, "", { stroke: VIOLET, "stroke-width": 7 });
  const cap = caption(layer, [560, 300, 1040, 340], 24);
  let busy = false;
  const leg = async (from, to) => {
    const d = Math.sign(to - from); art.set("runner", { dx: from, scale: d > 0 ? 1 : "-1, 1" }); aa.setAttribute("d", "");
    cap.textContent = `speed 4.0 m/s, velocity ${d > 0 ? "+" : "\u2212"}4.0 m/s`;
    await tween(Math.abs(to - from) * 2.6, (u) => { const x = from + (to - from) * u; art.set("runner", { dx: x, scale: d > 0 ? 1 : "-1, 1" }); va.setAttribute("d", arrowD(1150 + x, Y, 1150 + x + d * 120, Y, 16)); }, reduce);
    aa.setAttribute("d", arrowD(1150 + to, Y + 60, 1150 + to - d * 140, Y + 60, 18));
    cap.textContent = "turn: the velocity flips, so it changed: acceleration points away from the wall";
    await tween(700, () => {}, reduce);
  };
  const run = async () => { if (busy) return; busy = true; await leg(0, R); await leg(R, L); await leg(L, 0); busy = false; say("The speed never changed, but the direction did, so the velocity changed. That is acceleration.", true); };
  tapCut(ctx, "runner", "Runner: tap to bounce between the walls", run);
  art.touchable(["runner"]);
  return { destroy() {} };
}

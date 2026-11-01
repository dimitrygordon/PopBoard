// Speeding up or slowing down: set the signs of v and a, predict, then play. The car speeds up when
// the signs match and slows down when they are opposite.
import { svg, path, tween, caption, tapCut, arrowD, RED, VIOLET, NAVY } from "../kit.js";
const Y = 800, PX = 40;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const dots = path(s, "", { stroke: NAVY, "stroke-width": 16 }), va = path(s, "", { stroke: RED, "stroke-width": 6 }), aa = path(s, "", { stroke: VIOLET, "stroke-width": 6 });
  const cap = caption(layer, [1180, 820, 1590, 895], 22, "v: +   a: +\nPredict, then press Play.");
  let sv = 1, sa = 1, guess = null;
  const label = () => { cap.textContent = `v: ${sv > 0 ? "+" : "\u2212"}   a: ${sa > 0 ? "+" : "\u2212"}\n${guess ? "you predict: " + guess : "Predict, then press Play."}`; };
  const flip = (id) => { art.touched(id); if (id === "toggle1") sv = -sv; else sa = -sa; label(); };
  const play = async () => {
    const v0 = 6 * sv, a = 2 * sa, T = sv * sa < 0 ? 3 : 2.5, x0 = sv > 0 ? 300 : 1300; let d = "";
    for (let k = 0; k <= 5; k++) { const t = (k / 5) * T, x = x0 + PX * (v0 * t + 0.5 * a * t * t); d += `M ${x} ${Y} h 0.1 `; }
    await tween(1500, (u) => { const t = u * T, x = x0 + PX * (v0 * t + 0.5 * a * t * t), v = v0 + a * t; va.setAttribute("d", arrowD(x, Y - 30, x + v * 14, Y - 30, 12)); aa.setAttribute("d", arrowD(x, Y - 55, x + a * 30, Y - 55, 12)); dots.setAttribute("d", d.split("M").slice(0, 1 + Math.floor(u * 5.999) + 1).join("M")); }, reduce);
    const ans = sv * sa > 0 ? "speeding up" : "slowing down";
    say(`${ans[0].toUpperCase() + ans.slice(1)}: v and a point ${sv * sa > 0 ? "the same way" : "opposite ways"}.${guess ? (guess === ans ? " Your prediction was right." : " Not what you predicted.") : ""}`, true);
  };
  ui.button("Predict: speeding up", () => { guess = "speeding up"; label(); });
  ui.button("Predict: slowing down", () => { guess = "slowing down"; label(); });
  ui.button("Play", play);
  tapCut(ctx, "toggle1", "Velocity sign chip: tap to flip", () => flip("toggle1"));
  tapCut(ctx, "toggle2", "Acceleration sign chip: tap to flip", () => flip("toggle2"));
  art.touchable(["toggle1", "toggle2"]);
  return { destroy() {} };
}

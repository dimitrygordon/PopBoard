// Roll the ball: launched at 2.0 m/s, it slows at mu*g with sandbox rolling-resistance values carpet 0.10,
// wood 0.020, ice 0.0020, so it rolls 2.0 m, 10 m or 102 m. The strip is drawn as 10 m (not to scale for ice).
import { svg, path, tween, caption, tapCut, f2 } from "../kit.js";
const S = [["carpet", 0.1, 258], ["wood", 0.02, 448], ["ice", 0.002, 638]], V0 = 2, X0 = 250, X1 = 1400;
export default function build(ctx) {
  const { ui, say, layer, reduce } = ctx;
  const s = svg(layer); const b = path(s, "", { stroke: "#D98B6A", "stroke-width": 40 });
  const cap = caption(layer, [1100, 700, 1580, 760], 22, "surface: carpet");
  let k = 0;
  ui.button("Next surface", () => { k = (k + 1) % 3; cap.textContent = `surface: ${S[k][0]}`; });
  tapCut(ctx, "ball", "Roll the ball", async () => {
    const [n, mu, y] = S[k], a = mu * 9.8, d = (V0 * V0) / (2 * a), T = V0 / a, px = (X1 - X0) / 10;
    await tween(2200, (u) => { const t = u * Math.min(T, 5 / V0 * 2), x = V0 * t - 0.5 * a * t * t; b.setAttribute("d", `M ${Math.min(X1, X0 + x * px)} ${y} h 0.1`); }, reduce);
    cap.textContent = `${n}: stops after ${f2(d, d < 10 ? 1 : 0)} m`;
    say(d > 20 ? `On ${n} it barely slows: about ${f2(d, 0)} meters. With no friction at all it would never stop.` : `On ${n} friction stops it after ${f2(d, 1)} meters.`, true);
  });
  ctx.art.touchable(["ball"]);
  return { destroy() {} };
}

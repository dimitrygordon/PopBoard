// Cut the string: the tension arrow is gone, only F_g is left, so the force is unbalanced and the ball
// accelerates downward. A motion diagram (a dot every 0.1 s) shows the growing gaps.
import { svg, path, tween, caption, tapCut, NAVY } from "../kit.js";
const X = 1460, Y0 = 200, PXM = 300;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const dots = path(s, "", { stroke: NAVY, "stroke-width": 18 });
  const cap = caption(layer, [1180, 110, 1590, 170], 22, "string: holding");
  let cut = false;
  const go = async () => {
    if (cut) { cut = false; dots.setAttribute("d", ""); cap.textContent = "string: holding"; return; }
    cut = true; cap.textContent = "string: cut, only F_g acts";
    await tween(1600, (u) => { const t = u * 0.6; let d = ""; for (let k = 0; k <= Math.floor(t / 0.1 + 1e-6); k++) d += `M ${X} ${Y0 + 4.9 * (k * 0.1) ** 2 * PXM} h 0.1 `; dots.setAttribute("d", d); }, reduce);
    say("With the string cut, nothing balances gravity. The net force points down, so the ball accelerates down.", true);
  };
  tapCut(ctx, "cut", "Cut the string button", go);
  art.touchable(["cut"]);
  return { destroy() {} };
}

// Tug-of-war cart: set the left and right pulls (0 to 30 N, 10 px per N) and run a trial. The sandbox cart
// has a mass of 2.0 kg and rolls without friction, so a = (F_right - F_left) / m.
import { svg, path, tween, caption, tapCut, arrowD, BLUE, f2 } from "../kit.js";
const M = 2.0, Y = 570, PXN = 10, PXM = 60;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const ar = path(s, "", { stroke: BLUE, "stroke-width": 9 });
  const cap = caption(layer, [560, 680, 1040, 780], 24);
  let R = 20, L = 20, x = 0;
  const draw = () => { ar.setAttribute("d", arrowD(900 + x, Y, 900 + x + R * PXN, Y, 18) + " " + arrowD(700 + x, Y, 700 + x - L * PXN, Y, 18)); const a = (R - L) / M; cap.textContent = `F_net = ${R} N \u2212 ${L} N = ${R - L} N\na = ${f2(a, 1)} m/s\u00b2`; };
  const run = async () => {
    art.touched("cart"); const a = (R - L) / M;
    await tween(1500, (u) => { x = Math.max(-350, Math.min(350, 0.5 * a * (u * 1.5) ** 2 * PXM)); art.set("cart", { dx: x }); draw(); }, reduce);
    say(R === L ? "Equal pulls: no net force, no acceleration. Run it again and the same thing happens." : `Unequal pulls: the cart accelerates toward the ${R > L ? "right" : "left"} at ${f2(Math.abs(a), 1)} meters per second squared.`, true);
    await tween(400, () => {}, reduce); x = 0; art.set("cart", { dx: 0 }); draw();
  };
  ui.slider({ label: "Right pull", min: 0, max: 30, step: 1, value: 20, fmt: (v) => v + " N" }, (v) => { R = v; draw(); });
  ui.slider({ label: "Left pull", min: 0, max: 30, step: 1, value: 20, fmt: (v) => v + " N" }, (v) => { L = v; draw(); });
  ui.button("Run trial", run);
  tapCut(ctx, "cart", "Cart: tap to run a trial", run);
  tapCut(ctx, "Fr", "Right pull: tap to add 5 N", () => { R = (R + 5) % 35; draw(); });
  tapCut(ctx, "Fl", "Left pull: tap to add 5 N", () => { L = (L + 5) % 35; draw(); });
  art.show("Fr", false); art.show("Fl", false); art.touchable(["cart", "Fr", "Fl"]); draw();
  return { destroy() {} };
}

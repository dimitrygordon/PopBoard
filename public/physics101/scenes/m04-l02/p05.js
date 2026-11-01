// Elevator scale: 60 kg rider, acceleration -5 to +5 m/s^2 (+ is up). The scale reads m(g + a).
import { caption, tapCut, f2 } from "../kit.js";
const M = 60, CY = [2, 0, -2];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [880, 780, 1580, 880], 24);
  let a = 0, c = 1;
  const show = (talk) => { const R = M * (9.8 + a); cap.textContent = `a = ${f2(a, 1)} m/s\u00b2\nscale reads ${f2(R, 0)} N (true weight 588 N)`; if (talk) say(a > 0 ? `Accelerating up: the scale reads ${f2(R, 0)} newtons, more than your weight.` : a < 0 ? `Accelerating down: only ${f2(R, 0)} newtons, less than your weight.` : "No acceleration: the scale reads your true weight, 588 newtons.", true); };
  const sl = ui.slider({ label: "Acceleration", min: -5, max: 5, step: 0.5, value: 0, fmt: (v) => f2(v, 1) + " m/s\u00b2" }, (v) => { a = v; show(true); });
  tapCut(ctx, "acc", "Elevator acceleration: tap for up, zero, down", () => { c = (c + 1) % 3; a = CY[c]; sl.set(a); show(true); });
  ctx.art.touchable(["acc"]); show(false);
  return { destroy() {} };
}

// Elevator calculator: mass 40-120 kg (example 75.0), acceleration -5 to +5 m/s^2 (example +2.00).
// F_scale = m(a + g); tapping compares it with the true weight mg.
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [880, 790, 1580, 890], 22);
  let m = 75, a = 2;
  const show = () => { const R = m * (a + 9.8); cap.textContent = `F_scale = ${m} kg \u00d7 (${f2(a, 1)} + 9.8) m/s\u00b2 = ${f2(R, 0)} N\nat rest: mg = ${f2(m * 9.8, 0)} N`; return R; };
  ui.slider({ label: "Mass", min: 40, max: 120, step: 1, value: 75, fmt: (v) => v + " kg" }, (v) => { m = v; show(); });
  ui.slider({ label: "Acceleration", min: -5, max: 5, step: 0.5, value: 2, fmt: (v) => f2(v, 1) + " m/s\u00b2" }, (v) => { a = v; show(); });
  tapCut(ctx, "mass", "Compare the reading with your true weight", () => { const R = show(), d = R - m * 9.8; say(d === 0 ? "Same as your true weight." : `The scale reads ${f2(Math.abs(d), 0)} newtons ${d > 0 ? "more" : "less"} than your true weight.`, true); });
  ctx.art.touchable(["mass"]); show();
  return { destroy() {} };
}

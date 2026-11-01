// Drag racing calculator: from a standing start with constant acceleration, v-bar = d / t and a = 2d / t^2.
// Defaults are the NHRA Top Fuel numbers (305 m in 3.623 s). The model's finish speed is 2 v-bar.
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = caption(layer, [960, 220, 1560, 420], 24, "Set the course and time, then tap the calculator.");
  let d = 305, t = 3.623;
  const calc = () => {
    art.touched("calc"); const vb = d / t, a = (2 * d) / (t * t);
    cap.textContent = `average speed = ${d} m / ${t.toFixed(3)} s = ${f2(vb, 1)} m/s\nconstant a from rest = 2d / t\u00b2 = ${f2(a, 1)} m/s\u00b2\nmodel finish speed = 2 \u00d7 average = ${f2(2 * vb, 1)} m/s`;
    say(d === 305 && Math.abs(t - 3.623) < 1e-6 ? "About 46.5 meters per second squared. The model's finish speed, 168 meters per second, is more than the record 155.1, so a real dragster's acceleration is not constant." : `Average speed ${f2(vb, 1)} meters per second, and a constant acceleration of ${f2(a, 1)} meters per second squared.`, true);
  };
  ui.slider({ label: "Course length", min: 100, max: 1000, step: 1, value: 305, fmt: (x) => x + " m" }, (x) => (d = x));
  ui.slider({ label: "Time", min: 2, max: 20, step: 0.001, value: 3.623, fmt: (x) => x.toFixed(3) + " s" }, (x) => (t = x));
  ui.button("Calculate", calc);
  tapCut(ctx, "calc", "Calculator chip: tap to calculate", calc);
  art.touchable(["calc"]);
  return { destroy() {} };
}

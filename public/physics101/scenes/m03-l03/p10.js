// Free-fall timer: starting from rest with up as +, v_f = -9.8 t and x_f = -4.9 t^2. Time 0.5 to 3.0 s
// (book: 1.5 s gives -15 m/s and -11 m).
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = caption(layer, [560, 600, 1100, 720], 26);
  let t = 1.5;
  const show = (talk) => {
    const v = -9.8 * t, x = -4.9 * t * t;
    cap.textContent = `t = ${f2(t, 1)} s\nv_f = (\u22129.8 m/s\u00b2)(${f2(t, 1)} s) = ${f2(v, 1)} m/s\nx_f = \u00bd(\u22129.8 m/s\u00b2)(${f2(t, 1)} s)\u00b2 = ${f2(x, 1)} m`;
    if (talk) { art.touched("timer"); say(`After ${f2(t, 1)} seconds of free fall, riders move at ${f2(-v, 1)} meters per second downward and have dropped ${f2(-x, 1)} meters, whatever their mass.`, true); }
  };
  ui.slider({ label: "Free-fall time", min: 0.5, max: 3, step: 0.1, value: 1.5, fmt: (x) => f2(x, 1) + " s" }, (x) => { t = x; show(false); });
  tapCut(ctx, "timer", "Free-fall timer: tap to compute", () => show(true));
  art.touchable(["timer"]); show(false);
  return { destroy() {} };
}

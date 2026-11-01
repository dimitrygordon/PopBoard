// Hoist: bucket mass 10-80 kg (example 50.0), final speed after 3.0 m from rest 0-5 m/s (example 3.0, so
// a = v^2 / 6 m = 1.5 m/s^2). F_T = ma + mg; warning above the 525 N rope limit.
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [880, 760, 1580, 890], 22);
  let m = 50, v = 3;
  const show = () => { const a = (v * v) / 6, T = m * a + m * 9.8, bad = T > 525; cap.textContent = `a = ${f2(a, 2)} m/s\u00b2\nF_T = ${f2(m * a, 0)} N + ${f2(m * 9.8, 0)} N = ${f2(T, 0)} N${bad ? "\n\u26a0 over 525 N: the rope is in danger" : ""}`; cap.style.color = bad ? "#B5473A" : ""; return T; };
  ui.slider({ label: "Bucket mass", min: 10, max: 80, step: 1, value: 50, fmt: (x) => x + " kg" }, (x) => { m = x; show(); });
  ui.slider({ label: "Final speed", min: 0, max: 5, step: 0.5, value: 3, fmt: (x) => f2(x, 1) + " m/s" }, (x) => { v = x; show(); });
  tapCut(ctx, "hoist", "Check the hoist", () => { const T = show(); say(T > 525 ? `${f2(T, 0)} newtons is over the 525 newton limit. Lift slower or lighter.` : `${f2(T, 0)} newtons: within the rope's limit.`, true); });
  ctx.art.touchable(["hoist"]); show();
  return { destroy() {} };
}

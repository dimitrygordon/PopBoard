// Tug-of-war tension: each team pulls 0 to 800 N (500 N each in the example). Equal pulls: the rope does not
// accelerate and the scale reads the tension, 500 N (not 1000 N). Unequal: everything accelerates toward the
// stronger team (8 people, sandbox total 520 kg) and, for a light rope, the tension is the average of the pulls.
import { caption, tapCut, f2 } from "../kit.js";
const M = 520;
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [300, 800, 1340, 890], 22);
  let L = 500, R = 500;
  const show = (talk) => { const T = (L + R) / 2, a = Math.abs(L - R) / M; cap.textContent = L === R ? `scale reads ${L} N; no acceleration` : `scale reads ${f2(T, 0)} N; teams accelerate toward the ${L > R ? "left" : "right"} at ${f2(a, 2)} m/s\u00b2`; if (talk) say(L === R ? `Equal pulls of ${L} newtons: the tension is ${L} newtons, not double.` : `Unequal pulls: the ${L > R ? "left" : "right"} team wins and everyone accelerates.`, true); };
  const sl = ui.slider({ label: "Left team", min: 0, max: 800, step: 50, value: 500, fmt: (v) => v + " N" }, (v) => { L = v; show(true); });
  ui.slider({ label: "Right team", min: 0, max: 800, step: 50, value: 500, fmt: (v) => v + " N" }, (v) => { R = v; show(true); });
  tapCut(ctx, "scale", "Center scale: tap to reset the left team to 500 N", () => { L = 500; sl.set(L); show(true); });
  ctx.art.touchable(["scale"]); show(false);
  return { destroy() {} };
}

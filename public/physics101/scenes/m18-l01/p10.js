// Thundercloud: Slide time as charge separates in the cloud.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 10, step: 1, value: 3, unit: "min", d: 0 }],
    cuts: [
    { id: "try", label: "Cloud: tap to explain", tap: (st, c) => { return "Separated, not created: the total stays zero."; } }],
    show: (st) => `top: +${st.t * 5} C, bottom: \u2212${st.t * 5} C\ntotal: 0 C`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

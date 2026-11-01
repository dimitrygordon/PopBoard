// Two stars: Slide the stars' angular separation (telescope D = 0.10 m, \u03bb = 550 nm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Separation", min: 2, max: 15, step: 0.1, value: 5, unit: "\\u00b5rad", d: 1 }],
    cuts: [
    { id: "try", label: "Stars: tap to explain", tap: (st, c) => { return "Rayleigh: just resolved when one center sits on the other's first dark ring."; } }],
    show: (st) => `limit = 1.22\u03bb/D = 6.7 \u00b5rad\n${st.s >= 6.7 ? "resolved" : "merged"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

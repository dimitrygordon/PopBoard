// f\u03bb = c: Slide the frequency.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "f", min: 1, max: 100, step: 1, value: 10, unit: "MHz", d: 0 }],
    cuts: [
    { id: "try", label: "Wave: tap to explain", tap: (st, c) => { return "f\u03bb = c always in a vacuum."; } }],
    show: (st) => `\u03bb = c/f = ${F(300 / st.f, 2)} m`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

// Voltmeters: Tap to move the voltmeter (two 6.0 \u03a9 lamps on 12 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Voltmeter: tap to switch lamps", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => `lamp ${st.i + 1}: \u0394V = IR = 1.0 A \u00d7 6.0 \u03a9 = 6.0 V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

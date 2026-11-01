// Scale: Tap for the next object.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["baseball (0.145 kg, 40 m/s): \u03bb = 1.1 \u00d7 10\u207b\u00b3\u2074 m", "dust grain (1 \u00b5g, 1 mm/s): \u03bb = 6.6 \u00d7 10\u207b\u00b2\u2074 m", "electron (10\u2076 m/s): \u03bb = 7.3 \u00d7 10\u207b\u00b9\u2070 m"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Scale: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

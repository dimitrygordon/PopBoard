// Example Problem 1: 2.10e2 kPa, 3.14e2 kPa.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 0 },
    sliders: [],
    cuts: [
    { id: "ex1", label: "Pressure readout: tap to tip the stool", tap: (st, c) => { st.t = 1 - st.t; return st.t ? "Two legs: 3.14 \u00d7 10\u00b2 kPa." : "Three legs: 2.10 \u00d7 10\u00b2 kPa."; } }],
    show: (st) => st.t ? "P = 405 N / 12.9 cm\u00b2 = 3.14 \u00d7 10\u00b2 kPa" : "P = 405 N / 19.3 cm\u00b2 = 2.10 \u00d7 10\u00b2 kPa",
  });
  ctx.art.touchable(["ex1"]);
  return { destroy() {} };
}

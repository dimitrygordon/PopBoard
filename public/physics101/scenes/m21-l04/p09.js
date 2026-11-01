// Antenna: Slide time as the AC antenna radiates.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 4, step: 1, value: 1, unit: "periods", d: 0 }],
    cuts: [
    { id: "try", label: "Antenna: tap to explain", tap: (st, c) => { return "Changing E and B peel off and spread at c."; } }],
    show: (st) => `${st.t} loop${st.t === 1 ? "" : "s"} of field spreading outward`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

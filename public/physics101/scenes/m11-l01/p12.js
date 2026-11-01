// Q = mC\u0394T: Set the mass of water and its temperature change, then read Q.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass of water", min: 0.1, max: 5, step: 0.1, value: 1, unit: "kg", d: 1 }, { key: "d", label: "\\u0394T", min: -50, max: 50, step: 1, value: 10, unit: "K", d: 0 }],
    cuts: [
    { id: "q", label: "Q readout: tap for the sign", tap: (st, c) => { return st.d >= 0 ? "Positive Q: energy flows in." : "Negative Q: energy flows out."; } }],
    show: (st) => `Q = mC\u0394T = ${F(st.m, 1)} \u00d7 4180 \u00d7 ${st.d} = ${E(st.m * 4180 * st.d, 2)} J`,
  });
  ctx.art.touchable(["q"]);
  return { destroy() {} };
}

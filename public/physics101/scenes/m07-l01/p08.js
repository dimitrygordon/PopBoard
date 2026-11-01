// Example Problem 1: Io T = 1.8 days, r = 4.2 units; r_C = r_I (T_C/T_I)^(2/3). Book answer for 16.7 days: 19 units.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "T", label: "Callisto's period", min: 1.8, max: 20, step: 0.1, value: 16.7, unit: "days", d: 1 }],
    cuts: [
    { id: "io", label: "Io: tap to show the step", tap: (st, c) => { return `r_C\u00b3 = (4.2)\u00b3 \u00d7 (${F(st.T, 1)} / 1.8)\u00b2, then take the cube root.`; } }],
    show: (st) => `r_C = 4.2 \u00d7 (${F(st.T, 1)} / 1.8)^(2/3) = ${F(4.2 * (st.T / 1.8) ** (2 / 3), 1)} units`,
  });
  ctx.art.touchable(["io"]);
  return { destroy() {} };
}

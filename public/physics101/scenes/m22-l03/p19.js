// Forces: Change the orbital speed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 1, max: 4, step: 0.1, value: 2.19, unit: "\\u00d7 10\\u2076 m/s", d: 2 }],
    cuts: [
    { id: "try", label: "Orbit: tap to explain", tap: (st, c) => { return "r = kq\u00b2/mv\u00b2."; } }],
    show: (st) => `r = ${F(8.99e9 * (1.602e-19) ** 2 / (9.11e-31 * (st.v * 1e6) ** 2) * 1e9, 3)} nm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

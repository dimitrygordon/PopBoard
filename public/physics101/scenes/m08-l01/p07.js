// omega_f = omega_i + alpha t from rest.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { t: 0 },
    sliders: [{ key: "a", label: "Angular acceleration", min: 0.5, max: 10, step: 0.5, value: 3, unit: "rad/s\\u00b2", d: 1 }],
    cuts: [
    { id: "gas", label: "Gas: tap to drive one more second", tap: (st, c) => { st.t = st.t >= 6 ? 0 : st.t + 1; return st.t ? "" : "Back to rest."; } }],
    show: (st) => `t = ${st.t} s: \u03c9 = \u03b1t = ${F(st.a * st.t, 1)} rad/s\nslope of the \u03c9-t graph = ${F(st.a, 1)} rad/s\u00b2`,
  });
  ctx.art.touchable(["gas"]);
  return { destroy() {} };
}

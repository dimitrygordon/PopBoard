// Period: T 0.5 to 10 s (2.0), radius 0.5 to 5.0 m (1.0). v = 2 pi r / T, a_c = 4 pi^2 r / T^2.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "T", label: "Period", min: 0.5, max: 10, step: 0.1, value: 2, unit: "s", d: 1 }, { key: "r", label: "Radius", min: 0.5, max: 5, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "T", label: "Period: tap to halve it", tap: (st, c) => { st.T = Math.max(0.5, st.T / 2); c.T.set(st.T); return ""; } }],
    show: (st) => `v = ${f2(2 * Math.PI * st.r / st.T, 2)} m/s\na_c = ${f2(4 * Math.PI * Math.PI * st.r / (st.T * st.T), 2)} m/s\u00b2`,
  });
  ctx.art.touchable(["T"]);
  return { destroy() {} };
}

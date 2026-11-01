// Flea on a dog on a road: v_d/r 0 to 5 m/s (2.0), v_f/d -2 to 2 m/s (0.5). v_f/r = v_f/d + v_d/r.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Dog on road", min: 0, max: 5, step: 0.1, value: 2, unit: "m/s", d: 1 }, { key: "f", label: "Flea on dog", min: -2, max: 2, step: 0.1, value: 0.5, unit: "m/s", d: 1 }],
    cuts: [
    { id: "flea", label: "Flea: tap to reverse it", tap: (st, c) => { st.f = -st.f; c.f.set(st.f); return ""; } }],
    show: (st) => `v_f/r = ${f2(st.f, 1)} + ${f2(st.d, 1)} = ${f2(st.f + st.d, 1)} m/s`,
  });
  ctx.art.touchable(["flea"]);
  return { destroy() {} };
}

// Drop vs launch from 1.5 m (sandbox): launch speed 0 to 10 m/s (3.0). Both land after sqrt(2h/g) = 0.55 s.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Sideways speed", min: 0, max: 10, step: 0.5, value: 3, unit: "m/s", d: 1 }],
    cuts: [
    { id: "two", label: "Release both balls", tap: (st) => `Both land together after 0.55 seconds; the launched one lands ${f2(st.v * 0.553, 2)} meters away.` }],
    show: (st) => `both land at t = 0.55 s\nlaunched ball: ${f2(st.v * 0.553, 2)} m out`,
  });
  ctx.art.touchable(["two"]);
  return { destroy() {} };
}

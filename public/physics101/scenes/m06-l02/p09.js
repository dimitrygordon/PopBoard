// Example Problem 3: stopper 5 to 50 g (13), string 0.3 to 1.5 m (0.93), period 0.5 to 3.0 s (1.18). F_T = m 4 pi^2 r / T^2 = 0.34 N.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 5, max: 50, step: 1, value: 13, unit: "g", d: 0 }, { key: "r", label: "String", min: 0.3, max: 1.5, step: 0.01, value: 0.93, unit: "m", d: 2 }, { key: "T", label: "Period", min: 0.5, max: 3, step: 0.01, value: 1.18, unit: "s", d: 2 }],
    cuts: [
    { id: "st", label: "Stopper: tap for the worked example", tap: (st, c) => { st.m = 13; st.r = 0.93; st.T = 1.18; c.m.set(13); c.r.set(0.93); c.T.set(1.18); return "26 meters per second squared, so 0.34 newtons."; } }],
    show: (st) => { const a = 4 * Math.PI * Math.PI * st.r / (st.T * st.T); return `a_c = ${f2(a, 1)} m/s\u00b2\nF_T = ${f2(st.m / 1000 * a, 2)} N`; },
  });
  ctx.art.touchable(["st"]);
  return { destroy() {} };
}

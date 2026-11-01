// Ring in equilibrium: a 10.0 N weight hangs from a ring held by two scales at 60 degrees above horizontal (sandbox geometry). Each scale 0 to 12 N; balance needs both at 5.8 N.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Left scale", min: 0, max: 12, step: 0.1, value: 4, unit: "N", d: 1 }, { key: "b", label: "Right scale", min: 0, max: 12, step: 0.1, value: 4, unit: "N", d: 1 }],
    cuts: [
    { id: "s0", label: "Left scale: tap to add 1 N", tap: (st, c) => { st.a = (st.a + 1) % 13; c.a.set(st.a); return ""; } },
    { id: "s1", label: "Right scale: tap to add 1 N", tap: (st, c) => { st.b = (st.b + 1) % 13; c.b.set(st.b); return ""; } }],
    show: (st) => { const x = (st.b - st.a) * 0.5, y = (st.a + st.b) * Math.sin(deg(60)) - 10, n = Math.hypot(x, y); return `net force ${f2(n, 2)} N\n${n < 0.15 ? "triangle closes: equilibrium" : "not in equilibrium"}`; },
  });
  ctx.art.touchable(["s0", "s1"]);
  return { destroy() {} };
}

// Vectors on a line: A = 3.0 N and B = 4.0 N; tap either to flip its direction. R = A + B.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { a: 3, b: 4 },
    sliders: [],
    cuts: [
    { id: "v0", label: "Vector A: tap to flip its direction", tap: (st) => { st.a = -st.a; return `A is now ${st.a > 0 ? "right" : "left"}.`; } },
    { id: "v1", label: "Vector B: tap to flip its direction", tap: (st) => { st.b = -st.b; const r = st.a + st.b; return `The resultant is ${Math.abs(r)} newtons ${r > 0 ? "to the right" : "to the left"}.`; } }],
    show: (st) => `A = ${f2(st.a,1)} N, B = ${f2(st.b,1)} N\nR = A + B = ${f2(st.a + st.b, 1)} N`,
  });
  ctx.art.touchable(["v0", "v1"]);
  return { destroy() {} };
}

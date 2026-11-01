// Kinetic friction: flick a 1.0 kg book at 0.5 to 3.0 m/s (2.0) with mu_k 0.30 (sandbox value). a = mu_k g opposite the motion; it stops after v^2 / 2a.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Flick speed", min: 0.5, max: 3, step: 0.1, value: 2, unit: "m/s", d: 1 }],
    cuts: [
    { id: "book", label: "Book: tap to flick it", tap: (st) => `Friction slows it at ${f2(0.3 * 9.8, 2)} meters per second squared; it stops after ${f2(st.v * st.v / (2 * 0.3 * 9.8), 2)} meters.` }],
    show: (st) => `f_k = \u03bc_k mg = 2.9 N, opposite the motion\nstops after ${f2(st.v * st.v / 5.88, 2)} m`,
  });
  ctx.art.touchable(["book"]);
  return { destroy() {} };
}

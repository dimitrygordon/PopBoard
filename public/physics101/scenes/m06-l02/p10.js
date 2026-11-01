// Centrifugal 'force': a car at 10 m/s on a 20 m curve (sandbox). A 60 kg passenger needs 300 N inward; with no door or seat force, they keep going straight.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { d: false },
    sliders: [],
    cuts: [
    { id: "door", label: "Door and seat: tap to add or remove", tap: (st) => { st.d = !st.d; return st.d ? "The door pushes the passenger inward, so they follow the curve." : "Nothing pushes inward, so the passenger keeps going straight."; } }],
    show: (st) => st.d ? "door pushes 300 N inward: passenger turns with the car" : "no inward force: passenger keeps going straight",
  });
  ctx.art.touchable(["door"]);
  return { destroy() {} };
}

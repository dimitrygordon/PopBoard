// Example Problem 4: ferry 4.0 m/s east, marble 0.75 m/s north on the deck. Relative to the water: 4.1 m/s at 11 degrees north of east.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { w: false },
    sliders: [],
    cuts: [
    { id: "view", label: "View: tap to switch deck and water", tap: (st) => { st.w = !st.w; return st.w ? "From the water the marble slants: 4.1 meters per second, 11 degrees north of east." : "On the deck it rolls straight across."; } }],
    show: (st) => st.w ? "water view: 4.1 m/s at 11\u00b0 north of east" : "deck view: 0.75 m/s straight north",
  });
  ctx.art.touchable(["view"]);
  return { destroy() {} };
}

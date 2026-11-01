// Carousel: speed 0.5 to 5 m/s (2.0) on a 4.0 m radius (sandbox). Speed is constant; the velocity's direction keeps changing.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { a: 0 },
    sliders: [{ key: "v", label: "Speed", min: 0.5, max: 5, step: 0.5, value: 2, unit: "m/s", d: 1 }],
    cuts: [
    { id: "spin", label: "Spin: tap to move a quarter turn", tap: (st) => { st.a = (st.a + 90) % 360; return "Same speed, new direction."; } }],
    show: (st) => `position ${st.a}\u00b0: v = ${f2(st.v, 1)} m/s pointing ${["north", "west", "south", "east"][st.a / 90]}`,
  });
  ctx.art.touchable(["spin"]);
  return { destroy() {} };
}

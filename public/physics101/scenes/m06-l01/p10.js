// Angled launch at 10 m/s, 60 degrees (sandbox); tap to pick a height of 1, 2 or 3 m. v_y there is the same size going up and down.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { h: 1 },
    sliders: [],
    cuts: [
    { id: "h", label: "Height: tap for the next height", tap: (st) => { st.h = st.h % 3 + 1; return "Same height, same speed: up on the way up, down on the way down."; } }],
    show: (st) => { const vy = Math.sqrt(75 - 19.6 * st.h); return `at ${st.h} m: v_y = +${f2(vy, 1)} m/s up, \u2212${f2(vy, 1)} m/s down`; },
  });
  ctx.art.touchable(["h"]);
  return { destroy() {} };
}

// Air forces on a shot at 10 m/s, 45 degrees (sandbox): calm, tailwind (+1.5 m/s^2 horizontal), headwind (-1.5) or updraft (+2.0 vertical). Sandbox accelerations; landing found numerically.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { w: 0 },
    sliders: [],
    cuts: [
    { id: "wind", label: "Wind: tap to change", tap: (st) => { st.w = (st.w + 1) % 4; return ""; } }],
    show: (st) => { const ax = [0, 1.5, -1.5, 0][st.w], ay = -9.8 + [0, 0, 0, 2][st.w]; let x = 0, y = 0, vx = 7.07, vy = 7.07; while (y >= 0) { x += vx * 0.001; y += vy * 0.001; vx += ax * 0.001; vy += ay * 0.001; } return `${["calm", "tailwind", "headwind", "updraft"][st.w]}: lands ${f2(x, 1)} m away (calm 10.2 m)`; },
  });
  ctx.art.touchable(["wind"]);
  return { destroy() {} };
}

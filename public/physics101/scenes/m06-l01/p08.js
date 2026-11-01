// Launcher at 10 m/s: tap the dial to fire at 15, 30, 45, 60 and 75 degrees. Complementary angles share a range; 45 goes farthest.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { i: -1 },
    sliders: [],
    cuts: [
    { id: "dial", label: "Angle dial: tap to fire at the next angle", tap: (st) => { st.i = (st.i + 1) % 5; const a = 15 * (st.i + 1), r = 100 * Math.sin(deg(2 * a)) / 9.8; return `${a} degrees: ${f2(r, 1)} meters.`; } }],
    show: (st) => [15, 30, 45, 60, 75].slice(0, st.i + 1).map((a) => `${a}\u00b0: ${f2(100 * Math.sin(deg(2 * a)) / 9.8, 1)} m`).join(", "),
    box: [880, 700, 1580, 800], px: 20,
  });
  ctx.art.touchable(["dial"]);
  return { destroy() {} };
}

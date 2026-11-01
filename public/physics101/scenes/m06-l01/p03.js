// Three cameras on a tossed ball: behind (straight up and down), overhead (straight line), sideline (parabola).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: { c: 2 },
    sliders: [],
    cuts: [
    { id: "cam", label: "Camera: tap to switch", tap: (st) => { st.c = (st.c + 1) % 3; return ["From behind the ball just goes up and down.", "From overhead it moves in a straight line at constant speed.", "From the sideline you see the parabola."][st.c]; } }],
    show: (st) => ["camera: behind, up and down", "camera: overhead, straight line", "camera: sideline, parabola"][st.c],
  });
  ctx.art.touchable(["cam"]);
  return { destroy() {} };
}

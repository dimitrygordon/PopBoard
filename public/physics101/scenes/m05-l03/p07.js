// Example Problem 5: weight 100 to 1000 N (562), incline 0 to 60 degrees (30.0). Parallel = F_g sin(phi), perpendicular = F_g cos(phi).
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "W", label: "Weight", min: 100, max: 1000, step: 1, value: 562, unit: "N", d: 0 }, { key: "t", label: "Incline", min: 0, max: 60, step: 0.5, value: 30, unit: "\u00b0", d: 1 }],
    cuts: [
    { id: "ang", label: "Angle: tap for the worked example", tap: (st, c) => { st.W = 562; st.t = 30; c.W.set(562); c.t.set(30); return "281 newtons down the slope and 487 newtons into it."; } }],
    show: (st) => `parallel: ${f2(st.W * Math.sin(deg(st.t)), 0)} N\nperpendicular: ${f2(st.W * Math.cos(deg(st.t)), 0)} N`,
  });
  ctx.art.touchable(["ang"]);
  return { destroy() {} };
}

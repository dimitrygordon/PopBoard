// Example Problem 1: counter 0.50 to 1.50 m (1.05), plate speed 0.10 to 2.0 m/s (0.74). t = sqrt(2h/g); x = v t.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Counter height", min: 0.5, max: 1.5, step: 0.01, value: 1.05, unit: "m", d: 2 }, { key: "v", label: "Plate speed", min: 0.1, max: 2, step: 0.01, value: 0.74, unit: "m/s", d: 2 }],
    cuts: [
    { id: "plate", label: "Plate: tap for the worked example", tap: (st, c) => { st.h = 1.05; st.v = 0.74; c.h.set(1.05); c.v.set(0.74); return "0.46 seconds to fall, landing 0.34 meters out."; } }],
    show: (st) => { const t = Math.sqrt(2 * st.h / 9.8); return `t = ${f2(t, 2)} s, lands ${f2(st.v * t, 2)} m out`; },
  });
  ctx.art.touchable(["plate"]);
  return { destroy() {} };
}

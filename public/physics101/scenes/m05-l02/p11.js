// Example Problem 4: 25.0 kg box, mu_k 0.20 (friction 49 N), v_i 1.0 m/s. Push 0 to 150 N (98). a = (push - 49 N) / m; distance in 3.0 s, stopping if it slows to rest.
import { calc, f2, deg, rad2 } from "../kit.js";
export default function build(ctx) {
  calc(ctx, {
    st: {},
    sliders: [{ key: "F", label: "Push", min: 0, max: 150, step: 1, value: 98, unit: "N", d: 0 }],
    cuts: [
    { id: "push", label: "Push: tap for the worked example", tap: (st, c) => { st.F = 98; c.F.set(98); return "98 newtons: 2.0 meters per second squared, 12 meters in 3 seconds."; } }],
    show: (st) => { const a = (st.F - 49) / 25; let d; if (a >= 0) d = 3 + 0.5 * a * 9; else { const ts = Math.min(3, -1 / a); d = ts + 0.5 * a * ts * ts; } return `a = (${st.F} N \u2212 49 N) / 25.0 kg = ${f2(a, 2)} m/s\u00b2\n${a > 0 ? "speeds up" : a === 0 ? "cruises" : "slows"}, ${f2(d, 1)} m in 3.0 s`; },
  });
  ctx.art.touchable(["push"]);
  return { destroy() {} };
}

// Example Problem 4: 35 g at 875 m/s: v = +0.36 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Gas speed", min: 200, max: 1500, step: 25, value: 875, unit: "m/s", d: 0 }],
    cuts: [
    { id: "ex4", label: "Ex4: tap to fire", tap: (st, c) => { return `The astronaut drifts at ${F(0.035 * st.v / 84, 2)} meters per second, opposite the gas.`; } }],
    show: (st) => `v_C = 0.035 \u00d7 ${st.v} / 84 = +${F(0.035 * st.v / 84, 2)} m/s`,
  });
  ctx.art.touchable(["ex4"]);
  return { destroy() {} };
}

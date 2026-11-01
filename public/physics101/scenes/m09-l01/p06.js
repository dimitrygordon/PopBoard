// 0.145 kg ball toward the bat is negative: v_f = v_i + J/m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Pitch speed", min: 20, max: 45, step: 1, value: 38, unit: "m/s", d: 0 }, { key: "J", label: "Bat impulse", min: 5, max: 20, step: 0.5, value: 12, unit: "N\\u00b7s", d: 1 }],
    cuts: [
    { id: "fast", label: "Fast: tap to swing", tap: (st, c) => { return `The ball leaves at ${F(-st.v + st.J / 0.145, 0)} meters per second.`; } }],
    show: (st) => `v_f = \u2212${st.v} + ${F(st.J, 1)}/0.145 = ${F(-st.v + st.J / 0.145, 0)} m/s`,
  });
  ctx.art.touchable(["fast"]);
  return { destroy() {} };
}

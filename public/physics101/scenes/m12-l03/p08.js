// Example Problem 3: granite: buoyant 9.8 N, weight 26.5 N, net 16.7 N down.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["granite", "aluminum", "iron", "pine"], D: [2700, 2700, 7870, 500] },
    sliders: [],
    cuts: [
    { id: "mat", label: "F net: tap to swap material", tap: (st, c) => { st.i = (st.i + 1) % 4; return st.i === 3 ? "Pine is less dense than water: the net force is up." : ""; } }],
    show: (st) => `${st.N[st.i]}: weight ${F(st.D[st.i] * 0.0098, 1)} N, buoyant 9.8 N\nF_net = ${F(Math.abs(st.D[st.i] * 0.0098 - 9.8), 1)} N ${st.D[st.i] > 1000 ? "down" : "up"}`,
  });
  ctx.art.touchable(["mat"]);
  return { destroy() {} };
}

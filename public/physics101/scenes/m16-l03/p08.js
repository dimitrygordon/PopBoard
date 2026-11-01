// Race: Tap to race a pulse 1.0 m through the next medium.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["vacuum", "water", "glass", "diamond"], n: [1, 1.33, 1.52, 2.42] },
    sliders: [],
    cuts: [
    { id: "try", label: "Race: tap for the next medium", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => `${st.N[st.i]}: v = c/n = ${E(3e8 / st.n[st.i], 2)} m/s\ntime for 1.0 m: ${F(st.n[st.i] * 3.33, 2)} ns`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

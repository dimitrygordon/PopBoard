// Work function: Tap to pick the next metal.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["sodium", "potassium", "zinc", "copper"], W: [2.36, 2.29, 4.33, 4.70] },
    sliders: [],
    cuts: [
    { id: "try", label: "Metal: tap for the next", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => `${st.N[st.i]}: W = ${st.W[st.i]} eV\nlongest \u03bb = ${F(1240 / st.W[st.i], 0)} nm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

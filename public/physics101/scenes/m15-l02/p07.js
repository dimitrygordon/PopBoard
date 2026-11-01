// Red shirt: Tap to switch the lamp shining on a red shirt.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["white", "red", "blue"], R: ["red", "red", "black"] },
    sliders: [],
    cuts: [
    { id: "lamp", label: "Object color: tap for the next lamp", tap: (st, c) => { st.i = (st.i + 1) % 3; return "The dye absorbs everything but red."; } }],
    show: (st) => `${st.N[st.i]} light: the shirt looks ${st.R[st.i]}`,
  });
  ctx.art.touchable(["lamp"]);
  return { destroy() {} };
}

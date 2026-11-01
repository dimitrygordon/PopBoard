// Pigments: Tap to mix the next pigment pair.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["cyan + yellow = green (absorbs red, blue)", "yellow + magenta = red (absorbs green, blue)", "magenta + cyan = blue (absorbs green, red)", "all three = black (absorbs all)"] },
    sliders: [],
    cuts: [
    { id: "pal", label: "Absorbed colors: tap for the next mix", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["pal"]);
  return { destroy() {} };
}

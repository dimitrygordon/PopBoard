// Spotlights: Tap to switch which spotlights overlap.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["red + green = yellow", "green + blue = cyan", "blue + red = magenta", "red + green + blue = white"] },
    sliders: [],
    cuts: [
    { id: "mix", label: "Secondary colors: tap for the next mix", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["mix"]);
  return { destroy() {} };
}

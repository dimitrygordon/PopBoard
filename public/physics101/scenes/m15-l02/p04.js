// Two prisms: Tap to line up the second prism (upside down).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "pr", label: "White again: tap to add or remove prism 2", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? "prism 2 recombines the colors: white light again" : "one prism: a spectrum, red bent least, violet most",
  });
  ctx.art.touchable(["pr"]);
  return { destroy() {} };
}

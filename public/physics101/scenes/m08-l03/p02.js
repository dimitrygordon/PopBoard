// Plumb lines: Tap to hang the shape from the next hole and draw its plumb line.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "hang", label: "Hang: tap to hang from the next hole", tap: (st, c) => { st.n = st.n % 3 + 1; return st.n > 1 ? "The plumb lines cross at the center of mass." : ""; } }],
    show: (st) => `${st.n} plumb line${st.n > 1 ? "s" : ""} drawn${st.n > 1 ? ": they cross at the center of mass" : ""}`,
  });
  ctx.art.touchable(["hang"]);
  return { destroy() {} };
}

// Logic: Tap to step through input combinations.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { m: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Switches: tap for the next", tap: (st, c) => { st.m = (st.m + 1) % 4; return ""; } }],
    show: (st) => `A = ${st.m & 1}, B = ${st.m >> 1 & 1}: lamp ${st.m === 3 ? "on" : "off"} (series: AND)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

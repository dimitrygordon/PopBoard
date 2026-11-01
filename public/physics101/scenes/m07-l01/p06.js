// Table 1 style values: radius in AU, period in years (standard values).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, P: [["Mercury", 0.387, 0.241], ["Venus", 0.723, 0.615], ["Earth", 1, 1], ["Mars", 1.52, 1.88], ["Jupiter", 5.20, 11.9], ["Saturn", 9.54, 29.5]], pairs: [[4, 2], [3, 2], [5, 4], [0, 1], [5, 3]] },
    sliders: [],
    cuts: [
    { id: "pair", label: "Pair: tap for the next two planets", tap: (st, c) => { st.i = (st.i + 1) % st.pairs.length; return "The two ratios match: that is Kepler's third law."; } }],
    show: (st) => (() => { const [a, b] = st.pairs[st.i].map((j) => st.P[j]); return `${a[0]} vs ${b[0]}\n(r_A/r_B)\u00b3 = ${F((a[1] / b[1]) ** 3, 2)}   (T_A/T_B)\u00b2 = ${F((a[2] / b[2]) ** 2, 2)}`; })(),
  });
  ctx.art.touchable(["pair"]);
  return { destroy() {} };
}

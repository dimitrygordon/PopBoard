// Ideal pulley system lifting 600 N.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 1 },
    sliders: [],
    cuts: [
    { id: "pul", label: "Pul: tap to add a supporting strand", tap: (st, c) => { st.n = st.n % 4 + 1; return ""; } }],
    show: (st) => `${st.n} supporting strand${st.n > 1 ? "s" : ""}: MA = ${st.n}\neffort = 600 / ${st.n} = ${600 / st.n} N, pull ${st.n} m of rope per meter of lift`,
  });
  ctx.art.touchable(["pul"]);
  return { destroy() {} };
}

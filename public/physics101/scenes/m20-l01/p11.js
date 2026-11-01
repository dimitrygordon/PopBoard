// Filings: Tap to sprinkle more iron filings.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Filings: tap to sprinkle", tap: (st, c) => { st.n = (st.n + 1) % 4; return ""; } }],
    show: (st) => st.n ? `${st.n * 100} filings: lines curve from N to S, crowding at the poles` : "no filings yet",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

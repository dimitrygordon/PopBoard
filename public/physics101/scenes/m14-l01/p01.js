// Bell: Tap the bell to strike it.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 0 },
    sliders: [],
    cuts: [
    { id: "bell", label: "Air particles: tap to strike", tap: (st, c) => { st.n++; return "Compressions and rarefactions spread out; each particle only jiggles in place."; } }],
    show: (st) => `strikes: ${st.n}\nhigh pressure, low pressure, high pressure... moving outward`,
  });
  ctx.art.touchable(["bell"]);
  return { destroy() {} };
}

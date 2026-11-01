// Fission: Tap to fire the neutron.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "U-235: tap to fire", tap: (st, c) => { st.s = 1; return ""; } }],
    show: (st) => st.s ? "mass lost \u2248 0.2 u \u2192 about 200 MeV released" : "ready",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

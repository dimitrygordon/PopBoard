// Compass: Tap to spin the compass to a new spot on the globe.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["Ohio", "Brazil", "Norway"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Globe: tap for the next spot", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: the needle's north pole points toward geographic north\n(Earth's magnetic south pole is up there)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

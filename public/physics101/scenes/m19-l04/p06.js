// Dimming lamp: Tap to switch the hair dryer on or off.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { d: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Dryer: tap to toggle", tap: (st, c) => { st.d = 1 - st.d; return ""; } }],
    show: (st) => st.d ? "dryer on: wiring drop 15 V, lamp 110 V (dims)" : "dryer off: lamp 124 V",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

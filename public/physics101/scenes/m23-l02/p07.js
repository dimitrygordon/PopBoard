// LED: Tap to flip the LED.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { f: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "LED: tap to flip", tap: (st, c) => { st.f = 1 - st.f; return ""; } }],
    show: (st) => st.f ? "+ on n-end: dark" : "+ on p-end: glows",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

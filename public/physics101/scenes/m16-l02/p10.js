// Ray builder: Tap to draw the next step (f = 10 cm, object at 30 cm).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 0, N: ["1. draw the axis, mirror, and object", "2. mark C at 20 cm and F at 10 cm", "3. ray 1: parallel in, reflects through F", "4. ray 2: through F, reflects parallel", "5. they cross at 15 cm: the image"] },
    sliders: [],
    cuts: [
    { id: "try", label: "Diagram: tap for the next step", tap: (st, c) => { st.s = (st.s + 1) % 5; return ""; } }],
    show: (st) => st.N[st.s],
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

// Viscosity race: Tap the ramp to race the next fluid.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "motor oil", "lava"], T: ["2 s", "20 s", "hours"] },
    sliders: [],
    cuts: [
    { id: "race", label: "Ramp: tap to race the next fluid", tap: (st, c) => { st.i = (st.i + 1) % 3; return "More internal friction, slower flow."; } }],
    show: (st) => `${st.N[st.i]} reaches the bottom in about ${st.T[st.i]}`,
  });
  ctx.art.touchable(["race"]);
  return { destroy() {} };
}

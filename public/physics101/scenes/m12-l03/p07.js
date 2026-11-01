// Sink or float: Tap to drop the next object in the water tank.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["steel", "empty can", "ice"], D: [7800, 300, 917] },
    sliders: [],
    cuts: [
    { id: "drop", label: "Sink or float: tap to drop the next object", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: average density ${st.D[st.i]} kg/m\u00b3 \u2192 ${st.D[st.i] > 1000 ? "sinks" : "floats"}`,
  });
  ctx.art.touchable(["drop"]);
  return { destroy() {} };
}

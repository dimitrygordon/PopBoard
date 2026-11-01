// Wavefront: Step the wavefront forward and tap to change its color.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["red", "green", "violet"] },
    sliders: [{ key: "s", label: "Frame", min: 0, max: 5, step: 1, value: 0, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Wavefront: tap to change color", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Every color reflects the same way."; } }],
    show: (st) => `${st.N[st.i]} wavefront, frame ${st.s}: ${st.s < 3 ? "approaching" : "reflected at an equal angle"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

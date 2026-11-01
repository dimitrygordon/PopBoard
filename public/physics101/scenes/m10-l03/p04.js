// Pick a path: Set the drop height and tap to switch paths. Without friction every path gives the same speed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["straight drop", "gentle ramp", "curvy slide"] },
    sliders: [{ key: "h", label: "Drop", min: 0.5, max: 10, step: 0.5, value: 3, unit: "m", d: 1 }],
    cuts: [
    { id: "ramp", label: "Ramp: tap to change the path", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Same height, same final speed."; } }],
    show: (st) => `${st.N[st.i]}: v = \u221a(2gh) = ${F(Math.sqrt(19.6 * st.h), 2)} m/s`,
  });
  ctx.art.touchable(["ramp"]);
  return { destroy() {} };
}

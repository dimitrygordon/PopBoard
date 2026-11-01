// Receiver: Rotate the receiving antenna.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle to E field", min: 0, max: 90, step: 5, value: 0, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Antenna: tap to explain", tap: (st, c) => { return "Parallel to E: biggest signal."; } }],
    show: (st) => `signal = ${F(Math.cos(st.a * Math.PI / 180) * 100, 0)}%`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

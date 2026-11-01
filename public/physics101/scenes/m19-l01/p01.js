// Two conductors: Slide time after a wire joins two conductors (\u0394V starts at 100 V).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 5, step: 0.5, value: 0, unit: "ms", d: 1 }],
    cuts: [
    { id: "try", label: "Wire: tap to explain", tap: (st, c) => { return "Charge flows until the potential difference is zero."; } }],
    show: (st) => `\u0394V = ${F(100 * Math.exp(-st.t), 1)} V` + (st.t >= 5 ? "\nflow has stopped" : ""),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

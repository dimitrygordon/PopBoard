// Efficiency: Set the efficiency for 1000 W in.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Efficiency", min: 80, max: 100, step: 1, value: 97, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Transformer: tap to explain", tap: (st, c) => { return "Real transformers: 95 to 98%."; } }],
    show: (st) => `out: ${st.e * 10} W, heat: ${1000 - st.e * 10} W`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

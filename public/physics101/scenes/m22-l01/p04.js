// Power: Multiply the temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "k", label: "T multiplied by", min: 1, max: 3, step: 1, value: 1, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Object: tap to explain", tap: (st, c) => { return "Power goes as T\u2074."; } }],
    show: (st) => `power \u00d7 ${st.k ** 4}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

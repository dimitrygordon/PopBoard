// Bend a bar: Bend a steel bar a little or a lot.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "b", label: "Bend", min: 0, max: 30, step: 1, value: 5, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "bend", label: "Spring back?: tap to release", tap: (st, c) => { return st.b <= 10 ? "It springs back: elastic." : "It stays bent: past its elastic limit."; } }],
    show: (st) => st.b <= 10 ? "small bend: elastic" : "large bend: permanent shape change",
  });
  ctx.art.touchable(["bend"]);
  return { destroy() {} };
}

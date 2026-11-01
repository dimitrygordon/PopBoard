// Stadium: Scale the atom.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Atom diameter", min: 10, max: 300, step: 10, value: 200, unit: "m", d: 0 }],
    cuts: [
    { id: "try", label: "Field: tap to explain", tap: (st, c) => { return "The nucleus is about 10\u207b\u2075 of the atom."; } }],
    show: (st) => `nucleus \u2248 ${F(st.d * 1e-5 * 1000, 1)} mm`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

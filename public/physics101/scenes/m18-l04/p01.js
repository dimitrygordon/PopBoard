// Pull apart: Drag the positive charge away from a negative one, then tap to switch the partner.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [{ key: "r", label: "Separation", min: 1, max: 10, step: 0.5, value: 2, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Charges: tap to switch partners", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `two positives: PE falls as they separate (${F(10 / st.r, 2)} units)` : `unlike charges: PE rises as they separate (${F(-10 / st.r, 2)} units)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

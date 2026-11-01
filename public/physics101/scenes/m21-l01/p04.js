// EMF: Slide a 0.50 m wire through a 0.20 T field.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "v", min: 0, max: 10, step: 0.5, value: 4, unit: "m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Voltmeter: tap to explain", tap: (st, c) => { return "Negative charges pile up at one end."; } }],
    show: (st) => `EMF = BLv = ${F(0.1 * st.v, 2)} V`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

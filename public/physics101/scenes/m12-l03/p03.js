// Area ratio: Change the area ratio and see the input force needed to lift a 14,000 N car.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "A\\u2082/A\\u2081", min: 5, max: 200, step: 5, value: 100, unit: "", d: 0 }],
    cuts: [
    { id: "ratio", label: "Output force: tap to explain", tap: (st, c) => { return "F\u2082 = F\u2081A\u2082/A\u2081, so bigger ratio, smaller push."; } }],
    show: (st) => `F\u2081 needed = 14,000 N / ${st.r} = ${F(14000 / st.r, 0)} N`,
  });
  ctx.art.touchable(["ratio"]);
  return { destroy() {} };
}

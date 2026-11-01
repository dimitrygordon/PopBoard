// Lightning: Build up the field between cloud and ground.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Field strength", min: 0, max: 4, step: 0.1, value: 1, unit: "MN/C", d: 1 }],
    cuts: [
    { id: "try", label: "Air: tap to explain", tap: (st, c) => { return "Strong fields strip electrons from air: it becomes a conducting plasma."; } }],
    show: (st) => st.e >= 3 ? "the air ionizes: lightning!" : `air still insulates (breaks down near 3 MN/C)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

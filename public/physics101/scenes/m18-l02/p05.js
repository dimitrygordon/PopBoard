// Cloud and ground: Build up negative charge in the cloud.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "Cloud charge", min: 0, max: 40, step: 1, value: 10, unit: "C", d: 0 }],
    cuts: [
    { id: "try", label: "Ground: tap to explain", tap: (st, c) => { return "Positive charge gathers on the ground below."; } }],
    show: (st) => st.q >= 30 ? "lightning strikes!" : `ground below: +${st.q} C gathers`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

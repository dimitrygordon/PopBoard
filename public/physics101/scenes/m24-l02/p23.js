// Temperature: Heat the gas.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "T", min: 1, max: 50, step: 1, value: 5, unit: "million K", d: 0 }],
    cuts: [
    { id: "try", label: "Gas: tap to explain", tap: (st, c) => { return "About 10 million K for fusion."; } }],
    show: (st) => st.t >= 10 ? "close enough to fuse" : "too cold",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

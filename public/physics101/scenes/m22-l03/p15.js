// Stairs: Try to place the electron.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Height", min: 1, max: 4, step: 0.1, value: 2.5, unit: "", d: 1 }],
    cuts: [
    { id: "try", label: "Stairs: tap to explain", tap: (st, c) => { return "Only on the steps."; } }],
    show: (st) => `stands on step n = ${Math.round(st.e)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

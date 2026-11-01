// Example Problem 1: defect -0.009106 u, BE -8.482 MeV.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Tritium mass", min: 3.0, max: 3.03, step: 0.000001, value: 3.016049, unit: "u", d: 6 }],
    cuts: [
    { id: "try", label: "Result: tap for the book's mass", tap: (st, c) => { st.m = 3.016049; c.m.set(3.016049); return "Defect \u22120.009106 u; binding energy \u22128.482 MeV."; } }],
    show: (st) => `defect = ${F(st.m - 3.025155, 6)} u\nBE = ${F((st.m - 3.025155) * 931.49, 3)} MeV`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

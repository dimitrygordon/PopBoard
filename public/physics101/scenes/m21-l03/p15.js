// Chromium: Drag the abundance of chromium-52 (the rest split as in nature).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Cr-52 abundance", min: 50, max: 100, step: 0.1, value: 83.8, unit: "%", d: 1 }],
    cuts: [
    { id: "try", label: "Average: tap to explain", tap: (st, c) => { return "Weighted average of the isotopes."; } }],
    show: (st) => (() => { const r = (100 - st.a) / 16.2; const m = (50 * 4.35 * r + 52 * st.a + 53 * 9.5 * r + 54 * 2.36 * r) / 100; return `average mass = ${F(m, 2)} u`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

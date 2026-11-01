// Scales: Slide a Celsius temperature and read it on all three scales.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "c", label: "Temperature", min: -273, max: 200, step: 1, value: 25, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "conv", label: "Scales: tap for a landmark", tap: (st, c) => { return "Water freezes at 0 \u00b0C = 273 K = 32 \u00b0F."; } }],
    show: (st) => `${st.c} \u00b0C = ${st.c + 273} K = ${F(st.c * 9 / 5 + 32, 0)} \u00b0F`,
  });
  ctx.art.touchable(["conv"]);
  return { destroy() {} };
}

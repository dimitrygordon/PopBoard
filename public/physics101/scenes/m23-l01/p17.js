// LDR: Change the light.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "l", label: "Light", min: 1, max: 1000, step: 10, value: 100, unit: "lux", d: 0 }],
    cuts: [
    { id: "try", label: "LDR: tap to explain", tap: (st, c) => { return "More light frees more carriers."; } }],
    show: (st) => `R \u2248 ${F(500 / Math.sqrt(st.l), 1)} k\u03a9`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

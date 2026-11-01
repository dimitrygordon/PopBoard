// de Broglie: Change mass and speed.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "m", label: "Mass", min: 1, max: 100, step: 1, value: 1, unit: "\\u00d7 9.11 \\u00d7 10\\u207b\\u00b3\\u00b9 kg", d: 0 }, { key: "v", label: "v", min: 1, max: 10, step: 0.5, value: 5, unit: "\\u00d7 10\\u2076 m/s", d: 1 }],
    cuts: [
    { id: "try", label: "Wave: tap to explain", tap: (st, c) => { return "\u03bb = h/mv."; } }],
    show: (st) => `\u03bb = ${E(6.626e-34 / (st.m * 9.11e-31 * st.v * 1e6), 2)} m`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

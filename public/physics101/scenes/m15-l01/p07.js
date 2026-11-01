// Lumens: Change the bulb's lumens and read the lux on a 1.0 m sphere.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Luminous flux", min: 100, max: 3000, step: 50, value: 1000, unit: "lm", d: 0 }],
    cuts: [
    { id: "lm", label: "Lux: tap to explain", tap: (st, c) => { return "E = P/4\u03c0r\u00b2."; } }],
    show: (st) => `E = ${F(st.p / (4 * Math.PI), 1)} lx at 1.0 m`,
  });
  ctx.art.touchable(["lm"]);
  return { destroy() {} };
}

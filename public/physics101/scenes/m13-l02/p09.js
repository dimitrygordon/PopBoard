// Example Problem 3: 192 Hz: 1.76 m, 0.00521 s; 442 Hz: 0.762 m, 0.00226 s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 100, max: 1000, step: 1, value: 192, unit: "Hz", d: 0 }],
    cuts: [
    { id: "f", label: "\\u03bb: tap for the book's 442 Hz", tap: (st, c) => { st.f = 442; c.f.set(442); return "\u03bb = 0.762 m, T = 0.00226 s."; } }],
    show: (st) => `\u03bb = v/f = ${F(337 / st.f, 3)} m\nT = 1/f = ${F(1 / st.f, 5)} s`,
  });
  ctx.art.touchable(["f"]);
  return { destroy() {} };
}

// Example Problem 3: 1.29 m: theta 45.9 deg, d = 7.41e-7 m.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Spot spacing x", min: 0.5, max: 2, step: 0.01, value: 1.29, unit: "m", d: 2 }],
    cuts: [
    { id: "try", label: "Wall: tap for the book's 1.29 m", tap: (st, c) => { st.x = 1.29; c.x.set(1.29); return "\u03b8 = 45.9\u00b0, d = 7.41 \u00d7 10\u207b\u2077 m."; } }],
    show: (st) => (() => { const t = Math.atan(st.x / 1.25); return `\u03b8 = ${F(t * 180 / Math.PI, 1)}\u00b0\nd = \u03bb/sin\u03b8 = ${E(532e-9 / Math.sin(t), 2)} m`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

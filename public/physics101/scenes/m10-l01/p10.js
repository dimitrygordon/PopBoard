// Example Problem 2: 25.0 deg: 6.93e3 J.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Rope angle", min: 0, max: 80, step: 1, value: 25, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "ex2", label: "Ex2: tap for the book's 25\\u00b0", tap: (st, c) => { st.a = 25; c.a.set(25); return "6.93 \u00d7 10\u00b3 J."; } }],
    show: (st) => `W = 255 \u00d7 30.0 \u00d7 cos ${st.a}\u00b0 = ${E(255 * 30 * Math.cos(st.a * Math.PI / 180))} J`,
  });
  ctx.art.touchable(["ex2"]);
  return { destroy() {} };
}

// Malus: Rotate the second filter relative to the first (50 units after filter 1).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Angle between filters", min: 0, max: 90, step: 1, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "mal", label: "cos\\u00b2 curve: tap to explain", tap: (st, c) => { return "I\u2082 = I\u2081cos\u00b2\u03b8."; } }],
    show: (st) => `I\u2082 = 50 cos\u00b2${st.a}\u00b0 = ${F(50 * Math.cos(st.a * Math.PI / 180) ** 2, 1)} units`,
  });
  ctx.art.touchable(["mal"]);
  return { destroy() {} };
}

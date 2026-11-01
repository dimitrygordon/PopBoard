// Ray model: Set the ray's angle and tap to switch targets.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [{ key: "a", label: "Angle from the normal", min: 0, max: 80, step: 1, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "aim", label: "Ray path: tap to switch targets", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `glass block: the ray bends toward the normal, to ${F(Math.asin(Math.sin(st.a * Math.PI / 180) / 1.5) * 180 / Math.PI, 0)}\u00b0` : `mirror: it bounces off at ${st.a}\u00b0`,
  });
  ctx.art.touchable(["aim"]);
  return { destroy() {} };
}

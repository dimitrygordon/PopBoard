// Vocal cord: Tighten or loosen the model vocal cord.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Tension", min: 1, max: 4, step: 0.5, value: 1, unit: "\\u00d7", d: 1 }],
    cuts: [
    { id: "vc", label: "Pitch: tap to explain", tap: (st, c) => { return "More tension, faster vibration, higher pitch."; } }],
    show: (st) => `pitch = ${F(200 * Math.sqrt(st.t), 0)} Hz (f grows as \u221atension)`,
  });
  ctx.art.touchable(["vc"]);
  return { destroy() {} };
}

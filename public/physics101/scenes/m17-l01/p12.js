// Soap film: Slide time as gravity thins the top of an upright film.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 60, step: 5, value: 0, unit: "s", d: 0 }],
    cuts: [
    { id: "try", label: "Film: tap to explain", tap: (st, c) => { return "Each thickness reinforces a different color."; } }],
    show: (st) => st.t >= 50 ? "the top is so thin it looks black" : `top thickness \u2248 ${F(500 - st.t * 9, 0)} nm; color bands slide down`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

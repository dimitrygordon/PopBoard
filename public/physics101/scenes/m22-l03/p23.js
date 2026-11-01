// Transitions: Pick the levels.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "From n", min: 2, max: 6, step: 1, value: 3, unit: "", d: 0 }, { key: "b", label: "To n", min: 1, max: 5, step: 1, value: 2, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Photon: tap to explain", tap: (st, c) => { return "Lyman: UV; Balmer: visible; Paschen: IR."; } }],
    show: (st) => (() => { if (st.b >= st.a) return "pick a lower final level"; const l = 1240 / (13.6 * (1 / st.b ** 2 - 1 / st.a ** 2)); return `\u03bb = ${F(l, 0)} nm: ${l < 400 ? "ultraviolet" : l <= 700 ? "visible" : "infrared"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

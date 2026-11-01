// Path difference: Move a point along the screen (\u03bb = 600 nm, d = 0.020 mm, L = 1.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Position on screen", min: 0, max: 90, step: 1, value: 30, unit: "mm", d: 0 }],
    cuts: [
    { id: "try", label: "Point: tap to explain", tap: (st, c) => { return "Bright where the path difference is a whole number of wavelengths."; } }],
    show: (st) => (() => { const p = st.x / 1000 * 2e-5 / 1 / 6e-7; const r = Math.abs(p - Math.round(p)); return `path difference = ${F(p, 2)} \u03bb\n${r < 0.05 ? "bright" : Math.abs(r - 0.5) < 0.05 ? "dark" : "in between"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

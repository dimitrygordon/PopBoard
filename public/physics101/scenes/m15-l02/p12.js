// \u03bb = c/f: Slide a frequency of light.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 4, max: 7.5, step: 0.1, value: 5.5, unit: "\\u00d7 10\\u00b9\\u2074 Hz", d: 1 }],
    cuts: [
    { id: "f", label: "Wavelength: tap to explain", tap: (st, c) => { return "Higher frequency, shorter wavelength."; } }],
    show: (st) => `\u03bb = c/f = ${F(3e8 / (st.f * 1e14) * 1e9, 0)} nm`,
  });
  ctx.art.touchable(["f"]);
  return { destroy() {} };
}

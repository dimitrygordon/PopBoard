// Telescope: Slide the eyepiece (f = 5 cm) behind the first image.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "First image to eyepiece", min: 2, max: 8, step: 0.5, value: 4.5, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Final image: tap to explain", tap: (st, c) => { return "Inside the eyepiece's f, it acts like a magnifier."; } }],
    show: (st) => st.d < 5 ? `virtual, enlarged: m = ${F(5 / (5 - st.d), 1)}` : "outside the eyepiece's f: no magnified view",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

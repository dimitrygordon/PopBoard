// Screen: Slide the screen in front of a mirror with f = 10 cm and an object at 30 cm.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Screen distance", min: 5, max: 40, step: 0.5, value: 20, unit: "cm", d: 1 }],
    cuts: [
    { id: "try", label: "Screen: tap to check", tap: (st, c) => { return Math.abs(st.s - 15) < 0.3 ? "Sharp, inverted image: it's real." : "Blurry."; } }],
    show: (st) => Math.abs(st.s - 15) < 0.3 ? "sharp image at 15 cm" : `blurry (sharp image is at 15 cm)`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

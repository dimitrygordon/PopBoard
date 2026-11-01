// Bubble: Drag the bubble's thickness.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Thickness", min: 0, max: 600, step: 10, value: 300, unit: "nm", d: 0 }],
    cuts: [
    { id: "try", label: "Bubble: tap to explain", tap: (st, c) => { return "Bright at \u00bc, \u00be, 5/4 of a wavelength in the film, so colors repeat."; } }],
    show: (st) => st.d < 30 ? "black: too thin to reinforce any color" : `reinforced: ${[1, 3, 5].map((k) => 4 * 1.33 * st.d / k).filter((l) => l >= 400 && l <= 700).map((l) => F(l, 0) + " nm").join(", ") || "none visible"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

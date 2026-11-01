// Balloon: Warm or chill the balloon. At constant pressure its volume grows in proportion to kelvin temperature.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Air temperature", min: -40, max: 80, step: 1, value: 20, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "bal", label: "Balloon: tap to check its size", tap: (st, c) => { return st.t > 20 ? "Faster particles push the walls out." : st.t < 20 ? "Slower particles let it shrink." : "Room temperature size."; } }],
    show: (st) => `T = ${st.t + 273} K\nvolume = ${F((st.t + 273) / 293 * 2.0, 2)} L (2.00 L at 20 \u00b0C)`,
  });
  ctx.art.touchable(["bal"]);
  return { destroy() {} };
}

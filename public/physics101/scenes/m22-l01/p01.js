// Filament: Turn the dimmer.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Filament temperature", min: 800, max: 3000, step: 100, value: 1200, unit: "K", d: 0 }],
    cuts: [
    { id: "try", label: "Bulb: tap to explain", tap: (st, c) => { return "Hotter glows whiter."; } }],
    show: (st) => st.t < 1300 ? "dull red" : st.t < 2000 ? "orange" : st.t < 2600 ? "yellow" : "white",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

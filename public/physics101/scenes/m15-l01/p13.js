// Starlight: Set a star's distance and watch its brightness fall.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Distance", min: 1, max: 20, step: 1, value: 4, unit: "light-years", d: 0 }],
    cuts: [
    { id: "star", label: "Brightness: tap to explain", tap: (st, c) => { return "The light you see left the star years ago."; } }],
    show: (st) => `light left ${st.d} years ago\nbrightness = ${F(1 / (st.d * st.d), 4)} \u00d7 (at 1 light-year)`,
  });
  ctx.art.touchable(["star"]);
  return { destroy() {} };
}

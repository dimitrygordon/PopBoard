// Race: Tap to race a sound pulse 1.0 km through the next material.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["air", "water", "iron"], V: [343, 1493, 5130] },
    sliders: [],
    cuts: [
    { id: "race", label: "Air, water, iron: tap for the next material", tap: (st, c) => { st.i = (st.i + 1) % 3; return ""; } }],
    show: (st) => `${st.N[st.i]}: ${st.V[st.i]} m/s, 1.0 km in ${F(1000 / st.V[st.i], 2)} s`,
  });
  ctx.art.touchable(["race"]);
  return { destroy() {} };
}

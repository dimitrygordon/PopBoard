// Lift an apple: Tap to lift the 0.10 kg apple 1 m at a time. Each meter costs about one joule.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { h: 0 },
    sliders: [],
    cuts: [
    { id: "apple", label: "Apple: tap to lift 1 m", tap: (st, c) => { st.h = st.h >= 5 ? 0 : st.h + 1; return ""; } }],
    show: (st) => `lifted ${st.h} m: W = mgh = ${F(0.1 * 9.8 * st.h, 2)} J`,
  });
  ctx.art.touchable(["apple"]);
  return { destroy() {} };
}

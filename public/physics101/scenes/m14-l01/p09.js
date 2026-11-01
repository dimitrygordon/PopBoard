// Siren: Tap to drive the 1000 Hz siren past at 30 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [],
    cuts: [
    { id: "siren", label: "Two listeners: tap to switch listeners", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => st.i ? `behind: hears ${F(1000 / (1 + 30 / 343), 0)} Hz (lower)` : `ahead: hears ${F(1000 / (1 - 30 / 343), 0)} Hz (higher)`,
  });
  ctx.art.touchable(["siren"]);
  return { destroy() {} };
}

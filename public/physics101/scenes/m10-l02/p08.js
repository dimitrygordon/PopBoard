// 1.0 kg book moved from 0.5 m to 1.5 m above the floor.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Reference level", min: 0, max: 1.5, step: 0.25, value: 0, unit: "m", d: 2 }],
    cuts: [
    { id: "ref", label: "Ref: tap to put the reference at the floor", tap: (st, c) => { st.r = 0; c.r.set(0); return ""; } }],
    show: (st) => `GPE at 0.5 m: ${F(9.8 * (0.5 - st.r), 1)} J, at 1.5 m: ${F(9.8 * (1.5 - st.r), 1)} J\nchange = 9.8 J (always)`,
  });
  ctx.art.touchable(["ref"]);
  return { destroy() {} };
}

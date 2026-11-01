// tau = F r sin theta; door 0.80 m wide (sandbox).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Distance from hinge", min: 0.1, max: 0.8, step: 0.05, value: 0.8, unit: "m", d: 2 }, { key: "a", label: "Angle to the door", min: 0, max: 90, step: 5, value: 90, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "door", label: "Door: tap to push", tap: (st, c) => { const t = 20 * st.r * Math.sin(st.a * Math.PI / 180); return t < 0.5 ? "The door barely moves." : t > 12 ? "The door swings open easily." : "The door swings slowly."; } }],
    show: (st) => `\u03c4 = F r sin\u03b8 = 20 \u00d7 ${F(st.r, 2)} \u00d7 sin ${st.a}\u00b0 = ${F(20 * st.r * Math.sin(st.a * Math.PI / 180), 1)} N\u00b7m`,
  });
  ctx.art.touchable(["door"]);
  return { destroy() {} };
}

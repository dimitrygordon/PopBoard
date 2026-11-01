// Example Problem 1: 24.6 m/s gives 563 Hz.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Car speed", min: 0, max: 40, step: 0.1, value: 24.6, unit: "m/s", d: 1 }],
    cuts: [
    { id: "car", label: "Pitch: tap for the book's speed", tap: (st, c) => { st.v = 24.6; c.v.set(24.6); return "f_d = 563 Hz."; } }],
    show: (st) => `f_d = 523 / (1 \u2212 ${F(st.v, 1)}/343) = ${F(523 / (1 - st.v / 343), 0)} Hz`,
  });
  ctx.art.touchable(["car"]);
  return { destroy() {} };
}

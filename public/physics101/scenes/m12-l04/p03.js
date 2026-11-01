// Freezing point: Raise the pressure and compare a typical liquid with water.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "p", label: "Pressure", min: 1, max: 200, step: 1, value: 1, unit: "atm", d: 0 }],
    cuts: [
    { id: "press", label: "Freezing point: tap to explain", tap: (st, c) => { return "Water expands when it freezes, so squeezing it favors the liquid."; } }],
    show: (st) => `typical liquid: freezing point rises\nwater: freezing point = ${F(-0.0074 * (st.p - 1), 2)} \u00b0C`,
  });
  ctx.art.touchable(["press"]);
  return { destroy() {} };
}

// Thermostat: Heat and cool the brass and iron strip.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Room temperature", min: 10, max: 30, step: 1, value: 18, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "strip", label: "Heater: tap to explain", tap: (st, c) => { return "Brass expands more, so the strip bends toward the iron."; } }],
    show: (st) => st.t < 20 ? "strip bends to close the circuit: heater on" : "strip bends away: heater off",
  });
  ctx.art.touchable(["strip"]);
  return { destroy() {} };
}

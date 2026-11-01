// Guitar string: Tighten the 0.65 m string.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "v", label: "Wave speed on the string", min: 100, max: 600, step: 10, value: 286, unit: "m/s", d: 0 }],
    cuts: [
    { id: "tune", label: "Pitch: tap to explain", tap: (st, c) => { return "Tighter string, faster waves, higher pitch."; } }],
    show: (st) => `fundamental = v/2L = ${F(st.v / 1.3, 0)} Hz`,
  });
  ctx.art.touchable(["tune"]);
  return { destroy() {} };
}

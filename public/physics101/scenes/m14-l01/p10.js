// Doppler equation: Set the source and detector velocities (positive from source toward detector) for a 500 Hz source.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "v_s", min: -50, max: 50, step: 1, value: 20, unit: "m/s", d: 0 }, { key: "d", label: "v_d", min: -50, max: 50, step: 1, value: 0, unit: "m/s", d: 0 }],
    cuts: [
    { id: "arr", label: "f detected: tap to explain", tap: (st, c) => { return "Moving toward each other raises the frequency."; } }],
    show: (st) => `f_d = f_s(v \u2212 v_d)/(v \u2212 v_s) = ${F(500 * (343 - st.d) / (343 - st.s), 0)} Hz`,
  });
  ctx.art.touchable(["arr"]);
  return { destroy() {} };
}

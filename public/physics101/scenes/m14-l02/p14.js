// Beats: Tune one tone toward a 440 Hz tone.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Second tone", min: 430, max: 450, step: 0.5, value: 444, unit: "Hz", d: 1 }],
    cuts: [
    { id: "tune", label: "Beats: tap to explain", tap: (st, c) => { return "Beat frequency = |f_A \u2212 f_B|."; } }],
    show: (st) => `beats: ${F(Math.abs(st.f - 440), 1)} per second`,
  });
  ctx.art.touchable(["tune"]);
  return { destroy() {} };
}

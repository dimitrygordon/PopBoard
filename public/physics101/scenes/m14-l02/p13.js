// Intervals: Slide the ratio of two tones starting from 262 Hz.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Ratio", min: 1, max: 2, step: 0.01, value: 1.5, unit: "", d: 2 }],
    cuts: [
    { id: "two", label: "Ratio: tap to explain", tap: (st, c) => { return Math.abs(st.r - 2) < 0.01 ? "1 to 2: an octave." : Math.abs(st.r - 1.5) < 0.01 ? "2 to 3: a fifth, consonant." : Math.abs(st.r - 1.25) < 0.01 ? "4 to 5: a major third, consonant." : "Not a simple ratio: it can sound dissonant."; } }],
    show: (st) => `262 Hz and ${F(262 * st.r, 0)} Hz`,
  });
  ctx.art.touchable(["two"]);
  return { destroy() {} };
}

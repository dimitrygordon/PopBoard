// Speaker: Change the frequency of the current in the coil.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "f", label: "Frequency", min: 50, max: 5000, step: 50, value: 440, unit: "Hz", d: 0 }],
    cuts: [
    { id: "try", label: "Cone: tap to explain", tap: (st, c) => { return "The cone vibrates at the current's frequency."; } }],
    show: (st) => `cone vibrates ${st.f} times per second`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

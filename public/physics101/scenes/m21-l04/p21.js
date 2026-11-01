// Digital: Turn up the channel noise.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "n", label: "Noise", min: 0, max: 50, step: 5, value: 20, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Signal: tap to explain", tap: (st, c) => { return "Pulses are either on or off, so small noise can't change them."; } }],
    show: (st) => `analog: ${100 - st.n}% clean\ndigital: ${st.n < 40 ? "100% correct" : "errors begin"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

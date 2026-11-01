// Moon: Set the round-trip time.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Round trip", min: 2.4, max: 2.8, step: 0.01, value: 2.56, unit: "s", d: 2 }],
    cuts: [
    { id: "try", label: "Pulse: tap to explain", tap: (st, c) => { return "d = ct/2."; } }],
    show: (st) => `d = ${E(3e8 * st.t / 2, 3)} m`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

// Trigger: Set the trigger threshold.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "e", label: "Energy threshold", min: 0, max: 100, step: 5, value: 50, unit: "GeV", d: 0 }],
    cuts: [
    { id: "try", label: "Events: tap to explain", tap: (st, c) => { return "Keep only the rare ones."; } }],
    show: (st) => `events kept: about 1 in ${F(10 ** (st.e / 20), 0)}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

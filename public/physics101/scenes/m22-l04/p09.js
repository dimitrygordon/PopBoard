// Conditions: Tap to toggle the next condition.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { m: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Laser: tap to toggle", tap: (st, c) => { st.m = (st.m + 1) % 8; return ""; } }],
    show: (st) => `pumped ${st.m & 1 ? "on" : "off"}, metastable ${st.m & 2 ? "on" : "off"}, mirrors ${st.m & 4 ? "on" : "off"}\n${st.m === 7 ? "avalanche grows" : "fizzles"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

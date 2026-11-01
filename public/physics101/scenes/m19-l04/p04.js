// House: Tap to flip the next switch.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: [0, 0, 0], i: 0 },
    sliders: [],
    cuts: [
    { id: "try", label: "Switches: tap to flip the next one", tap: (st, c) => { st.s[st.i] = 1 - st.s[st.i]; st.i = (st.i + 1) % 3; return "Parallel: each branch is independent."; } }],
    show: (st) => `lamp ${st.s[0] ? "on" : "off"}, TV ${st.s[1] ? "on" : "off"}, fan ${st.s[2] ? "on" : "off"}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

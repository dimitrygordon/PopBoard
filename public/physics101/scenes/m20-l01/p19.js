// Strongest: Adjust current, loops, and the core.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { c: 0 },
    sliders: [{ key: "i", label: "I", min: 0.5, max: 5, step: 0.5, value: 1, unit: "A", d: 1 }, { key: "n", label: "Turns per meter", min: 100, max: 2000, step: 100, value: 500, unit: "", d: 0 }],
    cuts: [
    { id: "try", label: "Core: tap to add or remove iron", tap: (st, c) => { st.c = 1 - st.c; return ""; } }],
    show: (st) => `B = ${E(4 * Math.PI * 1e-7 * st.n * st.i * (st.c ? 200 : 1), 2)} T${st.c ? " (iron core)" : ""}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

// Heating curve: Add heat to 1.0 kg of ice starting at \u221220 \u00b0C and move along the curve from A to E.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "q", label: "Heat added", min: 0, max: 3100, step: 10, value: 0, unit: "kJ", d: 0 }],
    cuts: [
    { id: "heat", label: "Curve: tap for the stage", tap: (st, c) => { const q = st.q; return q < 42 ? "A to B: warming the ice." : q < 376 ? "B to C: melting at 0 \u00b0C." : q < 794 ? "C to D: warming the water." : q < 3054 ? "D to E: boiling at 100 \u00b0C." : "Past E: warming steam."; } }],
    show: (st) => (() => { const q = st.q; let T; if (q < 42) T = -20 + q / 2.1; else if (q < 376) T = 0; else if (q < 794) T = (q - 376) / 4.18; else if (q < 3054) T = 100; else T = 100 + (q - 3054) / 2.02; return `T = ${F(T, 0)} \u00b0C\n(ice C 2060, H_f 334 kJ/kg, water 4180, H_v 2260 kJ/kg)`; })(),
  });
  ctx.art.touchable(["heat"]);
  return { destroy() {} };
}

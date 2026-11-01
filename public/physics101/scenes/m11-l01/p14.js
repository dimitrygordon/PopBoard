// Calorimeter: Drop a hot 0.10 kg iron sample into 0.50 kg of water at 20 \u00b0C.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "s", label: "Sample temperature", min: 20, max: 200, step: 1, value: 100, unit: "\\u00b0C", d: 0 }],
    cuts: [
    { id: "cal", label: "Final temperature: tap to explain", tap: (st, c) => { return "Energy lost by the sample equals energy gained by the water."; } }],
    show: (st) => `T_f = (m_A C_A T_A + m_B C_B T_B) / (m_A C_A + m_B C_B)\n= ${F((0.1 * 450 * st.s + 0.5 * 4180 * 20) / (0.1 * 450 + 0.5 * 4180), 1)} \u00b0C`,
  });
  ctx.art.touchable(["cal"]);
  return { destroy() {} };
}

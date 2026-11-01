// Q = mH: Use the button to evaporate more sweat. Each gram carries away 2.26 kJ.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { g: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `Q = mH_v = ${F(st.g / 1000, 3)} kg \u00d7 2.26 \u00d7 10\u2076 J/kg = ${F(st.g * 2.26, 1)} kJ`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Evaporate 10 g", () => { const line = ((st, c) => { st.g = st.g >= 100 ? 0 : st.g + 10; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

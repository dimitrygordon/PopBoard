// Ideal MA: Use the buttons to change the effort and resistance distances.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { de: 2, dr: 0.5 },
    sliders: [],
    cuts: [],
    show: (st) => `IMA = d_e / d_r = ${st.de} / ${F(st.dr, 1)} = ${F(st.de / st.dr, 1)}`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Longer effort distance", () => { const line = ((st, c) => { st.de = st.de >= 8 ? 1 : st.de + 1; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Longer resistance distance", () => { const line = ((st, c) => { st.dr = st.dr >= 2 ? 0.5 : st.dr + 0.5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

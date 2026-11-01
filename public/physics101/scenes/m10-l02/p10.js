// Spring energy: Use the buttons to change the spring constant and the stretch.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { k: 200, x: 0.1 },
    sliders: [],
    cuts: [],
    show: (st) => `EPE = \u00bdkx\u00b2 = \u00bd \u00d7 ${st.k} \u00d7 ${F(st.x, 1)}\u00b2 = ${F(0.5 * st.k * st.x ** 2, 1)} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Stiffer spring", () => { const line = ((st, c) => { st.k = st.k >= 800 ? 200 : st.k * 2; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Stretch more", () => { const line = ((st, c) => { st.x = st.x >= 0.3 ? 0.1 : st.x + 0.1; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

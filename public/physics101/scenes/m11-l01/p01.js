// Gas particles: Use the button to add particles at the same speed. Thermal energy grows with the number of particles.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { n: 10 },
    sliders: [],
    cuts: [],
    show: (st) => `${st.n} particles, each 1.0 \u00d7 10\u207b\u00b2\u2070 J (model)\nthermal energy = ${st.n}.0 \u00d7 10\u207b\u00b2\u2070 J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Add 10 particles", () => { const line = ((st, c) => { st.n = st.n >= 50 ? 10 : st.n + 10; return "Same average speed, more total energy."; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

// Other forms: Use the button to step through thermal, electrical and radiant energy.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["thermal: random motion of particles (a warm stove)", "electrical: moving charges (a current in a wire)", "radiant: light carrying energy (sunlight on a solar panel)"] },
    sliders: [],
    cuts: [],
    show: (st) => st.N[st.i],
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next form of energy", () => { const line = ((st, c) => { st.i = (st.i + 1) % 3; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

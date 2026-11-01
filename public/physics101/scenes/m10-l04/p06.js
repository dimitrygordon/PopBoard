// Six simple machines: Use the button to step through the six simple machines.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["lever", "pulley", "wheel and axle", "inclined plane", "wedge", "screw"], I: ["effort arm / resistance arm", "number of supporting strands", "r_e / r_r", "length / height", "length / thickness", "circumference / thread spacing"] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.N[st.i]}: IMA = ${st.I[st.i]}`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next machine", () => { const line = ((st, c) => { st.i = (st.i + 1) % 6; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

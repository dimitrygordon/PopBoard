// Wheel and axle: Use the buttons to change the wheel and axle radii.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { w: 30, a: 3 },
    sliders: [],
    cuts: [],
    show: (st) => `turning the wheel to move the axle: IMA = ${st.w} cm / ${st.a} cm = ${F(st.w / st.a, 1)}`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Bigger wheel", () => { const line = ((st, c) => { st.w = st.w >= 60 ? 15 : st.w + 15; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  ctx.ui.button("Bigger axle", () => { const line = ((st, c) => { st.a = st.a >= 9 ? 3 : st.a + 3; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

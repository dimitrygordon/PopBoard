// Juggler: Use the button to move the 0.20 kg ball up and down. Gravity does negative work going up and positive work coming down.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { h: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `height ${F(st.h, 1)} m: work by gravity from the hand = \u2212${F(0.2 * 9.8 * st.h, 2)} J\nGPE = +${F(0.2 * 9.8 * st.h, 2)} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Move the ball", () => { const line = ((st, c) => { st.h = st.h >= 1.5 ? 0 : st.h + 0.5; return ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

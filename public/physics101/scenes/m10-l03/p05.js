// Where the energy goes: Use the button to add friction to a 2.0 kg block sliding down a 1.0 m drop.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { f: 0 },
    sliders: [],
    cuts: [],
    show: (st) => `GPE lost 19.6 J: KE ${F(19.6 - st.f, 1)} J + thermal ${st.f} J`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("More friction", () => { const line = ((st, c) => { st.f = st.f >= 15 ? 0 : st.f + 5; return st.f ? "The missing mechanical energy became thermal energy." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

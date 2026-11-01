// Water density: Use the button to step the temperature of water near freezing.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, T: [0, 2, 4, 6, 8], D: [999.84, 999.94, 999.97, 999.94, 999.85] },
    sliders: [],
    cuts: [],
    show: (st) => `${st.T[st.i]} \u00b0C liquid: ${st.D[st.i]} kg/m\u00b3\nice: 917 kg/m\u00b3 (floats)`,
    box: [300, 600, 1300, 720],
  });
  ctx.ui.button("Next temperature", () => { const line = ((st, c) => { st.i = (st.i + 1) % 5; return st.i === 2 ? "Densest at 4 \u00b0C." : ""; })(k.st, k.ctl); k.draw(); if (line) ctx.say(line, true); });
  return { destroy() {} };
}

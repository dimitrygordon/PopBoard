// Sources: Tap to choose the next sound source.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["lips buzzing (brass)", "a vibrating reed (clarinet)", "air across an opening (flute)"] },
    sliders: [],
    cuts: [
    { id: "src", label: "Vibration: tap for the next source", tap: (st, c) => { st.i = (st.i + 1) % 3; return "Every one starts with a vibration."; } }],
    show: (st) => st.N[st.i],
  });
  ctx.art.touchable(["src"]);
  return { destroy() {} };
}

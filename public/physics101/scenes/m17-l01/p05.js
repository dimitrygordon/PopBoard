// Colors: Tap to switch the light (d = 0.020 mm, L = 1.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["red", "green", "blue", "white"], L: [650, 530, 470, 0] },
    sliders: [],
    cuts: [
    { id: "try", label: "Source: tap for the next color", tap: (st, c) => { st.i = (st.i + 1) % 4; return ""; } }],
    show: (st) => st.L[st.i] ? `${st.N[st.i]} (${st.L[st.i]} nm): fringe spacing ${F(st.L[st.i] * 1e-9 / 2e-5 * 1000, 1)} mm` : "white: a white center with rainbow-edged fringes",
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

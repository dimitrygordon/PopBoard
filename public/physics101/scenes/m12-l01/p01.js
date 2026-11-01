// Melting ice: Tap to melt a 1.0 L block of ice into a different container. The water takes its shape; the volume stays put.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["a tall glass", "a wide bowl", "a bottle"] },
    sliders: [],
    cuts: [
    { id: "melt", label: "Containers: tap for the next one", tap: (st, c) => { st.i = (st.i + 1) % 3; return "A fluid has no definite shape of its own."; } }],
    show: (st) => `poured into ${st.N[st.i]}: shape changes, volume about 0.92 L of water`,
  });
  ctx.art.touchable(["melt"]);
  return { destroy() {} };
}

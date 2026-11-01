// Surface pull: Tap to compare a surface particle and an interior one.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { s: 1 },
    sliders: [],
    cuts: [
    { id: "pull", label: "Net pull: tap to switch particles", tap: (st, c) => { st.s = 1 - st.s; return st.s ? "Surface: neighbors pull sideways and down, so it is pulled inward." : "Interior: pulled equally in all directions, net zero."; } }],
    show: (st) => st.s ? "surface particle: net pull inward" : "interior particle: net pull zero",
  });
  ctx.art.touchable(["pull"]);
  return { destroy() {} };
}

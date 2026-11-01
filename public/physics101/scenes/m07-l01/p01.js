// Earth-centered vs Sun-centered view. Inner planets: Mercury never more than 28 degrees from the Sun in our sky, Venus never more than 47 degrees.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { v: 0 },
    sliders: [],
    cuts: [
    { id: "view", label: "View: tap to switch models", tap: (st, c) => { st.v = 1 - st.v; return st.v ? "Sun-centered: Mercury and Venus orbit inside Earth's orbit, so they always look close to the Sun." : "Earth-centered: nothing explains why Mercury and Venus never stray far from the Sun."; } }],
    show: (st) => (st.v ? "Sun-centered model" : "Earth-centered model") + "\nMercury stays within 28\u00b0 of the Sun, Venus within 47\u00b0",
  });
  ctx.art.touchable(["view"]);
  return { destroy() {} };
}

// LIGO arm 4 km; strain about 1e-21 gives 4e-18 m, far smaller than a proton.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Wave strain", min: 0, max: 5, step: 0.5, value: 1, unit: "\\u00d7 10\\u207b\\u00b2\\u00b9", d: 1 }],
    cuts: [
    { id: "ligo", label: "Ligo: tap to send a wave", tap: (st, c) => { return st.h ? "The arms change length by less than a proton's width, and the light no longer cancels." : "No wave: the beams still cancel."; } }],
    show: (st) => `arm change = ${E(st.h * 1e-21 * 4000)} m on a 4 km arm`,
  });
  ctx.art.touchable(["ligo"]);
  return { destroy() {} };
}

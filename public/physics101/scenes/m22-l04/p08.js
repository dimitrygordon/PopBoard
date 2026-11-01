// Stimulated: Slide time.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "t", label: "Time", min: 0, max: 5, step: 1, value: 0, unit: "steps", d: 0 }],
    cuts: [
    { id: "try", label: "Crowd: tap to explain", tap: (st, c) => { return "Each photon triggers a matching one."; } }],
    show: (st) => `${2 ** st.t} matching, in-step photons`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

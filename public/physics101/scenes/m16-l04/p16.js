// Camera: Change the shutter time, then tap to switch scenes.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0 },
    sliders: [{ key: "t", label: "Shutter time", min: 1, max: 1000, step: 1, value: 125, unit: "ms", d: 0 }],
    cuts: [
    { id: "try", label: "Scene: tap to switch", tap: (st, c) => { st.i = 1 - st.i; return ""; } }],
    show: (st) => (() => { const L = st.t * (st.i ? 0.1 : 8); return `${st.i ? "dim" : "bright"} scene: ${L < 500 ? "too dark" : L > 2000 ? "too bright" : "well exposed"}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

// Virtual image: Move the object in front of the plane mirror.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Object distance", min: 5, max: 50, step: 1, value: 20, unit: "cm", d: 0 }],
    cuts: [
    { id: "try", label: "Sight lines: tap to explain", tap: (st, c) => { return "The dashed lines meet behind the mirror, where no light actually goes."; } }],
    show: (st) => `virtual image ${st.x} cm behind the mirror`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

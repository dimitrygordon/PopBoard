// Bar code: Sweep the laser.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "x", label: "Position", min: 0, max: 100, step: 5, value: 0, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Scanner: tap to explain", tap: (st, c) => { return "Dark bars absorb, white spaces reflect."; } }],
    show: (st) => `read: ${"0123456789".slice(0, Math.floor(st.x / 10))}`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

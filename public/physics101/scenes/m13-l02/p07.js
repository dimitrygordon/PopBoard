// Phase: Slide the second tagged point away from the first (\u03bb = 2.0 m).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "d", label: "Separation", min: 0, max: 4, step: 0.1, value: 1, unit: "m", d: 1 }],
    cuts: [
    { id: "tag", label: "Phase: tap to explain", tap: (st, c) => { return "Points one whole wavelength apart are in phase."; } }],
    show: (st) => (() => { const r = (st.d / 2) % 1; return Math.abs(r) < 0.03 || Math.abs(r - 1) < 0.03 ? "in phase" : Math.abs(r - 0.5) < 0.03 ? "exactly out of phase" : `${F(r * 360, 0)}\u00b0 apart in phase`; })(),
  });
  ctx.art.touchable(["tag"]);
  return { destroy() {} };
}

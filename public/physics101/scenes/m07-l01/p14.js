// Cavendish-style: m = 0.73 kg small, M = 158 kg large (classic apparatus values used as sandbox values). F = G m M / r^2; spot shift is proportional to F.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "r", label: "Center gap", min: 0.05, max: 0.3, step: 0.01, value: 0.2, unit: "m", d: 2 }],
    cuts: [
    { id: "cav", label: "Balance: tap to swing the spheres to the other side", tap: (st, c) => { return "Swinging the big spheres to the other side twists the rod the other way."; } }],
    show: (st) => (() => { const f = 6.67e-11 * 0.73 * 158 / st.r ** 2; return `F = ${E(f)} N on each small sphere\nlight spot moves ${F(f / 5.1e-7 * 2, 1)} cm (sandbox scale)`; })(),
  });
  ctx.art.touchable(["cav"]);
  return { destroy() {} };
}

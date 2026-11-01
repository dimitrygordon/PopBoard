// Equal masses, elastic glancing collision: the two balls leave 90 deg apart. Cue ball 0.17 kg at 2.0 m/s.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "a", label: "Cue ball deflects", min: 10, max: 80, step: 5, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "pool", label: "Pool: tap to check the vector sum", tap: (st, c) => { return "Add the two arrows tip to tail: you get the original momentum back."; } }],
    show: (st) => (() => { const r = st.a * Math.PI / 180, p = 0.34; return `cue: ${F(p * Math.cos(r), 2)}, target: ${F(p * Math.sin(r), 2)} kg\u00b7m/s (90\u00b0 apart)\nsum = 0.34 kg\u00b7m/s along the shot`; })(),
  });
  ctx.art.touchable(["pool"]);
  return { destroy() {} };
}

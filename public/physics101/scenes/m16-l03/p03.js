// Snell: Drag the incident angle and tap to change the second medium (from air).
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { i: 0, N: ["water", "ethanol", "crown glass", "quartz", "diamond"], n: [1.33, 1.36, 1.52, 1.54, 2.42] },
    sliders: [{ key: "a", label: "\\u03b8\\u2081", min: 0, max: 85, step: 1, value: 30, unit: "\\u00b0", d: 0 }],
    cuts: [
    { id: "try", label: "Medium: tap to switch", tap: (st, c) => { st.i = (st.i + 1) % 5; return ""; } }],
    show: (st) => (() => { const s1 = Math.sin(st.a * Math.PI / 180), t2 = Math.asin(s1 / st.n[st.i]); return `n\u2081sin\u03b8\u2081 = ${F(s1, 3)}\nn\u2082sin\u03b8\u2082 = ${st.n[st.i]} \u00d7 sin ${F(t2 * 180 / Math.PI, 1)}\u00b0 = ${F(s1, 3)}`; })(),
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

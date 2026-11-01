// Hat and hair: Set the humidity, then tap to rub the hat on your hair.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: {},
    sliders: [{ key: "h", label: "Humidity", min: 10, max: 90, step: 5, value: 30, unit: "%", d: 0 }],
    cuts: [
    { id: "try", label: "Hair: tap to rub", tap: (st, c) => { return st.h < 50 ? "Dry air: the hair stays up a long time." : "Humid air: the charge leaks away fast."; } }],
    show: (st) => `hair stays up about ${F(600 / st.h, 0)} s`,
  });
  ctx.art.touchable(["try"]);
  return { destroy() {} };
}

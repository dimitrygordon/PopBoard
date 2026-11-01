// Leap: Tap to raise or lower the leaper's arms and legs. Compare the paths of the CM and the head.
import { calc, f2 } from "../kit.js";
const F = f2, E = (x, d = 2) => x.toExponential(d).replace(/e\+?(-?)(\d+)/, (_, s, p) => " \u00d7 10^" + (s ? "\u2212" : "") + p).replace("-", "\u2212"), R = (a) => a[Math.floor(Math.random() * a.length)];
export default function build(ctx) {
  const k = calc(ctx, {
    st: { up: false },
    sliders: [],
    cuts: [
    { id: "leap", label: "Leap: tap to change the pose", tap: (st, c) => { st.up = !st.up; return st.up ? "Arms and legs up: the CM moves up inside the body, so the head rises less." : ""; } }],
    show: (st) => st.up ? "limbs raised at the top: CM still follows a parabola\nhead path is flattened (the leaper seems to float)" : "body straight: the head follows the same parabola as the CM",
  });
  ctx.art.touchable(["leap"]);
  return { destroy() {} };
}

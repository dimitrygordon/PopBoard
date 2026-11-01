// Earth's acceleration: ball mass 0.18 kg (example), 1.0 kg, 7.0 kg. F = mg each way; a_Earth = F / 6.0e24 kg.
import { caption, tapCut, f2 } from "../kit.js";
const MS = [0.18, 1, 7];
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [880, 770, 1580, 880], 22);
  let i = 0;
  const show = (talk) => { const m = MS[i], F = m * 9.8, a = F / 6.0e24, e = Math.floor(Math.log10(a)); cap.textContent = `m = ${f2(m, 2)} kg: F = ${f2(F, 1)} N\na_Earth = ${f2(F, 1)} N / 6.0\u00d710^24 kg = ${f2(a / 10 ** e, 1)}\u00d710^\u2212${-e} m/s\u00b2`; if (talk) say(`A ${f2(m, 2)} kilogram ball pulls Earth with ${f2(F, 1)} newtons, far too little to notice.`, true); };
  tapCut(ctx, "mass", "Ball mass: tap to change", () => { i = (i + 1) % 3; show(true); });
  ctx.art.touchable(["mass"]); show(false);
  return { destroy() {} };
}

// Hang a mass: masses 1.0, 2.0, 3.0 kg hanging at rest, so tension = mg (rope taken as massless).
import { caption, tapCut, f2 } from "../kit.js";
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [940, 760, 1580, 860], 24, "Tap a mass to hang it.");
  ["m0", "m1", "m2"].forEach((id, i) => tapCut(ctx, id, `Hang mass ${i + 1}`, () => { const m = i + 1, T = m * 9.8; cap.textContent = `${m}.0 kg at rest: F_T = mg = ${f2(T, 1)} N`; say(`At rest, the rope's tension equals the weight: ${f2(T, 1)} newtons.`, true); }));
  ctx.art.touchable(["m0", "m1", "m2"]);
  return { destroy() {} };
}

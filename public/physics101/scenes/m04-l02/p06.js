// Cut the cable: with the cable cut, the elevator and rider fall at g together and the scale reads 0.
import { caption, tapCut } from "../kit.js";
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [1080, 690, 1580, 780], 24, "cable holding: scale reads 588 N");
  let cut = false;
  tapCut(ctx, "cable", "Cut the cable", () => { cut = !cut; cap.textContent = cut ? "cable cut: a = \u22129.8 m/s\u00b2\nscale reads 0 N" : "cable holding: scale reads 588 N"; if (cut) say("You and the scale fall together, so the scale no longer pushes on you. It reads zero: weightlessness.", true); });
  ctx.art.touchable(["cable"]);
  return { destroy() {} };
}

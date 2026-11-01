// Sliding rocks: a 300 kg rock on mud needs about 1800 N to start (mu_s 0.6, sandbox value). A strong wind on the
// rock alone gives about 30 N (sandbox estimate): no motion. Wind on a thin ice sheet spreads over a huge area,
// and the moving ice pushes the rock along at a few meters per minute.
import { caption, tapCut } from "../kit.js";
export default function build(ctx) {
  const { say, layer } = ctx;
  const cap = caption(layer, [1000, 760, 1590, 880], 22);
  tapCut(ctx, "c0", "Test case: wind only", () => { cap.textContent = "wind only: about 30 N vs about 1800 N to start\nthe rock stays put"; say("Wind alone is far too weak to move a 300 kilogram rock. The hypothesis fails.", true); });
  tapCut(ctx, "c1", "Test case: wind plus ice", () => { cap.textContent = "wind + ice: the ice sheet pushes the rock\nit slides a few meters per minute"; say("Wind drives a thin ice sheet, and the ice pushes the rock. This matches the GPS data.", true); });
  ctx.art.touchable(["c0", "c1"]);
  return { destroy() {} };
}

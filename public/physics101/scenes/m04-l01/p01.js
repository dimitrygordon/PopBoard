// Push the book: drag the arrow's tip to change the push (18 px per newton, up to 20 N either way). On release
// the book (sandbox mass 2.0 kg, friction ignored) moves for 1 s with a = F / m.
import { svg, path, handle, tween, caption, arrowD, clamp, BLUE, f2 } from "../kit.js";
const PXN = 18, Y = 570, BL = 640, BR = 900, M = 2.0, PXM = 120;
export default function build(ctx) {
  const { art, say, layer, reduce } = ctx;
  const s = svg(layer); const ar = path(s, "", { stroke: BLUE, "stroke-width": 9 });
  const cap = caption(layer, [560, 650, 1040, 740], 24, "Drag the arrow's tip.");
  let F = 10, F0, bx = 0;
  const draw = () => { const L = Math.abs(F) * PXN; ar.setAttribute("d", F >= 0 ? arrowD(BL + bx - L, Y, BL + bx - 4, Y, 20) : arrowD(BR + bx + L, Y, BR + bx + 4, Y, 20)); cap.textContent = `push ${f2(Math.abs(F), 1)} N ${F >= 0 ? "right" : "left"}\na = F / m = ${f2(F, 1)} N / ${f2(M, 1)} kg = ${f2(F / M, 1)} m/s\u00b2`; };
  handle(ctx, art.box("push"), "Push arrow: drag left or right to change the push", {
    start: () => { art.touched("push"); art.show("push", false); F0 = F; },
    move: (dx) => { F = clamp(Math.round((F0 - dx / PXN) * 2) / 2, -20, 20); draw(); },
    end: async () => {
      const a = F / M, b0 = bx;
      await tween(1000, (u) => { bx = clamp(b0 + 0.5 * a * u * u * PXM, -300, 500); art.set("book", { dx: bx }); draw(); }, reduce);
      say(F === 0 ? "No push, no change: the book stays put." : `A ${f2(Math.abs(F), 1)} newton push gives ${f2(Math.abs(a), 1)} meters per second squared, in the direction of the push.`, true);
    },
  });
  art.touchable(["push", "book"]); draw(); ar.setAttribute("d", "");
  return { destroy() {} };
}

// Eyeball versus least squares: drag across the graph to sketch your own line, then reveal the
// calculator's least-squares line and compare.
import { add, handle, fontPx, svg, path } from "../kit.js";
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const mine = path(s, "", { stroke: "#3B7DB8", "stroke-width": 7 });
  const g = art.box("least-squares");
  art.show("least-squares", false);
  let p0 = null;
  handle(ctx, [g[0] - 20, g[1] - 60, g[2] + 20, g[3] + 100], "Graph: drag to sketch your line", {
    start: () => { p0 = null; },
    move: (dx, dy, p) => { if (!p0) p0 = [p[0] - dx, p[1] - dy]; mine.setAttribute("d", `M ${p0[0]} ${p0[1]} L ${p[0]} ${p[1]}`); },
    end: () => { if (p0) say("Nice sketch. Now reveal the least-squares line to compare."); },
  });
  ui.button("Reveal least-squares line", () => { art.touched("least-squares"); art.show("least-squares", true); say("The calculator's line: y = 0.08x + 13.7. How close was your eyeballed line?", true); });
  ui.button("Clear my line", () => { mine.setAttribute("d", ""); art.show("least-squares", false); say(""); });
  art.touchable(["least-squares"]);
  return { destroy() {} };
}

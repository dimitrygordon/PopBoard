// Read the graph: drag the horizontal guide to a position, or the vertical guide to a time; where it
// meets the line you read the other value (12.0 m at 2.4 s, 22.5 m at 4.5 s in the book).
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const fx = (t) => 470 + t * 680 / 6, fy = (p) => 700 - p * 550 / 30;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const mk = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 3 });
  const cap = fontPx(add(layer, "div", "cap", [1160, 120, 1580, 260], ""), 28); cap.style.whiteSpace = "pre-line";
  const v = { hguide: 18, vguide: 1 };
  const read = (id) => {
    const [t, p] = id === "hguide" ? [v.hguide / 5, v.hguide] : [v.vguide, 5 * v.vguide];
    mk.setAttribute("d", `M ${fx(t) - 13} ${fy(p)} a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0`);
    cap.textContent = id === "hguide" ? `x = ${p.toFixed(1)} m\nreached at t = ${t.toFixed(1)} s` : `t = ${t.toFixed(1)} s\nposition x = ${p.toFixed(1)} m`;
    return [t, p];
  };
  for (const id of ["hguide", "vguide"]) {
    const home = art.box(id), hor = id === "hguide", v0h = v[id];
    const hb = hor ? [home[0], home[1] - 22, home[2], home[3] + 22] : [home[0] - 22, home[1], home[2] + 22, home[3]]; let s0 = 0;
    const h = handle(ctx, hb, hor ? "Horizontal guide: drag up or down to a position" : "Vertical guide: drag left or right to a time", {
      start: () => { art.touched(id); s0 = v[id]; },
      move: (dx, dy) => {
        v[id] = hor ? clamp(Math.round((s0 - dy * 30 / 550) * 2) / 2, 0, 30) : clamp(Math.round((s0 + dx * 6 / 680) * 10) / 10, 0, 6);
        art.set(id, hor ? { dy: fy(v[id]) - fy(v0h) } : { dx: fx(v[id]) - fx(v0h) }); read(id);
      },
      end: () => { if (hor) follow(h, hb, 0, fy(v[id]) - fy(v0h)); else follow(h, hb, fx(v[id]) - fx(v0h), 0); const [t, p] = read(id); say(`On the line, ${p.toFixed(1)} m goes with ${t.toFixed(1)} s.`, true); },
    });
  }
  art.touchable(["hguide", "vguide"]);
  read("hguide");
  return { destroy() {} };
}

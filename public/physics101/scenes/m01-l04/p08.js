// Finding the slope: drag P and Q along the spring line; rise, run, and slope update live.
import { add, handle, fontPx, svg, path } from "../kit.js";
const X = (m) => 576 + 14.63 * m, Y = (l) => 720 - 148.5 * (l - 13), F = (m) => 13.7 + 0.076 * m;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const tri = path(s, "", { stroke: "#E2B654", "stroke-width": 5, "stroke-dasharray": "14 10" });
  const cap = fontPx(add(layer, "div", "cap", [1120, 300, 1560, 520], ""), 26); cap.style.whiteSpace = "pre-line";
  const m = { "point-P": 5, "point-Q": 30 }, H = {};
  const draw = () => {
    const [a, b] = [m["point-P"], m["point-Q"]].sort((p, q) => p - q), la = Math.round(F(a) * 10) / 10, lb = Math.round(F(b) * 10) / 10;
    tri.setAttribute("d", `M ${X(a)} ${Y(la)} H ${X(b)} V ${Y(lb)}`);
    const rise = lb - la, run = b - a;
    cap.textContent = `rise = ${lb.toFixed(1)} - ${la.toFixed(1)} = ${rise.toFixed(1)} cm\nrun = ${b} - ${a} = ${run} g\nslope = ${run ? (rise / run).toFixed(3) : "?"} cm/g`;
    return run ? rise / run : 0;
  };
  for (const id of ["point-P", "point-Q"]) {
    const home = art.box(id), m0 = m[id]; let s0 = 0;
    const h = handle(ctx, home, `${id === "point-P" ? "Point P" : "Point Q"}: drag along the line`, {
      start: () => { art.touched(id); s0 = m[id]; },
      move: (dx) => { m[id] = Math.max(0, Math.min(35, Math.round(s0 + dx / 14.63))); art.set(id, { dx: X(m[id]) - X(m0), dy: Y(F(m[id])) - Y(F(m0)) }); draw(); },
      end: () => { h.style.left = ((home[0] + X(m[id]) - X(m0)) / 16) + "%"; h.style.top = ((home[1] + Y(F(m[id])) - Y(F(m0))) / 9) + "%"; const k = draw(); say(k ? `Slope about ${k.toFixed(2)} cm/g: wherever P and Q sit on the line, it lands near 0.08 cm/g.` : "Pull P and Q apart to get a run.", !!k); },
    });
    H[id] = { h, home, m0 };
  }
  ui.button("Back to the book's P and Q", () => { m["point-P"] = 5; m["point-Q"] = 30; for (const id in H) { art.set(id, { dx: 0, dy: 0 }); H[id].h.style.left = (H[id].home[0] / 16) + "%"; H[id].h.style.top = (H[id].home[1] / 9) + "%"; } draw(); say(""); });
  art.touchable(["point-P", "point-Q"]);
  draw();
  return { destroy() {} };
}

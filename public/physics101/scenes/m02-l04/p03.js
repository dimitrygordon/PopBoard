// Slope finder: drag both pickers onto a line. They snap to the nearest jogger line, and the sandbox
// draws the rise and run and divides them (red 2.0 m/s, blue 1.0 m/s).
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const fx = (t) => 330 + t * 200, fy = (p) => 730 - p * 620 / 6, tx = (x) => (x - 330) / 200, py = (y) => (730 - y) * 6 / 620;
const LINES = { red: 2, blue: 1 };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const tri = path(s, "", { stroke: "#E2B654", "stroke-width": 5, "stroke-dasharray": "14 10" });
  const cap = fontPx(add(layer, "div", "cap", [1000, 580, 1580, 760], "Drag both pickers onto one line."), 28); cap.style.whiteSpace = "pre-line";
  const P = { pick1: { t: 0.5, l: "red" }, pick2: { t: 2.5, l: "red" } }, H0 = { pick1: [0.5, 1], pick2: [2.5, 5] };
  const calc = () => {
    const a = P.pick1, b = P.pick2;
    if (a.l !== b.l) { tri.setAttribute("d", ""); cap.textContent = `pickers on different lines\n(${a.l} and ${b.l})`; return null; }
    const k = LINES[a.l], [p, q] = [a, b].sort((m, n) => m.t - n.t), rise = k * (q.t - p.t), run = q.t - p.t;
    tri.setAttribute("d", `M ${fx(p.t)} ${fy(k * p.t)} H ${fx(q.t)} V ${fy(k * q.t)}`);
    cap.textContent = `${a.l} jogger\nrise = ${(k * q.t).toFixed(1)} m \u2212 ${(k * p.t).toFixed(1)} m = ${rise.toFixed(1)} m\nrun = ${q.t.toFixed(1)} s \u2212 ${p.t.toFixed(1)} s = ${run.toFixed(1)} s\nslope = ${run ? (rise / run).toFixed(1) + " m/s" : "?"}`;
    return run ? rise / run : null;
  };
  for (const id of ["pick1", "pick2"]) {
    const home = art.box(id); let c0;
    const h = handle(ctx, home, `Point picker ${id.slice(-1)}: drag onto a line`, {
      start: () => { art.touched(id); c0 = [fx(P[id].t), fy(LINES[P[id].l] * P[id].t)]; },
      move: (dx, dy) => {
        const t = clamp(Math.round(tx(c0[0] + dx) * 10) / 10, 0, 3), p = py(c0[1] + dy), l = Math.abs(p - 2 * t) < Math.abs(p - t) ? "red" : "blue";
        P[id] = { t: l === "red" ? Math.min(t, 3) : t, l };
        const ddx = fx(P[id].t) - fx(H0[id][0]), ddy = fy(LINES[l] * P[id].t) - fy(H0[id][1]); art.set(id, { dx: ddx, dy: ddy }); calc();
      },
      end: () => { follow(h, home, fx(P[id].t) - fx(H0[id][0]), fy(LINES[P[id].l] * P[id].t) - fy(H0[id][1])); const k = calc(); if (k) say(`Slope ${k.toFixed(1)} m/s: wherever you pick on the ${P.pick1.l} line, rise over run is the same.`, true); },
    });
  }
  art.touchable(["pick1", "pick2"]);
  calc();
  return { destroy() {} };
}

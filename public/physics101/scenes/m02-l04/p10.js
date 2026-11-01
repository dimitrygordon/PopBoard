// Skateboarder (Example Problem 3): tap the skater to roll while her graph draws, then drag the two
// pickers along the line. Delta x over delta t gives her average velocity, 12.0 m / 7.0 s = 1.7 m/s.
// Art note: Leo is redrawing the skater for this page; rebuild the deck when the new cutout lands.
import { add, handle, fontPx, svg, path, follow, clamp, tween } from "../kit.js";
const fx = (t) => 470 + t * 530 / 8, fy = (x) => 450 - x * 360 / 12, X = (t) => 12 * t / 7;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const trace = path(s, "", { stroke: "#E2B654", "stroke-width": 7 }), tri = path(s, "", { stroke: "#B5473A", "stroke-width": 4, "stroke-dasharray": "12 8" });
  const cap = fontPx(add(layer, "div", "cap", [1020, 600, 1580, 760], ""), 26); cap.style.whiteSpace = "pre-line";
  const T = { pick1: 0, pick2: 7 }, H0 = { pick1: 0, pick2: 7 };
  const calc = () => {
    const [a, b] = [T.pick1, T.pick2].sort((p, q) => p - q), dx = X(b) - X(a), dt = b - a;
    tri.setAttribute("d", dt ? `M ${fx(a)} ${fy(X(a))} H ${fx(b)} V ${fy(X(b))}` : "");
    cap.textContent = `\u0394x = ${X(b).toFixed(1)} m \u2212 ${X(a).toFixed(1)} m = ${dx.toFixed(1)} m\n\u0394t = ${b.toFixed(1)} s \u2212 ${a.toFixed(1)} s = ${dt.toFixed(1)} s\nv\u0304 = ${dt ? (dx / dt).toFixed(1) + " m/s" : "?"}`;
    return dt ? dx / dt : 0;
  };
  for (const id of ["pick1", "pick2"]) {
    const home = art.box(id); let t0 = 0;
    const h = handle(ctx, home, `Point picker ${id.slice(-1)}: drag along the line`, {
      start: () => { art.touched(id); t0 = T[id]; },
      move: (dx) => { T[id] = clamp(Math.round((t0 + dx * 8 / 530) * 2) / 2, 0, 7); art.set(id, { dx: fx(T[id]) - fx(H0[id]), dy: fy(X(T[id])) - fy(X(H0[id])) }); calc(); },
      end: () => { follow(h, home, fx(T[id]) - fx(H0[id]), fy(X(T[id])) - fy(X(H0[id]))); const v = calc(); if (v) say(`${v.toFixed(1)} m/s in the positive direction, from any two points on this straight line. Her average speed is 1.7 m/s too.`, true); },
    });
  }
  const roll = async () => { art.touched("skater"); await tween(3500, (k) => { const t = 7 * k; trace.setAttribute("d", `M ${fx(0)} ${fy(0)} L ${fx(t)} ${fy(X(t))}`); art.set("skater", { dx: X(t) * 70 }); }, reduce); say("12.0 m in 7.0 s. Now drag the pickers to find her average velocity."); };
  handle(ctx, art.box("skater"), "Skateboarder: tap to roll", {}).addEventListener("click", roll);
  ui.button("Roll", roll);
  ui.button("Back to the start", () => { art.set("skater", { dx: 0 }); trace.setAttribute("d", ""); say(""); });
  art.touchable(["skater", "pick1", "pick2"]);
  calc();
  return { destroy() {} };
}

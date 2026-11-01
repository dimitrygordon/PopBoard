// Overlap checker: tap a student to plot five repeated readings; tap two students to compare them.
// Ranges that overlap agree (green); ranges that do not overlap disagree (red).
import { add, handle, fontPx, svg, path } from "../kit.js";
const Y = (v) => 738 - 450 * (v - 13.8); // Leo's axis: 13.8 cm at y 738, 15.2 cm at y 108
const ST = [
  { id: "student-1", x: 1040, m: 14.6, u: 0.2, r: [14.4, 14.5, 14.6, 14.7, 14.8] },
  { id: "student-2", x: 1232, m: 14.8, u: 0.3, r: [14.5, 14.7, 14.8, 14.9, 15.1] },
  { id: "student-3", x: 1424, m: 14.0, u: 0.1, r: [13.9, 14.0, 14.0, 14.1, 14.0] },
];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const dots = path(s, "", { fill: "#3B7DB8", stroke: "#1F2F5C", "stroke-width": 2 });
  const band = path(s, "", { fill: "none", "stroke-width": 6 });
  const cap = fontPx(add(layer, "div", "cap", [860, 790, 1440, 850], "Tap a student."), 22);
  let shown = new Set(), pick = [];
  const redraw = () => dots.setAttribute("d", [...shown].map((i) => ST[i].r.map((v, k) => `M ${ST[i].x - 34 - k * 9} ${Y(v)} m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0`).join(" ")).join(" "));
  ST.forEach((st, i) => handle(ctx, [st.x - 40, Y(st.m + st.u) - 20, st.x + 40, Y(st.m - st.u) + 20], `Student ${i + 1}: ${st.m} plus or minus ${st.u} cm`, {}).addEventListener("click", () => {
    art.touched(st.id); shown.add(i); redraw();
    pick = [...pick.filter((p) => p !== i), i].slice(-2);
    if (pick.length < 2) { cap.textContent = `Student ${i + 1}: ${st.m} \u00b1 ${st.u} cm (${(st.m - st.u).toFixed(1)} to ${(st.m + st.u).toFixed(1)} cm). Tap another student.`; return say("Five readings give the error bar. Pick a second student to compare."); }
    const [a, b] = pick.map((p) => ST[p]), lo = Math.max(a.m - a.u, b.m - b.u), hi = Math.min(a.m + a.u, b.m + b.u), ok = lo <= hi;
    band.setAttribute("stroke", ok ? "#3F6B3A" : "#B03A2E");
    band.setAttribute("d", ok ? `M 900 ${Y(hi)} H 1540 M 900 ${Y(lo)} H 1540` : "");
    cap.textContent = `Students ${pick[0] + 1} and ${pick[1] + 1}: ${ok ? `overlap from ${lo.toFixed(1)} to ${hi.toFixed(1)} cm` : "no overlap"}`;
    say(ok ? "Their ranges overlap, so their measurements agree." : "Their ranges do not overlap, so these measurements do not agree.", ok);
  }));
  art.touchable(ST.map((s) => s.id));
  ui.button("Start over", () => { shown.clear(); pick = []; redraw(); band.setAttribute("d", ""); cap.textContent = "Tap a student."; say(""); });
  return { destroy() {} };
}

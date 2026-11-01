// Inverse relationship: raise the speed for a 300 km trip and the travel time drops; each speed you
// try leaves a point on the curve t = 300 / v.
import { add, fontPx, svg, path } from "../kit.js";
const X = (v) => 224 + (v - 30) / 70 * 1216, Y = (t) => 540 - 45 * t;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const pts = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 2 });
  const cap = fontPx(add(layer, "div", "cap", [1000, 60, 1560, 120], ""), 26);
  const seen = new Set();
  const go = (v) => {
    const t = 300 / v; seen.add(v); art.touched("car"); art.set("car", { dx: X(v) - X(30) });
    pts.setAttribute("d", [...seen].map((u) => `M ${X(u) - 9} ${Y(300 / u)} a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0`).join(" "));
    cap.textContent = `${v} km/h: ${t.toFixed(1)} h for 300 km`;
    if (seen.size > 4) say("The points trace a curve, not a line: double the speed and the time halves. That's an inverse relationship.", true);
  };
  const sl = ui.slider({ label: "Speed", min: 30, max: 100, step: 5, value: 30, fmt: (v) => v + " km/h" }, go);
  ui.button("Clear the points", () => { seen.clear(); sl.set(30); go(30); say(""); });
  art.touchable(["car"]);
  go(30);
  return { destroy() {} };
}

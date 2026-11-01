// Path vs. graph: the runner crosses a flat track while her position-time point climbs the graph.
// The path is flat; the graph line slopes up. A graph is not a picture of the path.
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const fx = (t) => 470 + t * 710 / 6, fy = (p) => 440 - p * 350 / 30, TRK = (m) => 200 + 48 * m;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const dot = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 3 }), trail = path(s, "", { stroke: "#E2B654", "stroke-width": 7 });
  const cap = fontPx(add(layer, "div", "cap", [1290, 80, 1590, 200], ""), 26); cap.style.whiteSpace = "pre-line";
  let sl;
  const at = (t) => {
    const p = 5 * t; art.set("runner", { dx: TRK(p) - TRK(10) });
    dot.setAttribute("d", `M ${fx(t) - 12} ${fy(p)} a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0`);
    trail.setAttribute("d", `M ${fx(0)} ${fy(0)} L ${fx(t)} ${fy(p)}`);
    cap.textContent = `t = ${t.toFixed(1)} s\nx = ${p.toFixed(1)} m`;
  };
  sl = ui.slider({ label: "Time", min: 0, max: 5, step: 0.1, value: 2, fmt: (v) => v.toFixed(1) + " s" }, (v) => { art.touched("runner"); at(v); });
  const play = async () => { art.touched("runner"); await tween(3000, (k) => { at(5 * k); sl.set(+(5 * k).toFixed(1)); }, reduce); say("Her path stayed flat the whole time, but the graph line rose. The graph shows position against time, not the shape of the path.", true); };
  ui.button("Play", play);
  handle(ctx, art.box("runner"), "Runner: tap to play", {}).addEventListener("click", play);
  art.touchable(["runner"]);
  at(2);
  return { destroy() {} };
}

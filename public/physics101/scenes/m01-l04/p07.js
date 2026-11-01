// y = mx + b: drag the m and b knobs along their rails. m tilts the gold line, b slides it up and down.
import { add, handle, fontPx, svg, path } from "../kit.js";
const X = (v) => 576 + 54.4 * v, Y = (v) => 720 - 55.8 * v, R0 = 1246, R1 = 1506;
const RANGE = { "slider-m": [0, 1.2], "slider-b": [0, 4] };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const line = path(s, "", { stroke: "#E2B654", "stroke-width": 8 });
  const eq = fontPx(add(layer, "div", "cap", [1200, 200, 1560, 270], ""), 30); eq.style.textAlign = "center";
  const v = { "slider-m": 0.6, "slider-b": 2 };
  const draw = () => {
    const m = v["slider-m"], b = v["slider-b"], x1 = Math.min(10, (11 - b) / Math.max(m, 0.001));
    line.setAttribute("d", `M ${X(0)} ${Y(b)} L ${X(x1)} ${Y(b + m * x1)}`);
    eq.textContent = `y = ${m.toFixed(1)}x + ${b.toFixed(1)}`;
  };
  const sliders = {};
  for (const id of ["slider-m", "slider-b"]) {
    const home = art.box(id), c0 = (home[0] + home[2]) / 2, [lo, hi] = RANGE[id];
    const pos = (val) => R0 + (val - lo) / (hi - lo) * (R1 - R0);
    const put = (val) => { v[id] = val; const dx = pos(val) - c0; art.set(id, { dx }); h.style.left = ((home[0] + dx) / 16) + "%"; draw(); };
    let x0 = 0;
    const h = handle(ctx, home, id === "slider-m" ? "Slope knob m: drag along the rail" : "Intercept knob b: drag along the rail", {
      start: () => { art.touched(id); x0 = pos(v[id]); },
      move: (dx) => { const x = Math.max(R0, Math.min(R1, x0 + dx)); v[id] = Math.round((lo + (x - R0) / (R1 - R0) * (hi - lo)) * 10) / 10; art.set(id, { dx: pos(v[id]) - c0 }); draw(); },
      end: () => { put(v[id]); say(id === "slider-m" ? `Slope m = ${v[id].toFixed(1)}: a bigger m tilts the line more steeply.` : `Intercept b = ${v[id].toFixed(1)}: the line crosses the y-axis at ${v[id].toFixed(1)}.`, true); },
    });
    sliders[id] = put;
  }
  ui.button("Back to y = 0.6x + 2", () => { sliders["slider-m"](0.6); sliders["slider-b"](2); say(""); });
  art.touchable(["slider-m", "slider-b"]);
  draw();
  return { destroy() {} };
}

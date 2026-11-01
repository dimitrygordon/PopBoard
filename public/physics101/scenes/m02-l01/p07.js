// Particle model: drag the dot onto the runner's waist in each frame. Then switch to a runner who
// speeds up or slows down and watch the dot spacing grow or shrink.
import { add, handle, fontPx, svg, path, follow } from "../kit.js";
const WAIST = [172, 539, 961, 1383], WY = 505, ROW = 800;
const RUN = { steady: [172, 539, 961, 1383], "speeding up": [172, 322, 672, 1222], "slowing down": [172, 722, 1072, 1222] };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const dots = path(s, "", { fill: "#B5473A", stroke: "#1F2F5C", "stroke-width": 2 }), row = path(s, "", { fill: "#1F2F5C" });
  const cap = fontPx(add(layer, "div", "cap", [700, 60, 1560, 120], "Drag the red dot to each runner's waist."), 26);
  const placed = new Set();
  const disc = (x, y, r) => `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 `;
  const redraw = () => { dots.setAttribute("d", [...placed].map((x) => disc(x, WY, 13)).join("")); };
  const home = art.box("dot"), c = [(home[0] + home[2]) / 2, (home[1] + home[3]) / 2];
  const h = handle(ctx, home, "Dot: drag onto a runner's waist", {
    start: () => art.touched("dot"),
    move: (dx, dy) => art.set("dot", { dx, dy }),
    end: (dx, dy) => {
      const p = [c[0] + dx, c[1] + dy], hit = WAIST.find((x) => Math.hypot(p[0] - x, p[1] - WY) < 90);
      art.set("dot", { dx: 0, dy: 0 }); follow(h, home);
      if (hit == null) return say("Drop the dot right on the runner's waist.");
      placed.add(hit); redraw(); cap.textContent = `${placed.size} of 4 dots placed`;
      if (placed.size === 4) say("Four dots, evenly spaced: at equal time intervals that means her speed is not changing.", true);
    },
  });
  const runner = (k) => {
    const xs = RUN[k]; row.setAttribute("d", xs.map((x) => disc(x, ROW, 11)).join(""));
    cap.textContent = `${k} runner: ${k === "steady" ? "equal spacing" : k === "speeding up" ? "spacing grows" : "spacing shrinks"}`;
    say(k === "steady" ? "Evenly spaced dots: constant speed." : `The gaps ${k === "speeding up" ? "grow" : "shrink"}: she covers ${k === "speeding up" ? "more" : "less"} ground in each equal time interval.`, true);
  };
  for (const k of Object.keys(RUN)) ui.button(`Show a ${k} runner`, () => runner(k));
  ui.button("Clear the dots", () => { placed.clear(); redraw(); row.setAttribute("d", ""); cap.textContent = "Drag the red dot to each runner's waist."; say(""); });
  art.touchable(["dot"]);
  return { destroy() {} };
}

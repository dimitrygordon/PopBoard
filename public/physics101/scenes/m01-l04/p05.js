// Graph builder: put the variables on the right axes (tap a label tile to swap them), then pick a
// scale of 2, 5, or 10 grams per division for the 0 to 35 g range.
import { handle, svg, path } from "../kit.js";
const X0 = 608, Y0 = 684, X1 = 960;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const a = art.box("axis-label-1"), b = art.box("axis-label-2");
  const s = svg(layer); const ticks = path(s, "", { stroke: "#E2B654", "stroke-width": 4 });
  let swapped = false;
  const swap = () => {
    swapped = !swapped;
    art.set("axis-label-1", swapped ? { dx: b[0] - a[0], dy: b[1] - a[1] } : { dx: 0, dy: 0 });
    art.set("axis-label-2", swapped ? { dx: a[0] - b[0], dy: a[1] - b[1] } : { dx: 0, dy: 0 });
    say(swapped ? "Swapped: now the dependent variable is on the x-axis. Swap back!" : "Right: the independent variable (mass, the one you change) goes on the x-axis and the dependent variable (length) on the y-axis.", !swapped);
  };
  [["axis-label-1", a], ["axis-label-2", b]].forEach(([id, box]) => handle(ctx, box, "Axis label: tap to swap the axes", {}).addEventListener("click", () => { art.touched(id); swap(); }));
  const scale = (k) => {
    const n = Math.ceil(35 / k), px = (X1 - X0) / n;
    ticks.setAttribute("d", Array.from({ length: n + 1 }, (_, i) => `M ${X0 + i * px} ${Y0 - 14} V ${Y0 + 14}`).join(" "));
    say(k === 5 ? "5 g per division: 7 divisions cover 0 to 35 g and use the whole axis. A good choice." : k === 2 ? "2 g per division needs 18 crowded divisions: hard to read." : "10 g per division goes to 40 g with only 4 divisions: the data are squeezed.", k === 5);
  };
  [2, 5, 10].forEach((k) => ui.button(`${k} g per division`, () => scale(k)));
  ui.button("Swap the axes", swap);
  art.touchable(["axis-label-1", "axis-label-2"]);
  return { destroy() {} };
}

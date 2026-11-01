// Position and distance: each tap moves the runner 5 m and redraws her position arrow from the origin.
// The distance counter adds up the whole path, so after a turn around the two differ.
import { add, handle, fontPx, svg, path, follow } from "../kit.js";
const f = (m) => 200 + 45 * m, START = 20, Y = 330;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const arr = path(s, "", { stroke: "#E2B654", "stroke-width": 8 });
  const cap = fontPx(add(layer, "div", "cap", [700, 60, 1560, 200], ""), 28); cap.style.whiteSpace = "pre-line";
  let x = START, dir = 1, dist = 0;
  const home = art.box("runner"); let h;
  const draw = () => {
    const e = f(x); arr.setAttribute("d", x ? `M ${f(0)} ${Y} H ${e} m ${-Math.sign(x) * 22} -14 l ${Math.sign(x) * 22} 14 l ${-Math.sign(x) * 22} 14` : "");
    art.set("runner", { dx: f(x) - f(START) }); follow(h, home, f(x) - f(START));
    cap.textContent = `position: ${x} m right of the origin\ndistance run: ${dist} m   heading ${dir > 0 ? "right" : "left"}`;
  };
  const step = () => {
    art.touched("runner");
    const nx = x + 5 * dir; if (nx < 0 || nx > 30) return say("End of the road. Tap Turn around.");
    x = nx; dist += 5; draw();
    if (dist > Math.abs(x - START)) say(`She has run ${dist} m, but her position is ${x} m: distance counts the whole path, position is just where she is now.`, true);
  };
  h = handle(ctx, home, "Runner: tap to run 5 m", {}); h.addEventListener("click", step);
  ui.button("Run 5 m", step);
  ui.button("Turn around", () => { dir = -dir; draw(); say(`Now heading ${dir > 0 ? "right" : "left"}.`); });
  ui.button("Start over", () => { x = START; dir = 1; dist = 0; draw(); say(""); });
  art.touchable(["runner"]);
  draw();
  return { destroy() {} };
}

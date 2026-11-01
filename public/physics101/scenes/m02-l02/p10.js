// Tip to tail: drag B so its tail sits on A's tip and read the resultant. Flip B to subtract: that
// adds an arrow of the same length pointing the other way.
import { add, handle, fontPx, svg, path, follow } from "../kit.js";
const f = (k) => 160 + 165 * k, Y = 340;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const neg = path(s, "", { stroke: "#9B7BC8", "stroke-width": 7, "stroke-dasharray": "16 10" }), res = path(s, "", { stroke: "#E2B654", "stroke-width": 8 });
  const cap = fontPx(add(layer, "div", "cap", [160, 560, 1440, 640], ""), 32); cap.style.textAlign = "center";
  let tail = 5, flip = false; // B's tail in km
  const home = art.box("B"); let t0 = 0, h;
  const draw = (talk) => {
    const tip = flip ? tail - 2 : tail + 2, joined = tail === 5;
    art.show("B", !flip); neg.setAttribute("d", flip ? `M ${f(tail)} 272 H ${f(tip)} m 24 -16 l -24 16 l 24 16` : "");
    art.set("B", { dx: f(tail) - f(5) }); follow(h, home, f(tail) - f(5));
    res.setAttribute("d", joined ? `M ${f(0)} ${Y} H ${f(tip)} m -24 -16 l 24 16 l -24 16` : "");
    cap.textContent = joined ? `R = A ${flip ? "\u2212" : "+"} B = 5 km ${flip ? "\u2212" : "+"} 2 km = ${tip} km east` : `B's tail is at ${tail} km. Put it on A's tip at 5 km.`;
    if (talk && joined) say(flip ? "Subtracting B is adding an arrow the same length pointing west: 5 km minus 2 km is 3 km east." : "Tip to tail: the resultant runs from A's tail to B's tip, 7 km east.", true);
  };
  h = handle(ctx, home, "Vector B: drag left or right along the number line", {
    start: () => { art.touched("B"); t0 = tail; },
    move: (dx) => { tail = Math.max(0, Math.min(6, Math.round(t0 + dx / 165))); draw(); },
    end: () => draw(true),
  });
  handle(ctx, art.box("A"), "Vector A, 5 km east: tap to check the sum", {}).addEventListener("click", () => { art.touched("A"); draw(true); });
  ui.button("Flip B to subtract", () => { flip = !flip; draw(true); });
  art.touchable(["A", "B"]);
  draw();
  return { destroy() {} };
}

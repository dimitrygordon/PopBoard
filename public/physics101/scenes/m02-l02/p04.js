// Which way is positive? The dot sits 9 m left of the cactus, 5 m left of the origin. Flip the
// positive direction and the same place reads -5 m or +5 m.
import { add, handle, fontPx, svg, path } from "../kit.js";
const f = (m) => 520 + 45 * m;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const dir = path(s, "", { stroke: "#E2B654", "stroke-width": 7 });
  const cap = fontPx(add(layer, "div", "cap", [900, 120, 1560, 200], ""), 32);
  let sign = 1;
  const draw = () => {
    const x = 1310; dir.setAttribute("d", `M ${x - sign * 150} 330 H ${x + sign * 150} m ${-sign * 24} -16 l ${sign * 24} 16 l ${-sign * 24} 16`);
    cap.textContent = `positive to the ${sign > 0 ? "right" : "left"}: dot at ${sign > 0 ? "\u22125" : "+5"} m`;
  };
  const flip = () => { art.touched("dot"); sign = -sign; draw(); say(sign > 0 ? "Right is positive, so 5 m left of the origin is \u22125 m." : "Left is positive now: the same spot is +5 m. The sign comes from the direction you chose.", true); };
  handle(ctx, art.box("dot"), "Dot 5 m left of the origin: tap to flip the positive direction", {}).addEventListener("click", flip);
  ui.button("Switch the positive direction", flip);
  art.touchable(["dot"]);
  draw();
  return { destroy() {} };
}

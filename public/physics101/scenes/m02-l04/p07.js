// Same average, different paths: only the start and end show. Reveal each hidden path in turn: steady,
// swerving, or speeding up and slowing down, every one has the same delta x and delta t, so the same
// average velocity. Average velocity says nothing about what happened in between.
import { add, fontPx } from "../kit.js";
const P = [["path1", "a steady trip"], ["path2", "a swerving trip"], ["path3", "a trip that speeds up and slows down"]];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [1150, 420, 1590, 560], "Only the start and the end are known."), 26); cap.style.whiteSpace = "pre-line";
  let n = 0;
  const hide = () => { n = 0; for (const [id] of P) art.show(id, false); cap.textContent = "Only the start and the end are known."; };
  ui.button("Reveal a path", () => {
    if (n >= P.length) hide();
    const [id, what] = P[n++]; art.show(id, true); art.touched(id);
    cap.textContent = `path ${n}: ${what}\nsame start, same end, same \u0394t`;
    say(n === P.length ? "Three different trips, one average velocity. To know the velocity at an instant you need more than the start and the end." : "Same displacement over the same time: the same average velocity.", n === P.length);
  });
  ui.button("Hide the paths", () => { hide(); say(""); });
  hide();
  return { destroy() {} };
}

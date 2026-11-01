// Two joggers: set each jogger's pace and race for 3 s. Both start at the origin; the faster one goes
// farther in the same time and needs less time for 100 m (book: red 2.0 m/s, blue 1.0 m/s).
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const fx = (t) => 500 + t * 660 / 3, fy = (p) => 430 - p * 350 / 6, PXM = 40;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const L = { red: path(s, "", { stroke: "#B5473A", "stroke-width": 6 }), blue: path(s, "", { stroke: "#5B8FC9", "stroke-width": 6 }) };
  const cap = fontPx(add(layer, "div", "cap", [1290, 200, 1590, 420], ""), 24); cap.style.whiteSpace = "pre-line";
  const v = { red: 2, blue: 1 };
  const seg = (k, t) => { const tt = Math.min(t, 6 / v[k]); return `M ${fx(0)} ${fy(0)} L ${fx(tt)} ${fy(v[k] * tt)}`; };
  const race = async () => {
    art.touched("red"); art.touched("blue");
    await tween(3000, (k) => { const t = 3 * k; for (const c of ["red", "blue"]) { L[c].setAttribute("d", seg(c, t)); art.set(c, { dx: v[c] * t * PXM }); } }, reduce);
    cap.textContent = `in 3 s:\nred ${(3 * v.red).toFixed(1)} m, blue ${(3 * v.blue).toFixed(1)} m\ntime for 100 m:\nred ${(100 / v.red).toFixed(0)} s, blue ${(100 / v.blue).toFixed(0)} s`;
    const f = v.red === v.blue ? null : v.red > v.blue ? "red" : "blue";
    say(f ? `The ${f} jogger is faster: more distance in the same 3 s, and less time for the same 100 m.` : "Same pace: same distance in 3 s and the same time for 100 m.", true);
  };
  ui.slider({ label: "Red pace", min: 0.5, max: 4, step: 0.5, value: 2, fmt: (x) => x.toFixed(1) + " m/s" }, (x) => (v.red = x));
  ui.slider({ label: "Blue pace", min: 0.5, max: 4, step: 0.5, value: 1, fmt: (x) => x.toFixed(1) + " m/s" }, (x) => (v.blue = x));
  ui.button("Race 3 s", race);
  ui.button("Back to the start", () => { for (const c of ["red", "blue"]) { art.set(c, { dx: 0 }); L[c].setAttribute("d", ""); } cap.textContent = ""; say(""); });
  for (const c of ["red", "blue"]) handle(ctx, art.box(c), `${c} jogger: tap to race`, {}).addEventListener("click", race);
  art.touchable(["red", "blue"]);
  return { destroy() {} };
}

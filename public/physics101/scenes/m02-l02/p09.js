// Displacement: drag the start (x initial) and end (x final) markers along Figure 9's road. The
// arrow from start to end is the displacement, delta x = x final - x initial, with its direction.
import { add, handle, fontPx, svg, path, follow, clamp } from "../kit.js";
const X = (m) => 201.6 + 38.88 * m, Y = 430; // Figure 9 placed at 2.4x: 0 m at 201.6 px, 25 m at 1173.6 px
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const arr = path(s, "", { stroke: "#E2B654", "stroke-width": 8 });
  const cap = fontPx(add(layer, "div", "cap", [200, 600, 1400, 700], ""), 32); cap.style.textAlign = "center";
  const m = { start: 5, end: 25 }, home = { start: 5, end: 25 }, H = {};
  const draw = (talk) => {
    const d = m.end - m.start, sg = Math.sign(d);
    arr.setAttribute("d", d ? `M ${X(m.start)} ${Y} H ${X(m.end)} m ${-sg * 24} -16 l ${sg * 24} 16 l ${-sg * 24} 16` : "");
    cap.textContent = `\u0394x = x f \u2212 x i = ${m.end} m \u2212 ${m.start} m = ${Math.abs(d)} m${d ? " to the " + (d > 0 ? "right" : "left") : ""}`;
    if (talk) say(d ? `Displacement is ${Math.abs(d)} m to the ${d > 0 ? "right" : "left"}: a size and a direction, so it is a vector.` : "Same start and end: zero displacement.", !!d);
  };
  for (const id of ["start", "end"]) {
    const b = art.box(id); let m0 = 0;
    const h = handle(ctx, b, `${id === "start" ? "Start marker, x initial" : "End marker, x final"}: drag along the road`, {
      start: () => { art.touched(id); m0 = m[id]; },
      move: (dx) => { m[id] = clamp(Math.round(m0 + dx / 38.88), 0, 30); art.set(id, { dx: X(m[id]) - X(home[id]) }); draw(); },
      end: () => { follow(h, b, X(m[id]) - X(home[id])); draw(true); },
    });
    H[id] = { h, b };
  }
  const setTo = (a, e) => { m.start = a; m.end = e; for (const id in H) { art.set(id, { dx: X(m[id]) - X(home[id]) }); follow(H[id].h, H[id].b, X(m[id]) - X(home[id])); } draw(true); };
  ui.button("Cactus to lamppost", () => setTo(5, 25));
  ui.button("Lamppost back to cactus", () => setTo(25, 5));
  art.touchable(["start", "end"]);
  draw();
  return { destroy() {} };
}

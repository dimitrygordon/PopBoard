// Arrows as models: tap places on the floor plan to draw a trip as tip-to-tail arrows, and add a note
// on each arrow saying what movement it stands for. Tap the book's arrows to hide or show them.
import { add, handle, fontPx, svg, path, tapArea } from "../kit.js";
const PLAN = [380, 60, 1240, 880];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const arr = path(s, "", { stroke: "#E2B654", "stroke-width": 7 });
  const notes = fontPx(add(layer, "ol", "cap", [1260, 380, 1590, 880], ""), 22);
  const note = add(layer, "input", "cap", [1260, 300, 1590, 350]); note.placeholder = "note for the last arrow"; fontPx(note, 22); note.style.pointerEvents = "auto";
  const pts = [[455, 780]]; let book = true;
  const draw = () => {
    arr.setAttribute("d", pts.slice(1).map((p, i) => { const a = pts[i], ang = Math.atan2(p[1] - a[1], p[0] - a[0]), hx = p[0] - 24 * Math.cos(ang - 0.5), hy = p[1] - 24 * Math.sin(ang - 0.5), kx = p[0] - 24 * Math.cos(ang + 0.5), ky = p[1] - 24 * Math.sin(ang + 0.5); return `M ${a[0]} ${a[1]} L ${p[0]} ${p[1]} M ${hx} ${hy} L ${p[0]} ${p[1]} L ${kx} ${ky}`; }).join(" "));
  };
  tapArea(ctx, PLAN, "Floor plan: tap where the next arrow should end", (p) => {
    pts.push(p.map(Math.round)); draw();
    const li = document.createElement("li"); li.textContent = `arrow ${pts.length - 1}: (type a note above)`; notes.appendChild(li);
    say("Each arrow is a model of one movement. Type a note saying what it stands for.");
  });
  note.addEventListener("change", () => { const li = notes.lastElementChild; if (li && note.value.trim()) { li.textContent = `arrow ${pts.length - 1}: ${note.value.trim()}`; note.value = ""; say("Arrows plus notes make a model a partner can read.", true); } });
  handle(ctx, art.box("vectors"), "The book's two arrows: tap to hide or show them", {}).addEventListener("click", () => { art.touched("vectors"); book = !book; art.show("vectors", book); });
  ui.button("Clear my arrows", () => { pts.length = 1; draw(); notes.textContent = ""; say(""); });
  art.touchable(["vectors"]);
  return { destroy() {} };
}

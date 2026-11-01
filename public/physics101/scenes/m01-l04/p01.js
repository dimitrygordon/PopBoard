// Change one thing at a time (Leo's spring-lab drag spec). Each brass mass is its own cutout; the shared drag
// engine (scenes/drag.js, ctx.drag) handles pointer, touch and keyboard drags and snaps a mass onto the hook,
// one at a time. This scene adds the physics: the spring stretches to L = 13.7 + 0.08 m cm (Table 3; 50 g is
// a predict-first check at 17.7 cm), the length shows beside the spring, and the student types it into Table 3.
// "Swap spring" changes a second factor mid-run (a stiffer spring, sandbox values, not from the book).
import { add, fontPx, tween } from "../kit.js";
const ROWS = [0, 5, 10, 15, 20, 25, 30, 35], L0 = 13.7, SP = [327, 195, 408, 592];
const ROW = (i) => [162 + i * 72, 234 + i * 72];
export default function build(ctx) {
  const { art, ui, say, layer, reduce, drag } = ctx;
  let k = 0.08, swapped = false, hung = 0, sy = 1, anim = 0;
  const len = (m) => +(L0 + k * m).toFixed(1);
  const style = (el) => Object.assign(el.style, { textAlign: "center", fontFamily: "\"Patrick Hand\", cursive", color: "#1F2F5C", background: "transparent", border: 0 });
  ROWS.forEach((m, i) => { const [y0, y1] = ROW(i); const c = fontPx(add(layer, "div", "live", [900, y0 + 8, 1120, y1 - 8], String(m)), 34); style(c); c.style.lineHeight = "1.6"; });
  const lc = ROWS.map((m, i) => {
    const [y0, y1] = ROW(i), inp = fontPx(add(layer, "input", "p101-cell", [1140, y0 + 10, 1340, y1 - 10]), 32); style(inp);
    Object.assign(inp, { type: "text", inputMode: "decimal", placeholder: "?" }); inp.dataset.pbFree = ""; inp.setAttribute("aria-label", `Table 3: spring length in cm for ${m} g`);
    Object.assign(inp.style, { pointerEvents: "auto", borderBottom: "2px dashed #8a7f6a" });
    inp.addEventListener("change", () => {
      const v = parseFloat(inp.value), want = len(m); if (Number.isNaN(v)) return;
      const ok = Math.abs(v - want) <= 0.05; inp.style.color = ok ? "#2E7D4F" : "#B03A2E";
      say(ok ? `${m} g: ${want.toFixed(1)} cm is in the table.` : `Read the length again: hang ${m} g and check the number beside the spring.`, ok);
    });
    return inp;
  });
  const read = fontPx(add(layer, "div", "cap", [430, 400, 740, 460], ""), 30); read.hidden = true; read.setAttribute("aria-live", "polite");
  const pred = fontPx(add(layer, "input", "p101-cell", [430, 470, 740, 520]), 24); style(pred);
  Object.assign(pred, { type: "text", inputMode: "decimal", placeholder: "Predict 50 g (cm)" }); pred.dataset.pbFree = ""; pred.setAttribute("aria-label", "Your prediction: spring length in cm with 50 g");
  Object.assign(pred.style, { pointerEvents: "auto", background: "rgba(251,246,234,.9)", borderRadius: "0.4em" });
  // stretch the spring about its top (y 195): scaleY about the centre plus a shift of (sy - 1) * h / 2
  const h = SP[3] - SP[1];
  const stretch = (to) => {
    const from = sy, id = ++anim;
    return tween(300, (t) => {
      if (id !== anim) return;
      const b = reduce ? 0 : Math.sin(t * Math.PI) * (1 - t) * 0.6 * (to - from); // small bounce past the target
      sy = from + (to - from) * t + b;
      art.set("spring", { sy, dy: ((sy - 1) * h) / 2 }); drag.setTarget("spring", [368, SP[1] + h * sy]);
    }, reduce);
  };
  const massOf = (id) => +id.match(/(\d+)g/)[1];
  drag.on("drop", (id, target) => {
    if (target !== "spring") return;
    const m = massOf(id), L = len(m); hung = m; stretch(L / L0);
    read.hidden = false; read.textContent = `${m} g: length ${L.toFixed(1)} cm`;
    if (m === 50) {
      const p = parseFloat(pred.value);
      say(Number.isNaN(p) ? `50 g stretches it to ${L.toFixed(1)} cm. Next time, type a prediction first.` : `You predicted ${p} cm; it is ${L.toFixed(1)} cm. ${Math.abs(p - L) <= 0.2 ? "The pattern held beyond the table." : "Use the pattern: each 5 g adds the same stretch."}`, Number.isNaN(p) ? null : Math.abs(p - L) <= 0.2);
    } else say(swapped ? "Two things changed: the mass and the spring. You can't tell which one caused this length." : `Only the mass changed. Type ${L.toFixed(1)} into Table 3 next to ${m} g.`, !swapped);
  });
  drag.on("home", (id, was) => { if (was === "spring" && !drag.items.some((i) => i.on === "spring")) { hung = 0; stretch(1); read.hidden = true; } });
  ui.button("Swap spring", () => { if (swapped) return; swapped = true; k = 0.04; if (hung) { stretch(len(hung) / L0); read.textContent = `${hung} g: length ${len(hung).toFixed(1)} cm`; } say("Spring swapped mid-run. Keep adding mass and compare with the rows you already have."); });
  ui.button("Start over", () => { swapped = false; k = 0.08; hung = 0; stretch(1); read.hidden = true; pred.value = ""; lc.forEach((c) => { c.value = ""; c.style.color = "#1F2F5C"; }); say(""); });
  say("Drag a mass up to the spring's hook, or tap it. Hang one at a time and log each length in Table 3.");
  return { destroy() { anim++; } };
}

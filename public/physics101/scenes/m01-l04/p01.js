// Change one thing at a time: tap the mass set to hang 0 to 35 g on the spring and fill Table 3.
// "Swap spring" changes a second factor mid-run, and the new rows stop fitting the pattern.
import { add, handle, fontPx } from "../kit.js";
const L = [13.7, 14.1, 14.5, 14.9, 15.3, 15.7, 16.0, 16.4];
const STIFF = [13.7, 13.9, 14.1, 14.3, 14.5, 14.7, 14.9, 15.1]; // a stiffer spring (sandbox values)
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cells = L.map((_, i) => { const c = fontPx(add(layer, "div", "cap", [1135, 90 + (i + 1) * 72 + 10, 1345, 90 + (i + 2) * 72 - 10], ""), 34); c.style.textAlign = "center"; return c; });
  const cap = fontPx(add(layer, "div", "cap", [60, 800, 760, 860], ""), 24);
  let n = 0, swapped = -1;
  const len = (i) => (swapped >= 0 && i >= swapped ? STIFF[i] : L[i]);
  const show = () => cells.forEach((c, i) => { c.textContent = i < n ? len(i).toFixed(1) : ""; c.style.color = swapped >= 0 && i >= swapped && i < n ? "#B03A2E" : ""; });
  const hang = () => {
    if (n >= L.length) return say("Table 3 is full: 0 to 35 g. Look at the pattern in the length column.", true);
    n++; show(); cap.textContent = `Hanging ${(n - 1) * 5} g: spring length ${len(n - 1).toFixed(1)} cm`;
    say(swapped >= 0 ? "Two things changed: the mass and the spring. You can't tell which one caused this length." : "Only the mass changed, so any change in length comes from the mass.", swapped < 0);
  };
  handle(ctx, art.box("mass-set"), "Mass set: tap to hang the next 5 g", {}).addEventListener("click", () => { art.touched("mass-set"); hang(); });
  ui.button("Hang the next mass", hang);
  ui.button("Swap spring", () => { if (swapped >= 0) return; swapped = n; show(); say("Spring swapped mid-run. Keep adding mass and compare the red rows."); });
  ui.button("Start over", () => { n = 0; swapped = -1; show(); cap.textContent = ""; say(""); });
  art.touchable(["mass-set"]);
  show();
  return { destroy() {} };
}

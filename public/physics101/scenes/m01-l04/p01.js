// Change one thing at a time: drag the mass set to the spring's hook (or tap it) to hang 0 to 35 g,
// and Table 3 fills in as live text. "Swap spring" changes a second factor mid-run, and the new rows
// stop fitting the pattern. Table 3 values are the page's labels from Leo's layers.json.
import { add, handle, fontPx, tween, ease } from "../kit.js";
const MASS = [0, 5, 10, 15, 20, 25, 30, 35];
const L = [13.7, 14.1, 14.5, 14.9, 15.3, 15.7, 16.0, 16.4];
const STIFF = [13.7, 13.9, 14.1, 14.3, 14.5, 14.7, 14.9, 15.1]; // a stiffer spring (sandbox values, not from the book)
const HOOK = [370, 560], ROW = (i) => [162 + i * 72, 234 + i * 72];
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const cell = (x0, x1, i) => { const [y0, y1] = ROW(i); const c = fontPx(add(layer, "div", "p101-cell", [x0, y0 + 8, x1, y1 - 8], ""), 34); Object.assign(c.style, { position: "absolute", textAlign: "center", fontFamily: "\"Patrick Hand\", cursive", color: "#1F2F5C", lineHeight: "1.6" }); return c; };
  const mc = MASS.map((_, i) => cell(900, 1120, i)), lc = L.map((_, i) => cell(1130, 1350, i));
  const cap = fontPx(add(layer, "div", "cap", [60, 840, 760, 890], ""), 24); cap.hidden = true;
  let n = 0, swapped = -1;
  const len = (i) => (swapped >= 0 && i >= swapped ? STIFF[i] : L[i]);
  const show = () => MASS.forEach((m, i) => {
    mc[i].textContent = i < n ? String(m) : ""; lc[i].textContent = i < n ? len(i).toFixed(1) : "";
    lc[i].style.color = swapped >= 0 && i >= swapped && i < n ? "#B03A2E" : "#1F2F5C";
  });
  const hang = () => {
    if (n >= L.length) return say("Table 3 is full: 0 to 35 g. Look at the pattern in the length column.", true);
    n++; show(); cap.hidden = false; cap.textContent = `Hanging ${MASS[n - 1]} g: spring length ${len(n - 1).toFixed(1)} cm`;
    say(swapped >= 0 ? "Two things changed: the mass and the spring. You can't tell which one caused this length." : "Only the mass changed, so any change in length comes from the mass.", swapped < 0);
  };
  const B = art.box("mass-set"), c0 = [(B[0] + B[2]) / 2, B[1]];
  const back = (o) => tween(400, (t) => { const k = 1 - ease(t); art.set("mass-set", { dx: o[0] * k, dy: o[1] * k }); }, reduce);
  handle(ctx, B, "Mass set: drag it up to the spring's hook, or tap, to hang the next 5 g", {
    start: () => art.touched("mass-set"),
    move: (dx, dy) => art.set("mass-set", { dx, dy }),
    end: async (dx, dy) => {
      const tap = Math.hypot(dx, dy) < 12, near = Math.hypot(c0[0] + dx - HOOK[0], c0[1] + dy - HOOK[1]) < 220;
      let o = [dx, dy];
      if (tap) { o = [0, -40]; await tween(200, (t) => art.set("mass-set", { dy: -40 * ease(t) }), reduce); }
      if (tap || near) hang(); else say("Bring the masses up to the hook on the spring.");
      back(o);
    },
  });
  ui.button("Hang the next mass", hang);
  ui.button("Swap spring", () => { if (swapped >= 0) return; swapped = n; show(); say("Spring swapped mid-run. Keep adding mass and compare the red rows."); });
  ui.button("Start over", () => { n = 0; swapped = -1; show(); cap.hidden = true; say(""); });
  art.touchable(["mass-set"]);
  show();
  return { destroy() {} };
}

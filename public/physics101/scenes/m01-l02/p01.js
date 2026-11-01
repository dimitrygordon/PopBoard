// Pick the best model: drop the penny 1.0 m, read its measured ground speed, then tap the model card
// whose prediction is closest. A: speed grows steadily; B: speed curves up; C: speed levels off early.
import { add, handle, fontPx, svg, path, tween } from "../kit.js";
const CARDS = [
  { x: 963, name: "Model A", v: 4.4, note: "speed grows steadily" },
  { x: 1136, name: "Model B", v: 6.3, note: "speed curves up faster and faster" },
  { x: 1312, name: "Model C", v: 2.6, note: "speed levels off early" },
];
const MEASURED = 4.4; // m/s after falling 1.0 m (air resistance is tiny for a penny over this height)
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const coin = path(s, "", { fill: "#B5652B", stroke: "#6b3a17", "stroke-width": 3 });
  const out = fontPx(add(layer, "div", "cap", [560, 640, 900, 720], "Drop height: 1.0 m"), 26);
  const preds = CARDS.map((c) => { const e = fontPx(add(layer, "div", "cap", [c.x - 85, 380, c.x + 85, 430], ""), 22); e.style.textAlign = "center"; e.hidden = true; return e; });
  let dropped = false;
  const disk = (y) => coin.setAttribute("d", `M ${756 - 34} ${y} a 34 12 0 1 0 68 0 a 34 12 0 1 0 -68 0`);
  const drop = async () => {
    art.touched("penny"); if (dropped) return say("Already dropped. Now tap the model card that matches.");
    dropped = true; say("Falling...");
    await tween(700, (t) => disk(340 + 260 * t * t), reduce);
    out.textContent = `Measured speed at the ground: ${MEASURED} m/s`;
    CARDS.forEach((c, i) => { preds[i].hidden = false; preds[i].textContent = `predicts ${c.v} m/s`; });
    say("Compare the measurement with each model's prediction. Tap the best card.");
  };
  handle(ctx, art.box("penny"), "Penny: tap to drop it", { end: () => drop() }).addEventListener("click", drop);
  CARDS.forEach((c) => {
    handle(ctx, [c.x - 90, 440, c.x + 90, 730], `${c.name}: ${c.note}`, {}).addEventListener("click", () => {
      if (!dropped) return say("Drop the penny first, so you have a measurement to compare.");
      const ok = Math.abs(c.v - MEASURED) < 0.3;
      say(ok ? `${c.name} fits: its prediction matches your measurement. The data picked the best model.` : `${c.name} predicts ${c.v} m/s, but you measured ${MEASURED} m/s. The data rule it out.`, ok);
    });
  });
  art.touchable(["penny"]);
  ui.button("Drop the penny", drop);
  ui.button("Start over", () => { dropped = false; coin.setAttribute("d", ""); preds.forEach((e) => (e.hidden = true)); out.textContent = "Drop height: 1.0 m"; say(""); });
  return { destroy() {} };
}

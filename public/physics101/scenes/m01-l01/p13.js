// Pick or average: run random trials one at a time; compare cherry-picking the best trial (red ring) with
// the average of all of them (green line), and watch the average settle as trials add up.
import { add, fontPx } from "../kit.js";
const IDS = Array.from({ length: 12 }, (_, i) => "trial-" + String(i + 1).padStart(2, "0"));
const VAL = [5.11, 6.5, 3.88, 6.19, 4.69, 4.69, 7.28, 5.19, 4.95, 5.88, 6.35, 4.96];
const Y = (v) => 364 - (v - 5.11) * 24.88; // the graph's scale, from Leo's trial positions
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  let n = 0, mode = "avg";
  IDS.forEach((id) => art.show(id, false)); art.show("average-line", false); art.show("cherry-pick-ring", false);
  const out = fontPx(add(layer, "div", "cap", [870, 440, 1200, 500], "No trials yet."), 24);
  const draw = () => {
    const vs = VAL.slice(0, n), mean = vs.reduce((a, b) => a + b, 0) / (n || 1), best = vs.indexOf(Math.max(...vs));
    art.show("average-line", n > 0 && mode === "avg"); art.set("average-line", { dy: Y(mean) - 355 });
    const b = n ? art.box(IDS[best]) : null;
    art.show("cherry-pick-ring", n > 0 && mode === "best");
    if (b) art.set("cherry-pick-ring", { dx: (b[0] + b[2]) / 2 - 1039, dy: (b[1] + b[3]) / 2 - 309.5 });
    out.textContent = !n ? "No trials yet." : mode === "avg" ? `${n} trial${n > 1 ? "s" : ""}: average ${mean.toFixed(2)}` : `Best trial only: ${vs[best].toFixed(2)}`;
  };
  const trials = ui.button("Run a trial (0 of 12)", () => {
    if (n >= 12) return say("All 12 trials are done. More trials make the average more reliable.", true);
    art.show(IDS[n]); n++; draw(); trials.set(`Run a trial (${n} of 12)`);
    say(n < 3 ? "Keep going. One or two trials can mislead you." : "Watch the average: it moves less as the trials add up.");
  });
  ui.button("Pick the best trial", () => { mode = "best"; draw(); say(n ? "Picking one trial and ignoring the rest is bias. That best trial is far from the typical result." : "Run some trials first.", false); });
  ui.button("Average all trials", () => { mode = "avg"; draw(); say(n ? "Averaging every trial uses all of the evidence." : "Run some trials first.", true); });
  ui.button("Start over", () => { n = 0; IDS.forEach((id) => art.show(id, false)); trials.set("Run a trial (0 of 12)"); draw(); });
  return { destroy() {} };
}

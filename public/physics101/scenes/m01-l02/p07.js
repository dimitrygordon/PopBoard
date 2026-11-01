// Conversion chain: flip each factor until only the wanted unit is left. Runs on buttons (the factors
// are drawn on the page). Checks 1.34 kg = 1340 g and 43 km/h = 12 m/s.
import { add, fontPx } from "../kit.js";
const PROBLEMS = [
  { start: "1.34 kg", want: "1340 g", f: [["1000 g", "1 kg"]], ok: [true],
    value: (fl) => (fl[0] ? 1.34 * 1000 : 1.34 / 1000), unit: (fl) => (fl[0] ? "g" : "kg\u00b2/g") },
  { start: "43 km/h", want: "12 m/s", f: [["1000 m", "1 km"], ["1 h", "60 min"], ["1 min", "60 s"]], ok: [true, true, true],
    value: (fl) => 43 * (fl[0] ? 1000 : 1 / 1000) * (fl[1] ? 1 / 60 : 60) * (fl[2] ? 1 / 60 : 60), unit: (fl) => (fl.every(Boolean) ? "m/s" : "a mix of units that do not cancel") },
];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [300, 650, 1150, 800], ""), 28);
  let p = 0, flips = PROBLEMS.map((q) => q.f.map(() => false)); // false: the factor starts upside down
  const show = () => {
    const q = PROBLEMS[p], fl = flips[p];
    const parts = q.f.map((f, i) => (fl[i] ? `(${f[0]} / ${f[1]})` : `(${f[1]} / ${f[0]})`));
    cap.textContent = `${q.start} \u00d7 ${parts.join(" \u00d7 ")}`;
  };
  [0, 1, 2].forEach((i) => ui.button(`Flip factor ${i + 1}`, () => {
    if (i >= PROBLEMS[p].f.length) return say("This problem has only one factor.");
    flips[p][i] = !flips[p][i]; show(); say("");
  }));
  ui.button("Check", () => {
    const q = PROBLEMS[p], fl = flips[p], v = q.value(fl), good = fl.every((x, i) => x === q.ok[i]);
    const shown = p === 0 ? v.toPrecision(3) : v.toPrecision(2);
    say(good ? `Every unwanted unit cancels: ${q.start} = ${q.want}. Each factor equals one, so the amount never changed.` : `That leaves ${q.unit(fl)} (${shown}). Flip a factor so the unit you want to get rid of is on the opposite side.`, good);
  });
  ui.button("Next problem", () => { p = (p + 1) % PROBLEMS.length; show(); say(p ? "Chain three factors: kilometers, hours and minutes must all cancel." : "One factor: make the kilograms cancel."); });
  show(); say("One factor: make the kilograms cancel.");
  return { destroy() {} };
}

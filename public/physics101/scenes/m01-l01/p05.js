// Scientific methods flowchart: step cards start shuffled at the side; drag each into its slot. Then a
// test result comes back and the student picks which loop to follow.
import { handle, center, inside, shift, place } from "../kit.js";
const STEPS = ["State the problem.", "Gather information.", "Form a hypothesis.", "Test the hypothesis.", "Analyze data.", "Draw conclusions."];
// shuffled spots in the free right-hand column (top-left corner in page px), clear of the loop labels
// (one goes bottom left, so the Test it tab never covers a card)
const SPOT = { 4: [1210, 30], 1: [1210, 140], 6: [1210, 250], 3: [1210, 580], 5: [1210, 690], 2: [40, 640] };
const START = STEPS.map((_, i) => [SPOT[i + 1][0] - 622, SPOT[i + 1][1] - [14, 147, 277, 405, 528, 652][i]]);
export default function build(ctx) {
  const { art, ui, say } = ctx, ids = STEPS.map((_, i) => "step-" + (i + 1)), placed = new Set(), hs = [];
  ids.forEach((id, i) => {
    const home = art.box(id); let [ox, oy] = START[i];
    art.set(id, { dx: ox, dy: oy });
    const h = handle(ctx, shift(home, ox, oy), `Step card: ${STEPS[i]}`, {
      start: () => art.touched(id),
      move: (dx, dy) => art.set(id, { dx: ox + dx, dy: oy + dy }),
      end: (dx, dy) => {
        const c = center(shift(home, ox + dx, oy + dy)), slot = ids.findIndex((s) => inside(c, art.box(s)));
        if (slot === i) { ox = 0; oy = 0; placed.add(id); h.disabled = true; say(`Yes: step ${i + 1} is "${STEPS[i]}"`, true); }
        else if (slot >= 0) say(`Not that slot. "${STEPS[i]}" is not step ${slot + 1}.`, false);
        art.set(id, { dx: ox, dy: oy }); place(h, shift(home, ox, oy));
        if (placed.size === 6) say("The flowchart is complete. Now run the test: press a test result below.", true);
      },
    });
    hs.push(h);
  });
  art.touchable(ids);
  let result = null;
  ui.button("Test result: not supported", () => { result = "no"; say(placed.size < 6 ? "Finish the flowchart first." : "The hypothesis is not supported. Which loop do you follow?"); });
  ui.button("Test result: supported", () => { result = "yes"; say(placed.size < 6 ? "Finish the flowchart first." : "The hypothesis is supported. Which loop do you follow?"); });
  ui.button("Loop: Modify the hypothesis", () => say(!result ? "Get a test result first." : result === "no" ? "Right. Back to step 3: modify the hypothesis and test again." : "Not this one. A supported hypothesis is repeated several times, back to step 4.", result === "no"));
  ui.button("Loop: Repeat several times", () => say(!result ? "Get a test result first." : result === "yes" ? "Right. Back to step 4: repeat the test several times." : "Not this one. An unsupported hypothesis gets modified, back to step 3.", result === "yes"));
  return { destroy() {} };
}

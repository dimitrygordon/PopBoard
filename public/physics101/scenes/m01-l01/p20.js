// Testable or not? Drag each question card into a crate.
import { add, handle, fontPx, center, inside, shift, place } from "../kit.js";
const GREEN = [350, 470, 800, 800], RED = [830, 470, 1270, 800];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cards = [
    { id: "card-1", q: "Is pizza delicious?", testable: false },
    { id: "card-2", q: "Does a heavier ball fall faster?", testable: true },
  ];
  let done = 0;
  for (const c of cards) {
    const home = art.box(c.id); let ox = 0, oy = 0;
    c.reset = () => { ox = 0; oy = 0; art.set(c.id, { dx: 0, dy: 0, scale: 1 }); h.disabled = false; place(h, home); };
    const h = handle(ctx, home, `Question card: ${c.q}`, {
      start: () => art.touched(c.id),
      move: (dx, dy) => art.set(c.id, { dx: ox + dx, dy: oy + dy }),
      end: (dx, dy) => {
        const p = center(shift(home, ox + dx, oy + dy)), bin = inside(p, GREEN) ? true : inside(p, RED) ? false : null;
        if (bin === null) { art.set(c.id, { dx: ox, dy: oy }); return; }
        if (bin === c.testable) {
          const tgt = center(c.testable ? GREEN : RED); ox = tgt[0] - (home[0] + home[2]) / 2; oy = tgt[1] - 60 - (home[1] + home[3]) / 2;
          art.set(c.id, { dx: ox, dy: oy, scale: 0.7 }); place(h, shift(home, ox, oy)); h.disabled = true; done++;
          say(c.testable ? "Testable: you can drop two balls and measure." : "Not testable: it is an opinion. People disagree, and no experiment settles it.", true);
          if (done === cards.length) say("Both sorted. Science can only answer questions that can be tested.", true);
        } else { art.set(c.id, { dx: ox, dy: oy }); say(c.testable ? "Could you test it? Drop a heavy and a light ball and time them." : "Can an experiment prove a taste? That is an opinion.", false); }
      },
    });
  }
  art.touchable(cards.map((c) => c.id));
  ui.button("Start over", () => { for (const c of cards) c.reset(); done = 0; say(""); });
  return { destroy() {} };
}

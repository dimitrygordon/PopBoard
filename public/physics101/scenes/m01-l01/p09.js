// Sort the data: measurement cards (live text) are dragged onto the clipboard table; each row plots its
// point. Point 5 is the unexpected one: trying to delete it prompts the student to keep and record it.
import { add, handle, fontPx, place, shift, inside, center } from "../kit.js";
const DATA = [[1, "2.0"], [2, "4.1"], [3, "5.9"], [4, "8.2"], [5, "3.0"], [6, "12.1"]];
const TABLE = [140, 120, 640, 600];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx, cards = ["card-1", "card-2", "card-3"];
  for (let i = 1; i <= 6; i++) art.show("point-" + i, false);
  const head = fontPx(add(layer, "div", "live", [190, 150, 560, 185], "x        y"), 28); head.style.color = "#2c3e66";
  const rows = [];
  const label = new Map();
  // each card shows the next unsorted measurement
  const queue = DATA.map((d, i) => i);
  const txt = cards.map((id) => { const t = fontPx(add(layer, "div", "live card", art.box(id), ""), 20); return t; });
  const deal = () => cards.forEach((id, j) => { const i = queue[j]; label.set(id, i); txt[j].textContent = i == null ? "" : `x=${DATA[i][0]}\ny=${DATA[i][1]}`; txt[j].style.whiteSpace = "pre"; art.show(id, i != null); });
  deal();
  cards.forEach((id, j) => {
    const home = art.box(id);
    const h = handle(ctx, home, `Measurement card ${j + 1}`, {
      start: () => art.touched(id),
      move: (dx, dy) => { art.set(id, { dx, dy }); place(txt[j], shift(home, dx, dy)); },
      end: (dx, dy) => {
        const i = label.get(id);
        art.set(id, { dx: 0, dy: 0 }); place(txt[j], home);
        if (i == null || !inside(center(shift(home, dx, dy)), TABLE)) return;
        queue.splice(queue.indexOf(i), 1);
        const r = fontPx(add(layer, "div", "live", [200, 200 + rows.length * 52, 560, 240 + rows.length * 52], `${DATA[i][0]}        ${DATA[i][1]}`), 28);
        if (i === 4) r.style.color = "#b5473a";
        rows.push(r); art.show("point-" + (i + 1));
        say(i === 4 ? "That point does not fit the pattern. It is unexpected, so record it anyway." : `Recorded x=${DATA[i][0]}, y=${DATA[i][1]} and plotted it.`, true);
        if (!queue.length) say("Every result is in the table and on the graph, including the unexpected one.", true);
        deal();
      },
    });
  });
  art.touchable(cards);
  ui.button("Delete the odd point", () => say(rows.length && art.el("point-5").style.visibility !== "hidden" ? "Keep it! Record all of your results, even the unexpected ones. Many discoveries came from results nobody expected." : "Sort the cards first.", false));
  return { destroy() {} };
}

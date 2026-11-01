// Vector or scalar? Drag each card into a bin. Only 1.6 km north has a direction, so it is the one
// vector; it gets an arrow whose length matches its magnitude.
import { add, handle, fontPx, svg, path, follow, inside } from "../kit.js";
const BIN = { vector: [280, 100, 680, 260], scalar: [920, 100, 1320, 260] };
const CARDS = { card1: ["1.6 km", "scalar", "distance has size only"], card2: ["1.6 km north", "vector", "it has a size and a direction"], card3: ["20 degrees", "scalar", "a temperature has no direction"], card4: ["5 s", "scalar", "time has no direction"] };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const arrow = path(s, "", { stroke: "#B5473A", "stroke-width": 7 });
  const cap = fontPx(add(layer, "div", "cap", [300, 420, 1300, 480], "Drag each card into a bin."), 28); cap.style.textAlign = "center";
  const right = new Set(), H = {};
  for (const [id, [txt, kind, why]] of Object.entries(CARDS)) {
    const home = art.box(id), c = [(home[0] + home[2]) / 2, (home[1] + home[3]) / 2];
    const h = handle(ctx, home, `Card ${txt}: drag into the vector or scalar bin`, {
      start: () => art.touched(id),
      move: (dx, dy) => art.set(id, { dx, dy }),
      end: (dx, dy) => {
        const p = [c[0] + dx, c[1] + dy], bin = inside(p, BIN.vector) ? "vector" : inside(p, BIN.scalar) ? "scalar" : null;
        if (bin === kind) {
          const b = BIN[bin], slot = right.size, t = [b[0] + 100 + (slot % 2) * 200 - c[0], b[1] + 110 + (bin === "vector" ? 0 : (slot % 2) * 0) - c[1]];
          right.add(id); art.set(id, { dx: t[0], dy: t[1] }); follow(h, home, ...t);
          if (kind === "vector") arrow.setAttribute("d", "M 330 290 H 630 m -24 -16 l 24 16 l -24 16");
          say(`${txt}: ${kind}, because ${why}.`, true);
        } else { art.set(id, { dx: 0, dy: 0 }); follow(h, home); if (bin) say(`Not quite: ${txt} is a ${kind}, because ${why}.`); }
        cap.textContent = right.size === 4 ? "All sorted: one vector, three scalars." : `${right.size} of 4 sorted`;
      },
    });
    H[id] = { h, home };
  }
  ui.button("Start over", () => { right.clear(); arrow.setAttribute("d", ""); for (const id in H) { art.set(id, { dx: 0, dy: 0 }); follow(H[id].h, H[id].home); } cap.textContent = "Drag each card into a bin."; say(""); });
  art.touchable(Object.keys(CARDS));
  return { destroy() {} };
}

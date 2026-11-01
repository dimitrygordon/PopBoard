// Contact or field? Drag each force chip into a bin. Hand push, string pull and table support touch the
// system (contact); gravity and a magnet's pull act at a distance (field).
import { handle, follow, center, inside, caption } from "../kit.js";
const CH = ["chip0", "chip1", "chip2", "chip3", "chip4"], NAME = ["hand push", "string pull", "table support", "gravity", "magnet's pull"], KIND = [0, 0, 0, 1, 1];
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [1140, 780, 1580, 880], 22, "Drag each chip into a bin.");
  const bins = [art.box("bin0"), art.box("bin1")].map((b) => [b[0] - 60, b[1] - 50, b[2] + 60, b[3] + 50]), done = new Set();
  CH.forEach((id, i) => {
    const home = art.box(id), c = center(home); let at = [0, 0];
    const h = handle(ctx, home, `Force chip: ${NAME[i]}`, {
      start: () => art.touched(id),
      move: (dx, dy) => art.set(id, { dx: at[0] + dx, dy: at[1] + dy }),
      end: (dx, dy) => {
        const p = [c[0] + at[0] + dx, c[1] + at[1] + dy], b = bins.findIndex((x) => inside(p, x));
        if (b < 0) { art.set(id, { dx: at[0], dy: at[1] }); return; }
        if (b !== KIND[i]) { art.set(id, { dx: 0, dy: 0 }); at = [0, 0]; follow(h, home); say(`Not quite: ${NAME[i]} ${KIND[i] ? "acts without touching" : "touches the system"}.`, true); return; }
        at = [at[0] + dx, at[1] + dy]; follow(h, home, at[0], at[1]); done.add(i);
        cap.textContent = `${done.size} of 5 sorted`;
        say(done.size === 5 ? "All sorted. Contact forces touch the system; field forces act at a distance." : `Yes: ${NAME[i]} is a ${KIND[i] ? "field" : "contact"} force.`, true);
      },
    });
  });
  art.touchable(CH);
  return { destroy() {} };
}

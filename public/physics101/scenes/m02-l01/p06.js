// Stack the frames: drag each snapshot frame up onto the park scene. Stacked on one picture, the
// four snapshots become a motion diagram.
import { add, handle, fontPx, follow } from "../kit.js";
const IDS = ["frame1", "frame2", "frame3", "frame4"];
const SPOT = [[172, 430], [539, 430], [961, 430], [1383, 430]]; // above each runner in Leo's scene
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [760, 800, 1560, 880], "Drag the frames onto the scene."), 26);
  const done = new Set(), H = {};
  const tally = () => {
    cap.textContent = `${done.size} of 4 frames stacked`;
    if (done.size === 4) say("All four frames on one picture: that's a motion diagram, the runner's positions at equal time intervals.", true);
  };
  IDS.forEach((id, i) => {
    const home = art.box(id), c = [(home[0] + home[2]) / 2, (home[1] + home[3]) / 2]; let d = [0, 0];
    const h = handle(ctx, home, `Snapshot frame ${i + 1}: drag onto the scene`, {
      start: () => art.touched(id),
      move: (dx, dy) => { d = [dx, dy]; art.set(id, { dx, dy }); },
      end: () => {
        if (c[1] + d[1] < 760) { const [x, y] = SPOT[i]; d = [x - c[0], y - c[1]]; done.add(id); }
        else { d = [0, 0]; done.delete(id); }
        art.set(id, { dx: d[0], dy: d[1] }); follow(h, home, ...d); tally();
      },
    });
    H[id] = { h, home };
  });
  ui.button("Put the frames back", () => { done.clear(); for (const id of IDS) { art.set(id, { dx: 0, dy: 0 }); follow(H[id].h, H[id].home); } tally(); say(""); });
  art.touchable(IDS);
  tally(); cap.textContent = "Drag the frames onto the scene.";
  return { destroy() {} };
}

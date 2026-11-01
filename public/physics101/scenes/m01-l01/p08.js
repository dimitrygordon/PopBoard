// Control and test: change only the test ramp's height, press Go, and compare the roll with the control.
import { add, handle, fontPx, tween, ease } from "../kit.js";
const PIV = [1197, 500];           // the test ramp turns about its foot on the bench
const BOOKS = [2, 3, 4, 5];        // book stack heights; the control ramp stays on 3
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  let books = 3, busy = false;
  const ang = () => (books - 3) * -4; // degrees: more books, steeper ramp
  const rot = (x, y, a) => { const r = (a * Math.PI) / 180, dx = x - PIV[0], dy = y - PIV[1]; return [PIV[0] + dx * Math.cos(r) - dy * Math.sin(r), PIV[1] + dx * Math.sin(r) + dy * Math.cos(r)]; };
  const out = fontPx(add(layer, "div", "cap", [1180, 590, 1560, 650], ""), 24);
  const setBooks = (b) => {
    books = Math.max(2, Math.min(5, b));
    // the ramp art rotates about the foot; the ball rides along at the top
    const el = art.el("ramp-test"); if (el) el.style.transformOrigin = `${((PIV[0] - 812) / (1570 - 812)) * 100}% ${((PIV[1] - 283) / (581 - 283)) * 100}%`;
    art.set("ramp-test", { rot: ang() });
    const [x, y] = rot(891, 284, ang()); art.set("ball-test", { dx: x - 891, dy: y - 284, rot: 0 });
    slider.set(books); out.textContent = `Test ramp: ${books} books. Control: 3 books.`;
  };
  const slider = ui.slider({ label: "Test ramp height (books)", min: 2, max: 5, step: 1, value: 3, fmt: (v) => `${v} books` }, (v) => setBooks(v));
  let y0 = 0;
  handle(ctx, [812, 260, 1000, 400], "Test ramp top: move up or down to add or remove books", {
    start: () => { art.touched("ramp-test"); y0 = books; },
    move: (dx, dy) => setBooks(y0 + Math.round(-dy / 40)),
  });
  art.touchable(["ramp-test"]);
  // distance along the track grows with the drop height (energy, but the point here is one variable)
  const roll = (id, from, foot, run) => tween(1400, (t) => {
    const e = ease(t), a = Math.min(1, e * 2), b = Math.max(0, e * 2 - 1);
    const x = from[0] + (foot[0] - from[0]) * a + run * b, y = from[1] + (foot[1] - from[1]) * a;
    const bx = art.box(id); art.set(id, { dx: x - (bx[0] + bx[2]) / 2, dy: y - (bx[1] + bx[3]) / 2, rot: (x - from[0]) * 2 });
  }, reduce);
  ui.button("Go", async () => {
    if (busy) return; busy = true;
    const ctl = [175, 375], ctlFoot = [400, 500], tf = rot(891, 284, ang()), testFoot = [1197, 483];
    const base = 230, runT = Math.min(330, base * (books / 3));
    await Promise.all([roll("ball-control", ctl, ctlFoot, base), roll("ball-test", tf, testFoot, runT)]);
    say(books === 3 ? "Same height, same roll: with nothing changed, the two match." : `Only the height changed, so the difference (${books > 3 ? "farther" : "shorter"} roll) is the effect of that one change.`, true);
    busy = false;
  });
  ui.button("Reset balls", () => { art.set("ball-control", { dx: 0, dy: 0, rot: 0 }); setBooks(books); });
  setBooks(3);
  return { destroy() {} };
}

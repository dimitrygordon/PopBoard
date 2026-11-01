// Flight simulator: pick a paper airplane, fly it in the windscreen view, and compare flight distance and
// paper used (efficient or economical) before building anything. The numbers are this model's results.
import { handle, tween, ease } from "../kit.js";
const PLANES = {
  "plane-dart": { name: "Dart", m: 14, paper: 1 },
  "plane-glider": { name: "Glider", m: 21, paper: 1.5 },
  "plane-stubby": { name: "Stubby", m: 9, paper: 0.5 },
};
export default function build(ctx) {
  const { art, ui, say, reduce } = ctx, flown = new Map();
  let busy = false;
  const fly = async (id) => {
    if (busy) return; busy = true; art.touched(id);
    const p = PLANES[id], far = p.m / 21;
    await tween(1600, (t) => { const e = ease(t); art.set(id, { dx: e * 60 * far, dy: -e * 120 * far + Math.sin(t * Math.PI) * -20, scale: 1 - 0.75 * e * far }); }, reduce);
    flown.set(id, p);
    const per = (q) => (q.m / q.paper).toFixed(0);
    say(`${p.name}: flew ${p.m} m on ${p.paper} sheet${p.paper === 1 ? "" : "s"} of paper (${per(p)} m per sheet).` +
      (flown.size === 3 ? " Glider flies farthest; Stubby uses the least paper. Which is most efficient? Compare meters per sheet." : ""), true);
    setTimeout(() => { art.set(id, { dx: 0, dy: 0, scale: 1 }); busy = false; }, reduce ? 0 : 700);
  };
  for (const id of Object.keys(PLANES)) {
    handle(ctx, art.box(id), `Fly the ${PLANES[id].name}`, {}).addEventListener("click", () => fly(id));
    ui.button(`Fly the ${PLANES[id].name}`, () => fly(id));
  }
  art.touchable(Object.keys(PLANES));
  return { destroy() {} };
}

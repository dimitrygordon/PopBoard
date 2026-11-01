// Time interval: tap any two stopwatches. The first is t initial, the second t final, and the
// interval is their difference, a scalar with no direction.
import { add, handle, fontPx } from "../kit.js";
const W = { watch0: 0, watch5: 1, watch25: 5 }, WHERE = { watch0: "origin", watch5: "cactus", watch25: "lamppost" };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [400, 420, 1300, 520], "Tap a stopwatch for t initial."), 34); cap.style.textAlign = "center";
  let pick = [];
  const tap = (id) => {
    art.touched(id); pick.push(id); if (pick.length > 2) pick = [id];
    if (pick.length === 1) { cap.textContent = `t initial = ${W[id].toFixed(1)} s (${WHERE[id]}). Now tap t final.`; return; }
    const [a, b] = pick, d = W[b] - W[a];
    cap.textContent = `\u0394t = ${W[b].toFixed(1)} s \u2212 ${W[a].toFixed(1)} s = ${d.toFixed(1)} s`;
    say(d < 0 ? "Pick the earlier watch first: t final comes after t initial." : `${WHERE[a]} to ${WHERE[b]}: ${d.toFixed(1)} s. A time interval has size only, so it is a scalar.`, d > 0);
  };
  for (const id of Object.keys(W)) handle(ctx, art.box(id), `Stopwatch at the ${WHERE[id]}, ${W[id]} s`, {}).addEventListener("click", () => tap(id));
  ui.button("Start over", () => { pick = []; cap.textContent = "Tap a stopwatch for t initial."; say(""); });
  art.touchable(Object.keys(W));
  return { destroy() {} };
}

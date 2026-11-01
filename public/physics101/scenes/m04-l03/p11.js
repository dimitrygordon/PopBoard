// Normal force: a box weighing 100 N (sandbox value). Hand force -50 to +50 N (+ is a pull up). At rest,
// F_N = mg - F_hand.
import { caption, tapCut } from "../kit.js";
const CY = [0, 50, -50];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [1100, 620, 1590, 720], 22);
  let h = 0, c = 0;
  const show = (talk) => { const N = 100 - h; cap.textContent = `hand: ${h > 0 ? "pull up " + h : h < 0 ? "push down " + -h : "none, 0"} N\nF_N = 100 N \u2212 (${h} N) = ${N} N`; if (talk) say(h > 0 ? `Pulling up, the table pushes less: ${N} newtons.` : h < 0 ? `Pushing down, the table pushes more: ${N} newtons.` : "No hand: the normal force equals the weight, 100 newtons.", true); };
  const sl = ui.slider({ label: "Hand force", min: -50, max: 50, step: 10, value: 0, fmt: (v) => v + " N" }, (v) => { h = v; show(true); });
  tapCut(ctx, "push", "Pull up or push down", () => { c = (c + 1) % 3; h = CY[c]; sl.set(h); show(true); });
  ctx.art.touchable(["push"]); show(false);
  return { destroy() {} };
}

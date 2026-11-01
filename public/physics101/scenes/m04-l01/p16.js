// Force scale: step through Table 1 from a nickel (0.05 N) to a rocket engine (5,000,000 N).
// For each force it shows how many times bigger it is than the nickel.
import { caption, tapCut } from "../kit.js";
const T = [["gravity on a nickel", 0.05], ["gravity on a 0.45 kg bag of sugar", 4.4], ["gravity on a 70 kg person", 686], ["road on an accelerating car", 3000], ["a rocket engine", 5000000]];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = caption(layer, [960, 820, 1590, 895], 22);
  let i = 0, sl;
  const show = (talk) => { const [n, f] = T[i]; cap.textContent = `${n}: ${f.toLocaleString("en-US")} N\n${(f / 0.05).toLocaleString("en-US")} nickels' worth`; if (talk) say(`${n}: ${f.toLocaleString("en-US")} newtons.`, true); };
  sl = ui.slider({ label: "Force scale", min: 0, max: 4, step: 1, value: 0, fmt: (v) => T[v][0] }, (v) => { i = v; show(true); });
  tapCut(ctx, "slider", "Force scale: tap for the next force", () => { i = (i + 1) % T.length; if (sl && sl.set) sl.set(i); show(true); });
  ctx.art.touchable(["slider"]); show(false);
  return { destroy() {} };
}

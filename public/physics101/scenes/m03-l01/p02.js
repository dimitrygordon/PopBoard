// Jogger spacing: pick a motion type and the jogger runs it, leaving a dot at each equal time step.
import { svg, path, tween, caption, tapCut, NAVY } from "../kit.js";
const KINDS = {
  still: { xs: [0, 0, 0, 0, 0], say: "One spot every time: she is motionless." },
  constant: { xs: [0, 1, 2, 3, 4], say: "Equal spacing in equal times: constant velocity." },
  "speeding up": { xs: [0, 0.4, 1.0, 1.9, 3.2], say: "The gaps grow each step: she is speeding up." },
  "slowing down": { xs: [0, 1.3, 2.3, 2.9, 3.2], say: "The gaps shrink each step: she is slowing down." },
};
const X = (x, k) => 160 + (x / (k === "constant" ? 4 : 3.2)) * 1240, HOME = 1545, Y = 875;
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); const dots = path(s, "", { stroke: NAVY, "stroke-width": 18 });
  const cap = caption(layer, [1080, 770, 1480, 840], 24, "Pick a motion type.");
  let kind = "constant";
  const run = async () => {
    art.touched("jogger"); const k = KINDS[kind], xs = k.xs.map((x) => X(x, kind)); let d = "";
    for (let i = 0; i < xs.length; i++) {
      const from = i ? xs[i - 1] : xs[0];
      await tween(450, (u) => art.set("jogger", { dx: from + (xs[i] - from) * u - HOME }), reduce);
      d += `M ${xs[i]} ${Y} h 0.1 `; dots.setAttribute("d", d);
    }
    cap.textContent = `${kind}: ${xs.length} snapshots, 1 s apart`; say(k.say, true);
  };
  for (const k of Object.keys(KINDS)) ui.button(k[0].toUpperCase() + k.slice(1), () => { kind = k; run(); });
  tapCut(ctx, "jogger", "Jogger: tap to run the chosen motion", run);
  art.touchable(["jogger"]);
  return { destroy() {} };
}

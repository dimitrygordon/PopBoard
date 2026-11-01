// Free-body builder: pick the situation, then tap the dot to add each force arrow (blue, from the dot,
// length proportional to force). The ball is at rest, so the two arrows are equal. Toggle which way is positive.
import { svg, path, caption, tapCut, arrowD, BLUE } from "../kit.js";
const C = [1440, 690], L = 150;
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const ar = path(s, "", { stroke: BLUE, "stroke-width": 7 });
  const lab = [[C[0] - 330, C[1] + L - 50, C[0] - 20, C[1] + L], [C[0] - 330, C[1] - L, C[0] - 20, C[1] - L + 50]].map((b) => caption(layer, b, 20));
  const cap = caption(layer, [1120, 820, 1590, 890], 20);
  let sit = "hand", n = 0, up = true;
  const agent = () => (sit === "hand" ? "F_hand on ball" : "F_string on ball");
  const draw = () => {
    let d = ""; if (n >= 1) d += arrowD(C[0], C[1] + 10, C[0], C[1] + L, 16); if (n >= 2) d += " " + arrowD(C[0], C[1] - 10, C[0], C[1] - L, 16);
    ar.setAttribute("d", d);
    lab[0].textContent = `F_Earth on ball (${up ? "\u2212" : "+"})`; lab[1].textContent = `${agent()} (${up ? "+" : "\u2212"})`;
    lab.forEach((e, i) => (e.style.visibility = n > i ? "" : "hidden"));
    cap.textContent = `ball ${sit === "hand" ? "in a hand" : "on a string"}, ${up ? "up" : "down"} is +`;
  };
  const tap = () => { n = Math.min(2, n + 1); draw(); say(n === 1 ? "First the field force: Earth pulls the ball down." : `Then the contact force: ${agent().replace("_", " ")}, equal in length because the ball is at rest.`, true); };
  ui.button("Ball in a hand", () => { sit = "hand"; n = 0; draw(); });
  ui.button("Ball on a string", () => { sit = "string"; n = 0; draw(); });
  ui.button("Flip positive", () => { up = !up; draw(); });
  tapCut(ctx, "fbdot", "Free-body dot: tap to add the next force arrow", tap);
  art.touchable(["fbdot"]); draw();
  return { destroy() {} };
}

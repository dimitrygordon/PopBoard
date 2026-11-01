// Pick the system: each tap of the ring circles a different object as the system; everything else is the
// external world that can push or pull on it.
import { caption, tapCut } from "../kit.js";
const OBJ = ["the book", "the hand", "the string", "the table", "Earth"];
export default function build(ctx) {
  const { art, say, layer } = ctx;
  const cap = caption(layer, [940, 720, 1560, 860], 24);
  let i = 0;
  const show = (talk) => {
    cap.textContent = `system: ${OBJ[i]}\nexternal world: ${OBJ.filter((_, k) => k !== i).join(", ")}`;
    if (talk) say(`With ${OBJ[i]} as the system, the forces that matter are the ones the external world exerts on ${OBJ[i]}.`, true);
  };
  tapCut(ctx, "ring", "Selection ring: tap to circle the next object", () => { i = (i + 1) % OBJ.length; show(true); });
  art.touchable(["ring"]); show(false);
  return { destroy() {} };
}

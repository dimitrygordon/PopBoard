// Seatbelt: toggle the belt, then crash. The car stops at the wall; without the belt the box keeps moving.
import { svg, path, tween, caption, tapCut } from "../kit.js";
const Y = 860;
export default function build(ctx) {
  const { ui, say, layer, reduce } = ctx;
  const s = svg(layer); path(s, `M 640 ${Y - 60} V ${Y + 20}`, { stroke: "#1F2F5C", "stroke-width": 8 });
  const car = path(s, "", { stroke: "#E5C24A", "stroke-width": 30 }), box = path(s, "", { stroke: "#B5473A", "stroke-width": 22 });
  const cap = caption(layer, [80, 790, 620, 830], 20, "seatbelt: off");
  let belt = false;
  const at = (cx, bx) => { car.setAttribute("d", `M ${cx} ${Y} h 120`); box.setAttribute("d", `M ${bx} ${Y - 30} h 30`); };
  ui.button("Crash", async () => {
    await tween(1600, (u) => { const cx = Math.min(100 + u * 800, 520); const free = cx >= 520 && !belt; const bx = free ? Math.min(160 + u * 800, 720) : cx + 60; at(cx, bx); }, reduce);
    say(belt ? "Belted: the belt pulls the box back with the car, so both stop together." : "No belt: the car stops, but nothing pushes back on the box, so it keeps going. That is inertia.", true);
  });
  tapCut(ctx, "belt", "Seatbelt on or off", () => { belt = !belt; cap.textContent = `seatbelt: ${belt ? "on" : "off"}`; at(100, 160); });
  ctx.art.touchable(["belt"]); at(100, 160);
  return { destroy() {} };
}

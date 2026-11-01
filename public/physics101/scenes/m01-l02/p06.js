// Cancel the units: drop the m and s tiles above or below the fraction bar. m over s is a speed (green
// check); s over m, or both on one side, sets off the red alert.
import { add, handle, fontPx, center, shift } from "../kit.js";
const BAR_Y = 387, SLOT = { top: [496, 280, 656, 382], bot: [496, 392, 656, 494] };
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const pos = { "tile-m": "top", "tile-s": "bot" }; // where Leo drew them: already m over s
  const alert = fontPx(add(layer, "div", "cap", [300, 600, 900, 660], ""), 28);
  const check = () => {
    const m = pos["tile-m"], s = pos["tile-s"];
    if (!m || !s) { art.show("check", false); alert.textContent = "Drop both tiles into the fraction."; return; }
    const ok = m === "top" && s === "bot";
    art.show("check", ok);
    alert.textContent = ok ? "m/s: a speed. The units check out." : m === s ? `${m === "top" ? "m\u00b7s" : "1/(m\u00b7s)"}: not a speed. Stop! Check the units.` : "s/m: not a speed. Stop! Check the units.";
    alert.style.color = ok ? "#3F6B3A" : "#B03A2E";
    say(ok ? "Meters over seconds: this setup can give a speed." : "Wrong units for a speed. Something in the setup went wrong.", ok);
  };
  for (const id of ["tile-m", "tile-s"]) {
    const home = art.box(id); let ox = 0, oy = 0;
    const h = handle(ctx, home, `Unit tile ${id.slice(-1)}: drag above or below the fraction bar`, {
      start: () => art.touched(id),
      move: (dx, dy) => art.set(id, { dx: ox + dx, dy: oy + dy }),
      end: (dx, dy) => {
        const c = center(shift(home, ox + dx, oy + dy)); const side = c[1] < BAR_Y ? "top" : "bot";
        const slot = SLOT[side], tc = center(slot), hc = center(home);
        const other = id === "tile-m" ? "tile-s" : "tile-m";
        // two tiles on one side sit side by side
        const shiftX = pos[other] === side ? (id === "tile-m" ? -70 : 70) : 0;
        ox = tc[0] + shiftX - hc[0]; oy = tc[1] - hc[1]; pos[id] = side;
        art.set(id, { dx: ox, dy: oy }); h.style.left = ((home[0] + ox) / 16) + "%"; h.style.top = ((home[1] + oy) / 9) + "%"; check();
      },
    });
    ui.button(`Flip ${id.slice(-1)}`, () => { pos[id] = pos[id] === "top" ? "bot" : "top"; const hc = center(home), tc = center(SLOT[pos[id]]); art.set(id, { dx: tc[0] - hc[0], dy: tc[1] - hc[1] }); ox = tc[0] - hc[0]; oy = tc[1] - hc[1]; h.style.left = ((home[0] + ox) / 16) + "%"; h.style.top = ((home[1] + oy) / 9) + "%"; check(); });
  }
  art.touchable(["tile-m", "tile-s"]);
  check(); say("");
  return { destroy() {} };
}

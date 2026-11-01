// Calculator with a conscience: it shows the raw calculator result and only accepts it once it is
// rounded to the precision of the least-precise measurement. Runs on buttons (no cutouts on this page).
import { add, fontPx } from "../kit.js";
const Q = [
  { sum: "3.86 m + 2.4 m", raw: "6.26 m", opts: ["6.26 m", "6.3 m", "6 m"], ok: "6.3 m", why: "Adding: round to the least-precise place. 2.4 m only goes to tenths, so 6.3 m." },
  { sum: "409.2 km \u00f7 11.4 L", raw: "35.894736... km/L", opts: ["35.894 km/L", "35.9 km/L", "36 km/L"], ok: "35.9 km/L", why: "Dividing: keep the fewest significant figures. 11.4 L has three, so 35.9 km/L." },
];
export default function build(ctx) {
  const { ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [180, 640, 900, 760], ""), 30);
  let q = 0;
  const show = () => { cap.textContent = `${Q[q].sum}: calculator shows ${Q[q].raw}`; };
  const pick = (i) => () => {
    const o = Q[q].opts[i], ok = o === Q[q].ok;
    say(ok ? `Accepted: ${o}. ${Q[q].why}` : `Not accepted: ${o}. ${o === Q[q].opts[0] ? "That keeps more digits than your measurements support." : "That rounds away a digit you did measure."}`, ok);
  };
  const b = [0, 1, 2].map((i) => ui.button(Q[0].opts[i], pick(i)));
  ui.button("Next problem", () => { q = (q + 1) % Q.length; b.forEach((x, i) => x.set(Q[q].opts[i])); show(); say("Pick the correctly rounded answer."); });
  show(); say("Pick the correctly rounded answer.");
  return { destroy() {} };
}

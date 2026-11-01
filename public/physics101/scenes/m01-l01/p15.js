// Atom timeline: drag the knob across three stops; the active model stands out and the caption (the
// outline's own words) names what new research changed.
import { add, handle, fontPx } from "../kit.js";
const STOPS = [278, 794, 1309];
const ATOMS = ["atom-thomson", "atom-rutherford", "atom-cloud"];
const CAP = [
  "J. J. Thomson created a model of the atom made of electrons embedded in a ball of positive charge.",
  "In his model, the atom has a tiny, dense, positive nucleus at its center, with electrons around it.",
  "Today's model shows a nucleus of protons and neutrons, surrounded by an electron cloud.",
];
const NAME = ["Thomson's model", "Rutherford's model", "Today's model"];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const cap = fontPx(add(layer, "div", "cap", [180, 790, 1420, 880], ""), 30); cap.style.textAlign = "center";
  let at = 0;
  const go = (i, x) => {
    at = Math.max(0, Math.min(2, i));
    art.set("slider-knob", { dx: (x ?? STOPS[at]) - 278 });
    ATOMS.forEach((id, j) => { const el = art.el(id); if (el) el.style.opacity = j === at ? "" : "0.35"; });
    cap.textContent = CAP[at]; slider.set(at); h.setAttribute("aria-valuenow", String(at));
  };
  const slider = ui.slider({ label: "Timeline", min: 0, max: 2, step: 1, value: 0, fmt: (v) => NAME[v] }, (v) => go(v));
  const near = (x) => STOPS.reduce((b, s, i) => (Math.abs(s - x) < Math.abs(STOPS[b] - x) ? i : b), 0);
  let x0 = 278;
  const h = handle(ctx, [230, 700, 330, 790], "Timeline knob: move left or right", {
    start: () => { art.touched("slider-knob"); x0 = STOPS[at]; },
    move: (dx) => { const x = Math.max(278, Math.min(1309, x0 + dx)); art.set("slider-knob", { dx: x - 278 }); h.style.left = ((x - 48) / 16) + "%"; },
    end: (dx) => { const i = near(Math.max(278, Math.min(1309, x0 + dx))); go(i); h.style.left = ((STOPS[i] - 48) / 16) + "%"; say(`${NAME[i]}: new research, new model.`, true); },
  });
  h.setAttribute("role", "slider"); h.setAttribute("aria-valuemin", "0"); h.setAttribute("aria-valuemax", "2");
  art.touchable(["slider-knob"]);
  go(0);
  return { destroy() {} };
}

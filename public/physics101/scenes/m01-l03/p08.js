// Archery: tap the arrow to shoot a cluster of five gold hits at one target, then label it.
import { add, handle, fontPx, svg, path } from "../kit.js";
const T = [[557, 229], [1020, 229], [557, 616], [1020, 616]], R = 115;
const KIND = [
  { key: "both", label: "Accurate and precise", off: 0, spread: 12 },
  { key: "precise", label: "Precise, not accurate", off: 70, spread: 12 },
  { key: "accurate", label: "Accurate, not precise", off: 0, spread: 70 },
  { key: "neither", label: "Neither", off: 60, spread: 55 },
];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const hits = path(s, "", { fill: "#E2B654", stroke: "#1F2F5C", "stroke-width": 3 });
  const cap = fontPx(add(layer, "div", "cap", [1080, 785, 1440, 850], "Tap the arrow to shoot."), 24);
  let cur = null, n = 0, score = 0;
  handle(ctx, art.box("arrow"), "Arrow: tap to shoot a cluster", {}).addEventListener("click", () => {
    art.touched("arrow");
    cur = KIND[Math.floor(Math.random() * 4)]; const [cx, cy] = T[n++ % 4], a = Math.random() * 6.28;
    const ox = cx + Math.cos(a) * cur.off, oy = cy + Math.sin(a) * cur.off;
    hits.setAttribute("d", Array.from({ length: 5 }, (_, k) => { const b = k * 1.26 + a, r = cur.spread * (0.4 + 0.6 * ((k * 7) % 5) / 4); const x = Math.max(cx - R, Math.min(cx + R, ox + Math.cos(b) * r)), y = Math.max(cy - R, Math.min(cy + R, oy + Math.sin(b) * r)); return `M ${x - 9} ${y} a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0`; }).join(" "));
    cap.textContent = "Gold hits: how would you label them?"; say("Five shots landed. Is the cluster tight? Is it on the yellow center?");
  });
  KIND.forEach((k) => ui.button(k.label, () => {
    if (!cur) return say("Tap the arrow to shoot first.");
    if (k === cur) { score++; cap.textContent = `Right! Score: ${score}`; say(`Yes: ${k.label.toLowerCase()}. Tight clusters are precise; hits on the center are accurate.`, true); cur = null; }
    else say("Not quite. Check two things: how close together, and how close to the yellow center.");
  }));
  art.touchable(["arrow"]);
  return { destroy() {} };
}

// Every Joule energy3d scene (stores.js mountStores). Words come from story.json sceneText.
import { tapCut } from "../kit.js";
export default function build(ctx) {
  let live = null, gone = false;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;inset:0";
  ctx.layer.appendChild(host);
  (async () => {
    const story = await fetch(new URL("../../decks/m10-l02/v2/story.json", import.meta.url)).then((r) => r.json()).catch(() => null);
    const text = story?.slides?.["1"]?.sceneText || {};
    const mod = await import("../energy3d/stores.js").catch(() => null);
    if (gone) return;
    live = mod && mod.mountStores(host, text, { reduce: ctx.reduce });
    if (!live) { const p = document.createElement("p"); p.className = "e3d-fallback"; p.textContent = text.noWebgl || ""; host.appendChild(p); ctx.say(text.noWebgl || ""); }
  })();
  tapCut(ctx, "fw", "3D", () => { host.hidden = !host.hidden; });
  return { destroy() { gone = true; live?.dispose(); host.remove(); } };
}

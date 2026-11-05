// Every Joule Sim 5 (Kettle): 3D energy3d scene. Words come from story.json sceneText.
export default function build(ctx) {
  let live = null, gone = false;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;inset:0";
  ctx.layer.appendChild(host);
  (async () => {
    const story = await fetch(new URL("../../decks/m11-l01/v2/story.json", import.meta.url)).then((r) => r.json()).catch(() => null);
    const text = story?.slides?.["9"]?.sceneText || {};
    const mod = await import("../energy3d/heat.js").catch(() => null);
    if (gone) return;
    live = mod && mod.mountKettle(host, text, { reduce: ctx.reduce });
    if (!live) { const p = document.createElement("p"); p.className = "e3d-fallback"; p.textContent = text.noWebgl || ""; host.appendChild(p); ctx.say(text.noWebgl || ""); }
  })();
  return { destroy() { gone = true; live?.dispose(); host.remove(); } };
}

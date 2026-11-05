// Every Joule energy3d scene (spring.js mountSpring). Words come from story.json sceneText.
export default function build(ctx) {
  let live = null, gone = false;
  const host = document.createElement("div");
  host.style.cssText = "position:absolute;inset:0";
  ctx.layer.appendChild(host);
  (async () => {
    const story = await fetch(new URL("../../decks/m13-l01/v2/story.json", import.meta.url)).then((r) => r.json()).catch(() => null);
    const text = story?.slides?.["2"]?.sceneText || {};
    host.e3dPanel = await new Promise((ok) => { let n = 0; const t = () => { const b = document.querySelector("#tools .pop-ctl"); if (b || n++ > 40) ok(b); else setTimeout(t, 50); }; t(); });
    const mod = await import("../energy3d/spring.js").catch(() => null);
    if (gone) return;
    live = mod && mod.mountSpring(host, text, { reduce: ctx.reduce });
    if (!live) { const p = document.createElement("p"); p.className = "e3d-fallback"; p.textContent = text.noWebgl || ""; host.appendChild(p); ctx.say(text.noWebgl || ""); }
  })();
  return { destroy() { gone = true; live?.dispose(); host.e3dPanel?.querySelectorAll(".e3d-ui").forEach((e) => e.remove()); host.remove(); } };
}

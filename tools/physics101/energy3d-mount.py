#!/usr/bin/env python3
"""Mount an energy3d scene: write scenes/<slug>/pNN.js wrapper, add testIt + sceneText to story.json, add the page to the lesson test.
usage: energy3d-mount.py slug page module mountFn spec.json [cutId]   (spec.json = {"testIt": {...}, "sceneText": {...}})
With cutId, tapping Leo's cutout (kit tapCut) toggles the 3D layer so the drawn page stays reachable."""
import json, re, sys, pathlib
slug, page, module, fn, spec = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], json.load(open(sys.argv[5]))
cut = sys.argv[6] if len(sys.argv) > 6 else None
R = pathlib.Path(__file__).resolve().parents[2]
pn = f"p{page:02d}"
src = f'''// Every Joule energy3d scene ({module}.js {fn}). Words come from story.json sceneText.
{{imp}}export default function build(ctx) {{
  let live = null, gone = false;
  const host = document.createElement("div");
  host.className = "e3d-host"; host.style.cssText = "position:absolute;inset:0 0 var(--e3d-foot, 0) 0";
  ctx.layer.appendChild(host);
  (async () => {{
    const story = await fetch(new URL("../../decks/{slug}/v2/story.json", import.meta.url)).then((r) => r.json()).catch(() => null);
    const text = story?.slides?.["{page}"]?.sceneText || {{}};
{{lab}}    const mod = await import("../energy3d/{module}.js").catch(() => null);
    if (gone) return;
    live = mod && mod.{fn}(host, text, {{ reduce: ctx.reduce }});
    if (!live) {{ const p = document.createElement("p"); p.className = "e3d-fallback"; p.textContent = text.noWebgl || ""; host.appendChild(p); ctx.say(text.noWebgl || ""); }}
  }})();
{{tap}}  return {{ destroy() {{ gone = true; live?.dispose(); host.remove(); }} }};
}}
'''.replace('{imp}', 'import { tapCut } from "../kit.js";\n' if cut else '').replace('{lab}', '    tog.setAttribute("aria-label", text.toggle || "");\n' if cut else '').replace('{tap}', f'  const tog = tapCut(ctx, "{cut}", "", () => {{ host.hidden = !host.hidden; }});\n' if cut else '')
(R / f"public/physics101/scenes/{slug}/{pn}.js").write_text(src)
sp = R / f"public/physics101/decks/{slug}/v2/story.json"
s = json.loads(sp.read_text()); d = s["slides"][str(page)]
d["testIt"] = spec["testIt"]; d["sceneText"] = spec["sceneText"]
if cut: d["sceneText"].setdefault("toggle", "Show or hide the 3D model")
sp.write_text(json.dumps(s, ensure_ascii=False, indent=1) + "\n")
tp = R / f"tests/physics101-{slug}.test.mjs"; t = tp.read_text()
def add(key, src):
    m = re.search(key + r": \[([\d, ]*)\]", src)
    if not m: return src.replace("audio: true", f"{key}: [{page}], audio: true") if key == "buttonOnly" else src
    nums = sorted(set([int(x) for x in m.group(1).split(",") if x.strip()] + [page]))
    return src[:m.start()] + f"{key}: [{', '.join(map(str, nums))}]" + src[m.end():]
tp.write_text(add("buttonOnly", add("testIt", t)))
print("mounted", slug, pn)

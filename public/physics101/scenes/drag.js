// Physics 101 drag engine: one helper for every page with a drag spec from Leo (decks/<slug>/v2/drag.json,
// compiled from layers.json interaction.for_turing by tools/physics101/build-drag.py). Nothing here is per page.
//   pointer: mouse, pen and touch drag a cutout (lifted, shadow widened); a drop within spec.snap px of a target
//            snaps onto it, a miss stays put (or springs home when the spec says so)
//   keyboard: Tab to an object; arrows move spec.step px (Shift spec.bigStep); Enter drops, or with no move
//            places it on the next free target (select and place); Esc sends it home
//   screen readers: each object is a labelled button; moves are announced in a polite live region
//   reduce motion: no lift, no easing; touch targets are never smaller than 44 CSS px
// A scene can listen and steer: ctx.drag.on("drop", (id, target, pos) => ...), ctx.drag.place(id, targetId),
// ctx.drag.setTarget(id, [x, y]), ctx.drag.addTarget({ id, label, box }), ctx.drag.home(id), ctx.drag.reset().
import { W, H, toPage, tween, ease, clamp, center } from "./kit.js";

const pct = (v, of) => (v / of) * 100 + "%";

export function createDrag(ctx, spec) {
  const { art, layer, stage, reduce } = ctx;
  const ev = { pick: [], move: [], drop: [], home: [] }, emit = (k, ...a) => ev[k].forEach((f) => f(...a));
  const items = spec.items.filter((i) => art.box(i.id)).map((i) => ({ ...i, home: art.box(i.id), at: null, on: null, btn: null }));
  const targets = spec.targets.filter((t) => t.box).map((t) => ({ ...t, pt: [...t.at] }));
  const byId = (id) => items.find((i) => i.id === id), tg = (id) => targets.find((t) => t.id === id);
  let live = null, mounted = false, grab = null;
  // the object under a page point: inside its drawn box first, else the nearest centre within 60 page px
  const pickAt = (p) => {
    let best = null, bd = Infinity;
    for (const o of items) { const d = o.at || [0, 0], b = o.home, x0 = b[0] + d[0], y0 = b[1] + d[1], x1 = b[2] + d[0], y1 = b[3] + d[1]; const dist = Math.hypot(Math.max(x0 - p[0], 0, p[0] - x1), Math.max(y0 - p[1], 0, p[1] - y1)); if (dist < bd) { best = o; bd = dist; } }
    return bd <= 60 ? best : null;
  };
  const announce = (msg) => { if (live) { live.textContent = ""; setTimeout(() => (live.textContent = msg), 30); } };
  // anchor: the point of an object that hooks onto a target (its top middle for "top" targets, else its centre)
  const anchor = (it, t, d = it.at || [0, 0]) => { const b = it.home, c = center(b); return t && t.anchor === "top" ? [c[0] + d[0], b[1] + d[1]] : [c[0] + d[0], c[1] + d[1]]; };
  const offsetFor = (it, t) => { const a = anchor(it, t, [0, 0]); return [t.pt[0] - a[0], t.pt[1] - a[1]]; };
  const clampD = (it, d) => { const b = it.home; return [clamp(d[0], -b[0], W - b[2]), clamp(d[1], -b[1], H - b[3])]; };
  const paint = (it, d, lifted) => {
    it.at = d; art.set(it.id, { dx: d[0], dy: d[1] - (lifted && !reduce ? spec.lift : 0) });
    const el = art.el(it.id); if (el) el.classList.toggle("drag-lift", !!lifted && !reduce);
    if (it.btn) { const b = it.home; Object.assign(it.btn.style, { left: pct((b[0] + b[2]) / 2 + d[0], W), top: pct((b[1] + b[3]) / 2 + d[1], H) }); }
  };
  const glide = (it, to) => { const from = it.at || [0, 0]; return tween(spec.ease, (t) => { const k = ease(t); paint(it, [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k], false); }, reduce); };
  const nearest = (it, d) => {
    let best = null, bd = Infinity;
    for (const t of targets) { const a = anchor(it, t, d), dist = Math.hypot(a[0] - t.pt[0], a[1] - t.pt[1]); const inBox = a[0] >= t.box[0] - spec.snap && a[0] <= t.box[2] + spec.snap && a[1] >= t.box[1] - spec.snap && a[1] <= t.box[3] + spec.snap; if ((dist <= spec.snap || inBox) && dist < bd) { best = t; bd = dist; } }
    return best;
  };
  const label = (it) => it.label.charAt(0).toUpperCase() + it.label.slice(1);
  async function place(id, tid) {
    const it = byId(id), t = tg(tid); if (!it || !t) return;
    if (spec.oneAtATime) for (const o of items) if (o !== it && o.on === tid) await home(o.id, true);
    it.on = tid; await glide(it, offsetFor(it, t)); syncAria(it);
    announce(`${label(it)} is on the ${t.label}.`); emit("drop", id, tid, anchor(it, t));
  }
  async function home(id, quiet) {
    const it = byId(id); if (!it) return; const was = it.on; it.on = null; await glide(it, [0, 0]); syncAria(it);
    if (!quiet) announce(`${label(it)} is back in its place.`); emit("home", id, was);
  }
  const syncAria = (it) => { if (!it.btn) return; const t = it.on && tg(it.on); it.btn.setAttribute("aria-label", `${label(it)}${t ? `, on the ${t.label}` : ""}. Drag${targets.length ? ` onto the ${targets.map((x) => x.label).join(" or ")}` : ""}, or press Enter to ${targets.length ? "place it" : "drop it"}; arrow keys move it, Escape sends it back.`); };
  async function drop(it, d) {
    const t = nearest(it, d);
    if (t) return place(it.id, t.id);
    if (it.on) { const was = it.on; it.on = null; emit("home", it.id, was); }
    if (!spec.stayWhereDropped && targets.length) return home(it.id);
    paint(it, d, false); syncAria(it); announce(`${label(it)} dropped.`); emit("drop", it.id, null, anchor(it, null, d));
  }
  function mount() {
    if (mounted) return api; mounted = true;
    live = document.createElement("div"); live.className = "sr-only"; live.setAttribute("aria-live", "polite"); layer.appendChild(live);
    const ours = new Set(items.map((i) => i.id));
    // a cutout the scene already moves with its own handle (along a curve, a tap) keeps it: the scene's
    // physics stays wired to it. The engine drags every other cutout the spec names.
    const own = (it) => { const e = art.el(it.id); if (!e) return false; const q = e.getBoundingClientRect(); return [...layer.querySelectorAll(".hit:not(.drag-hit)")].some((h) => { const r = h.getBoundingClientRect(), ov = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top)); return r.width && ov > 0.5 * Math.min(r.width * r.height, q.width * q.height || 1); }); };
    for (let i = items.length - 1; i >= 0; i--) if (own(items[i])) items.splice(i, 1);
    for (const it of items) {
      const b = it.home, btn = document.createElement("button"); btn.type = "button"; btn.className = "hit drag-hit"; it.btn = btn;
      // at least 44 CSS px on each side, centred on the cutout
      Object.assign(btn.style, { width: `max(44px, ${pct(b[2] - b[0], W)})`, height: `max(44px, ${pct(b[3] - b[1], H)})`, transform: "translate(-50%, -50%)" });
      paint(it, [0, 0], false); syncAria(it); layer.appendChild(btn);
      let kd = null;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault(); e.stopPropagation();
        // 44 px handles overlap on small stages: grab the object nearest the finger, not the top button
        const p = toPage(stage, e), o = pickAt(p) || it; btn.setPointerCapture(e.pointerId);
        grab = { it: o, btn, p0: p, d0: o.at || [0, 0], moved: false }; o.btn.classList.add("dragging"); art.touched(o.id); emit("pick", o.id);
      });
      btn.addEventListener("pointermove", (e) => { if (!grab || grab.btn !== btn) return; const g = grab, p = toPage(stage, e), d = clampD(g.it, [g.d0[0] + p[0] - g.p0[0], g.d0[1] + p[1] - g.p0[1]]); if (Math.hypot(p[0] - g.p0[0], p[1] - g.p0[1]) > 6) g.moved = true; if (g.moved) { paint(g.it, d, true); emit("move", g.it.id, anchor(g.it, null, d)); } });
      const up = (e) => { if (!grab || grab.btn !== btn) return; const g = grab; grab = null; const p = toPage(stage, e); g.it.btn.classList.remove("dragging"); const d = clampD(g.it, [g.d0[0] + p[0] - g.p0[0], g.d0[1] + p[1] - g.p0[1]]); if (g.moved) drop(g.it, d); else keyPlace(g.it); };
      btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up);
      btn.addEventListener("click", (e) => e.stopPropagation());
      btn.addEventListener("keydown", (e) => {
        const s = e.shiftKey ? spec.bigStep : spec.step, k = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
        if (k) { e.preventDefault(); art.touched(it.id); if (!kd) { kd = it.at || [0, 0]; emit("pick", it.id); } kd = clampD(it, [kd[0] + k[0], kd[1] + k[1]]); paint(it, kd, true); emit("move", it.id, anchor(it, null, kd)); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); art.touched(it.id); if (kd) { const d = kd; kd = null; drop(it, d); } else keyPlace(it); }
        else if (e.key === "Escape") { e.preventDefault(); kd = null; home(it.id); }
      });
    }
    art.touchable(items.map((i) => i.id));
    api.count = items.length;
    return api;
  }
  // tap or Enter with no move: place on the next free target (the page's only target, usually); on it already: send home
  function keyPlace(it) {
    if (!targets.length) return announce(`${label(it)}: use the arrow keys to move it, then Enter to drop it.`);
    if (it.on) return home(it.id);
    const free = targets.find((t) => !items.some((o) => o.on === t.id)) || targets[0]; return place(it.id, free.id);
  }
  const api = {
    spec, items, targets, mount, place, home,
    on(k, f) { ev[k].push(f); return api; },
    reset() { return Promise.all(items.map((i) => home(i.id, true))); },
    where: (id) => (byId(id) || {}).on || null,
    // a drop zone drawn in the scene art rather than cut out (a balance pan, a cylinder): call before mount
    addTarget(t) { targets.push({ anchor: "center", at: center(t.box), ...t, pt: [...(t.at || center(t.box))] }); return api; },
    // move a target's snap point (a stretching spring's hook); objects on it ride along
    setTarget(id, pt) { const t = tg(id); if (!t) return; t.pt = pt; for (const it of items) if (it.on === id) paint(it, offsetFor(it, t), false); },
  };
  return api;
}

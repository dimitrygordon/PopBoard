// PopBoard shared fun layer: DOM helpers. Plain JS, no frameworks.
// Adds no halos or outlines; art halos are baked into the module images.
import { TIERS } from "./fun-core.js";
export * from "./fun-core.js";

const mq = (q) => (typeof matchMedia === "function" ? matchMedia(q) : { matches: false, addEventListener() {} });
export const prefers = {
  get reducedMotion() { return mq("(prefers-reduced-motion: reduce)").matches; },
  get reducedTransparency() { return mq("(prefers-reduced-transparency: reduce)").matches; },
  get moreContrast() { return mq("(prefers-contrast: more)").matches; }
};

// Mark <html> so fun.css can key off preferences even where the media query is unsupported.
export function initFun() {
  const root = document.documentElement;
  root.classList.add("fun");
  const set = () => {
    root.classList.toggle("fun-rm", prefers.reducedMotion);
    root.classList.toggle("fun-rt", prefers.reducedTransparency);
    root.classList.toggle("fun-hc", prefers.moreContrast);
  };
  set();
  for (const q of ["(prefers-reduced-motion: reduce)", "(prefers-reduced-transparency: reduce)", "(prefers-contrast: more)"])
    mq(q).addEventListener?.("change", set);
}

// Instant press feedback on pointerdown (CSS does the 0.97 scale on .fun-pressed / :active).
export function pressFeedback(root = document) {
  const clear = () => { for (const el of root.querySelectorAll(".fun-pressed")) el.classList.remove("fun-pressed"); };
  root.addEventListener("pointerdown", (e) => {
    const el = e.target.closest?.("button, [data-press]");
    if (el && !el.disabled) el.classList.add("fun-pressed");
  }, { passive: true });
  for (const ev of ["pointerup", "pointercancel", "pointerleave"]) root.addEventListener(ev, clear, { passive: true });
}

// Smooth theme switch (~250 ms). Call before changing data-theme.
export function smoothTheme() {
  if (prefers.reducedMotion) return;
  const root = document.documentElement;
  root.classList.add("fun-theme-anim");
  clearTimeout(smoothTheme._t);
  smoothTheme._t = setTimeout(() => root.classList.remove("fun-theme-anim"), 300);
}

// Critically damped-ish spring step. state {x, v}; returns new state.
export function springStep(s, target, dt, { response = 0.35, damping = 1.0 } = {}) {
  const k = (2 * Math.PI / response) ** 2, c = 4 * Math.PI * damping / response;
  const a = -k * (s.x - target) - c * s.v;
  const v = s.v + a * dt;
  return { x: s.x + v * dt, v };
}
// Rubber band past [min,max] (Apple-style).
export function rubberBand(x, min, max, dim = 100, c = 0.55) {
  if (x < min) return min - (1 - 1 / ((min - x) * c / dim + 1)) * dim;
  if (x > max) return max + (1 - 1 / ((x - max) * c / dim + 1)) * dim;
  return x;
}
// Where a flick would come to rest (UIScrollView deceleration d = 0.998 per ms).
export function project(v, d = 0.998) { return (v / 1000) * d / (1 - d); }

// Pointer drag with 1:1 grab offset, pointer capture, release velocity and spring-back edges.
// opts: { bounds:{min:{x,y},max:{x,y}}, onMove({x,y}), onRelease({x,y,vx,vy}) , get():{x,y} }
export function dragHelper(el, opts) {
  let grab = null, last = null, vel = { x: 0, y: 0 }, raf = 0;
  const b = opts.bounds;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => {
    cancelAnimationFrame(raf);
    el.setPointerCapture?.(e.pointerId);
    const p = opts.get();
    grab = { dx: e.clientX - p.x, dy: e.clientY - p.y };
    last = { x: e.clientX, y: e.clientY, t: performance.now() }; vel = { x: 0, y: 0 };
  });
  el.addEventListener("pointermove", (e) => {
    if (!grab) return;
    const now = performance.now(), dt = Math.max(1, now - last.t);
    vel = { x: 0.8 * ((e.clientX - last.x) / dt * 1000) + 0.2 * vel.x, y: 0.8 * ((e.clientY - last.y) / dt * 1000) + 0.2 * vel.y };
    last = { x: e.clientX, y: e.clientY, t: now };
    let x = e.clientX - grab.dx, y = e.clientY - grab.dy;
    if (b) { x = rubberBand(x, b.min.x, b.max.x); y = rubberBand(y, b.min.y, b.max.y); }
    opts.onMove({ x, y });
  });
  const end = () => {
    if (!grab) return; grab = null;
    opts.onRelease?.({ ...opts.get(), vx: vel.x, vy: vel.y });
    if (!b) return;
    const p = opts.get();
    const tgt = { x: Math.min(b.max.x, Math.max(b.min.x, p.x)), y: Math.min(b.max.y, Math.max(b.min.y, p.y)) };
    if (tgt.x === p.x && tgt.y === p.y) return;
    if (prefers.reducedMotion) { opts.onMove(tgt); return; }
    let sx = { x: p.x, v: vel.x }, sy = { x: p.y, v: vel.y }, prev = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.032, (now - prev) / 1000); prev = now;
      sx = springStep(sx, tgt.x, dt); sy = springStep(sy, tgt.y, dt);
      opts.onMove({ x: sx.x, y: sy.x });
      if (Math.abs(sx.x - tgt.x) + Math.abs(sy.x - tgt.y) > 0.3 || Math.abs(sx.v) + Math.abs(sy.v) > 5) raf = requestAnimationFrame(tick);
      else opts.onMove(tgt);
    };
    raf = requestAnimationFrame(tick);
  };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
}

// Live slider binding: fires on every input event, no Apply button.
export function bindSlider(input, onValue) {
  const f = () => onValue(Number(input.value));
  input.addEventListener("input", f);
  return f;
}

// Frosted bottom sheet: toggles .fun-sheet; fun.css provides blur + solid fallback.
export function frostedSheet(el, on = true) { el.classList.toggle("fun-sheet", on); }

// ---------- feedback trio ----------
const SOUND_KEY = "popboard.fun.sound";
export const sound = {
  get on() { try { return localStorage.getItem(SOUND_KEY) === "on"; } catch (e) { return false; } }, // off by default
  set on(v) { try { localStorage.setItem(SOUND_KEY, v ? "on" : "off"); } catch (e) {} }
};
let actx = null;
export function tick(freq = 880) {
  if (!sound.on) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.frequency.value = freq; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.09);
  } catch (e) {}
}
export function buzz(ms = 10) { try { navigator.vibrate?.(ms); } catch (e) {} }
export function celebrate() { tick(); buzz(10); }

// ---------- challenge card UI ----------
// Renders Bronze/Silver/Gold chips into `host`. Returns { update(earned), flash(tier) }.
export function challengeCard(host, goals) {
  host.classList.add("fun-card");
  host.replaceChildren();
  const h = document.createElement("p"); h.className = "fun-card-title"; h.textContent = "Challenges";
  const ul = document.createElement("ul"); ul.className = "fun-goals";
  const items = {};
  for (const g of goals) {
    const li = document.createElement("li"); li.className = "fun-goal"; li.dataset.tier = g.tier;
    const m = document.createElement("span"); m.className = "fun-medal"; m.setAttribute("aria-hidden", "true");
    const t = document.createElement("span"); t.textContent = `${g.tier[0].toUpperCase()}${g.tier.slice(1)}: ${g.title}`;
    li.append(m, t); ul.appendChild(li); items[g.tier] = li;
  }
  const streak = document.createElement("p"); streak.className = "fun-streak"; streak.setAttribute("aria-live", "polite");
  host.append(h, ul, streak);
  return {
    update(earned) { for (const t of TIERS) if (items[t]) { items[t].classList.toggle("earned", earned.includes(t)); items[t].setAttribute("aria-label", `${t} ${earned.includes(t) ? "earned" : "not yet"}`); } },
    flash(tier) {
      const li = items[tier]; if (!li) return;
      li.classList.remove("pop"); void li.offsetWidth; li.classList.add("pop");
      celebrate();
    },
    streak(n, best) { streak.textContent = n > 0 ? `Streak ${n} (best ${best})` : best ? `Best streak ${best}. Next one starts now.` : ""; }
  };
}

// Copy a share link with state in the hash.
export async function shareLink(hash) {
  const url = location.href.replace(/#.*$/, "") + hash;
  history.replaceState(null, "", hash);
  try { await navigator.clipboard.writeText(url); return { url, copied: true }; } catch (e) { return { url, copied: false }; }
}

// ---------- mobile bottom sheet with snap points ----------
// el: fixed-position sheet. handle: grab element. getSnaps(): ascending heights in px.
// halfUnder (optional): the caption element the half stop should sit right under.
// Snaps are re-measured after first layout, font load, resize, rotation and content size changes,
// not only at creation (the half stop used to be measured once, before the caption had settled).
// Animation is transform-only (translateY) so drag stays on the compositor.
import { pickSnap } from "./fun-core.js";
import { halfUnder as halfUnderCaption } from "../layout/layout.js";
export function bottomSheet(el, handle, { getSnaps: snapsFn, onSnap, start = 0, halfUnder = null } = {}) {
  const getSnaps = () => {
    const s = snapsFn();
    if (halfUnder && s.length >= 3) s[1] = halfUnderCaption(typeof halfUnder === "function" ? halfUnder() : halfUnder, s[0], s[s.length - 1]);
    return s;
  };
  let snaps = getSnaps(), idx = start, h = snaps[idx], raf = 0, drag = null;
  const maxH = () => snaps[snaps.length - 1];
  const render = () => { el.style.transform = `translate3d(0, ${Math.round((maxH() - h) * 10) / 10}px, 0)`; };
  const layout = () => { snaps = getSnaps(); el.style.height = maxH() + "px"; h = snaps[Math.min(idx, snaps.length - 1)]; render(); };
  const settle = (to, bounce) => {
    cancelAnimationFrame(raf);
    const target = snaps[to]; idx = to;
    el.dataset.snap = ["peek", "half", "full"][to] || String(to);
    onSnap?.(to);
    if (prefers.reducedMotion) { h = target; render(); return; }
    let s = { x: h, v: drag?.v || 0 }, prev = performance.now();
    const opt = bounce ? { response: 0.4, damping: 0.72 } : { response: 0.32, damping: 1.0 };
    const step = (now) => {
      const dt = Math.min(0.032, (now - prev) / 1000); prev = now;
      s = springStep(s, target, dt, opt); h = Math.min(maxH() + 24, s.x); render();
      if (Math.abs(s.x - target) > 0.4 || Math.abs(s.v) > 8) raf = requestAnimationFrame(step); else { h = target; render(); }
    };
    raf = requestAnimationFrame(step);
  };
  handle.addEventListener("pointerdown", (e) => {
    cancelAnimationFrame(raf); handle.setPointerCapture?.(e.pointerId);
    drag = { y0: e.clientY, h0: h, ly: e.clientY, lt: performance.now(), v: 0 };
    el.classList.add("fun-sheet-dragging");
  });
  handle.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.v = 0.8 * ((drag.ly - e.clientY) / dt * 1000) + 0.2 * drag.v; drag.ly = e.clientY; drag.lt = now;
    const raw = drag.h0 + (drag.y0 - e.clientY);
    h = rubberBand(raw, snaps[0], maxH(), 80); render();
  });
  const end = () => {
    if (!drag) return;
    el.classList.remove("fun-sheet-dragging");
    const r = pickSnap(snaps, h, drag.v);
    if (Math.abs(drag.y0 - drag.ly) < 4) r.index = (idx + 1) % snaps.length; // tap cycles
    settle(r.index, r.flicked && !prefers.reducedMotion); drag = null;
  };
  handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); settle(Math.min(snaps.length - 1, idx + 1)); }
    if (e.key === "ArrowDown") { e.preventDefault(); settle(Math.max(0, idx - 1)); }
  });
  layout(); settle(idx, false);
  // Re-measure once things settle. Skip while dragging or springing so a snap never jumps mid-gesture.
  let relayoutRaf = 0, alive = true;
  const relayout = () => {
    if (!alive || relayoutRaf) return;
    relayoutRaf = requestAnimationFrame(() => {
      relayoutRaf = 0; if (!alive) return;
      if (drag) return;
      const before = snaps.join(",");
      snaps = getSnaps(); if (snaps.join(",") === before) return;
      cancelAnimationFrame(raf); el.style.height = maxH() + "px"; h = snaps[Math.min(idx, snaps.length - 1)]; render();
    });
  };
  requestAnimationFrame(() => requestAnimationFrame(relayout));
  document.fonts?.ready?.then(relayout);
  addEventListener("resize", relayout, { passive: true });
  addEventListener("orientationchange", relayout);
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(relayout) : null;
  if (ro) { for (const c of el.children) ro.observe(c); ro.observe(document.documentElement); }
  return { layout, relayout, snapTo: (i) => settle(i, false), get index() { return idx; },
    destroy() { alive = false; ro?.disconnect(); removeEventListener("resize", relayout); removeEventListener("orientationchange", relayout);
      cancelAnimationFrame(raf); cancelAnimationFrame(relayoutRaf); el.style.transform = ""; el.style.height = ""; delete el.dataset.snap; } };
}

// Accessible disclosure: button toggles a region, keeps aria-expanded in sync.
export function disclosure(btn, region, open = false) {
  const set = (v) => { btn.setAttribute("aria-expanded", String(v)); region.hidden = !v; };
  btn.setAttribute("aria-controls", region.id); set(open);
  btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
  return { set };
}

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

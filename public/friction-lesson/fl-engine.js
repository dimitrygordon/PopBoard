// Timeline helpers for the Friction Lesson storyboard. Every page builds its DOM, then queues
// Web Animations with delays measured in seconds from page enter. Pure helpers are exported for tests.
export const EASE = { out: "cubic-bezier(.33,1,.68,1)", inout: "ease-in-out", linear: "linear", back: "cubic-bezier(.34,1.56,.64,1)", inQuad: "cubic-bezier(.11,0,.5,0)" };
export const ART = "friction-lesson/art/";

// Spring scale: reading 0 N sits at 23.9% of scale_body width, 20 N at 75.2%.
export const NEEDLE_0 = 23.9, NEEDLE_20 = 75.2;
export function needleX(reading) {
  const r = Math.max(0, Math.min(20, reading));
  return NEEDLE_0 + (NEEDLE_20 - NEEDLE_0) * (r / 20);
}

// Layer bounding boxes measured from the PNGs (fractions of the shared canvas), so every wipe
// starts and ends exactly where the pencil line does.
export const STATIC_BOX = { // canvas 1680 x 1200
  seg1_rise: [238 / 1680, 785 / 1680], seg2_drop: [770 / 1680, 844 / 1680], seg3_kinetic: [830 / 1680, 1584 / 1680],
  label_max: [244 / 1680, 1224 / 1680], rise_origin: [238 / 1680, 997 / 1200], peak: [778.5 / 1680, 318.5 / 1200],
};
export const KINETIC_BOX = { bestfit: [363 / 1320, 1191 / 1320], rise_run: [519 / 1320, 1094 / 1320], aim: [383 / 1320, 654 / 1320] };
// A point on the static rise line at `frac` of the peak height (0 = origin, 1 = peak).
export function risePoint(frac) {
  const [x0, y0] = STATIC_BOX.rise_origin, [x1, y1] = STATIC_BOX.peak;
  return [x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac];
}
// Wipe x where the rise reaches `frac` of the peak (used for "rise to 90% of the peak").
export function riseWipeRight(frac) { return risePoint(frac)[0]; }

// Typeset physics symbols with real subscripts: Ff,k  FN  μk  μs  Ff,s(max) ...
export function fx(s) {
  return String(s)
    .replace(/\bFf,(kinetic|static|k|s)\b/g, "F<sub>f,$1</sub>")
    .replace(/\bFN\b/g, "F<sub>N</sub>")
    .replace(/μ([ks])\b/g, "μ<sub>$1</sub>");
}

export function timeline(root, { reduced = false } = {}) {
  const anims = [];
  const seen = new WeakMap();
  function A(node, keyframes, t, d, easing = EASE.out, opts = {}) {
    if (!node) return null;
    const props = Object.keys(keyframes[0] || {}).filter((k) => k !== "offset" && k !== "easing");
    const done = seen.get(node) || new Set();
    const isTransform = props.some((p) => p === "transform");
    const later = props.some((p) => done.has(p));
    props.forEach((p) => done.add(p)); seen.set(node, done);
    const a = node.animate(keyframes, {
      delay: t * 1000, duration: Math.max(1, d * 1000), easing,
      fill: opts.fill || (later ? "forwards" : "both"),
      iterations: opts.iterations || 1, direction: opts.direction || "normal",
      composite: isTransform ? "add" : "replace",
    });
    a._end = opts.iterations === Infinity ? 0 : t + d * (opts.iterations || 1);
    a._loop = opts.iterations === Infinity;
    anims.push(a);
    return a;
  }
  const T = {
    A,
    fade: (n, t, d = 0.5) => A(n, [{ opacity: 0 }, { opacity: 1 }], t, d),
    fadeOut: (n, t, d = 0.3) => A(n, [{ opacity: 1 }, { opacity: 0 }], t, d),
    dim: (n, t, to = 0.4, d = 0.4) => A(n, [{ opacity: 1 }, { opacity: to }], t, d),
    fadeUp: (n, t, d = 0.5, dy = 12) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, d); return A(n, [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], t, d); },
    pop: (n, t, d = 0.35) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, Math.min(d, 0.2)); return A(n, [{ transform: "scale(.85)" }, { transform: "scale(1)" }], t, d, EASE.back); },
    drop: (n, t, dy = 30, d = 0.4) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, 0.15); return A(n, [{ transform: `translateY(${-dy}cqw)` }, { transform: "translateY(0)" }], t, d, EASE.back); },
    move: (n, t, d, dx, dy = 0, easing = EASE.inout) => A(n, [{ transform: "translate(0,0)" }, { transform: `translate(${dx}cqw,${dy}cqw)` }], t, d, easing),
    slideIn: (n, t, d, dx, dy = 0, easing = EASE.out) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, d * 0.6); return A(n, [{ transform: `translate(${dx}cqw,${dy}cqw)` }, { transform: "translate(0,0)" }], t, d, easing); },
    // left-to-right clip wipe between canvas fractions l..r (r is where the reveal stops)
    wipe: (n, t, d, l = 0, r = 1, easing = EASE.linear, from = null) => {
      const L = (l * 100).toFixed(2), R0 = ((1 - (from ?? l)) * 100).toFixed(2), R1 = ((1 - r) * 100).toFixed(2);
      return A(n, [{ clipPath: `inset(-5% ${R0}% -5% ${L}%)` }, { clipPath: `inset(-5% ${R1}% -5% ${L}%)` }], t, d, easing);
    },
    wipeUp: (n, t, d, easing = EASE.linear) => A(n, [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }], t, d, easing),
    grow: (n, t, d = 0.4) => A(n, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], t, d),
    growY: (n, t, d = 0.4) => A(n, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], t, d),
    pulse: (n, t, s = 1.15, d = 0.4, iterations = 1) => A(n, [{ transform: "scale(1)" }, { transform: `scale(${s})` }, { transform: "scale(1)" }], t, d, EASE.inout, { iterations }),
    wiggle: (n, t, deg = 6, d = 0.6) => A(n, [{ transform: "rotate(0)" }, { transform: `rotate(${deg}deg)` }, { transform: `rotate(${-deg}deg)` }, { transform: `rotate(${deg}deg)` }, { transform: `rotate(${-deg}deg)` }, { transform: "rotate(0)" }], t, d, EASE.inout),
    loop: (n, keyframes, t, d) => A(n, keyframes, t, d, EASE.inout, { iterations: Infinity }),
    // needle: animate the reading (left %), never a rotation
    needle: (n, t, d, from, to, easing = EASE.linear) => A(n, [{ left: needleX(from) + "%" }, { left: needleX(to) + "%" }], t, d, easing),
    needleSeq: (n, t, d, readings, easing = EASE.linear) => A(n, readings.map((r) => ({ left: needleX(r) + "%" })), t, d, easing),
    text: (n, t, d, from, to) => { // count a number label from..to
      const a = A(n, [{ opacity: 1 }, { opacity: 1 }], t, d);
      if (a) { const tick = () => { const p = a.effect.getComputedTiming().progress; if (p != null) n.textContent = (from + (to - from) * p).toFixed(1) + " N"; else if (a.currentTime >= t * 1000) n.textContent = to.toFixed(1) + " N"; if (a.playState !== "finished" && a.playState !== "idle") requestAnimationFrame(tick); else n.textContent = to.toFixed(1) + " N"; }; requestAnimationFrame(tick); }
      return a;
    },
    get anims() { return anims; },
    end() { return anims.reduce((m, a) => Math.max(m, a._end || 0), 0); },
  };
  T.finishAll = () => anims.forEach((a) => { if (a._loop) a.cancel(); else a.finish(); });
  T.reduced = reduced;
  return T;
}

// tiny DOM helpers
export function h(tag, cls, html, style) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  if (style) Object.assign(n.style, style);
  return n;
}
export function at(parent, node, x, y, w) {
  node.classList.add("p");
  if (x != null) node.style.left = x + "%";
  if (y != null) node.style.top = y + "%";
  if (w != null) node.style.width = w + "%";
  parent.appendChild(node);
  return node;
}
export function img(name, cls = "cut", alt = "") {
  const n = document.createElement("img");
  n.src = ART + name + ".webp"; n.alt = alt; n.className = cls; n.draggable = false; n.decoding = "async";
  return n;
}

// Leo Round 7 moving pieces: 1920x1080 design coords, pivot, presets / keyframe paths.
// placeDecor mounts sprites; startDecorMotions runs after pencil draw-in settles.
// prefers-reduced-motion → static start pose, no fade/reset.

import { ART, h } from "./bs-engine.js";

const PRESETS = new Set(["drift-across", "sway", "rotate", "roll-path", "bob", "path"]);

function reduced() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pctRect(x, y, w, h) {
  return {
    left: (x / 1920) * 100,
    top: (y / 1080) * 100,
    width: (w / 1920) * 100,
    height: (h / 1080) * 100,
  };
}

function applyRect(el, x, y, w, h) {
  const r = pctRect(x, y, w, h);
  el.style.left = r.left + "%";
  el.style.top = r.top + "%";
  el.style.width = r.width + "%";
  el.style.height = r.height + "%";
}

function decorOrigin(d, w, h) {
  if (d.pivot == null) return "50% 50%";
  if (typeof d.pivot === "string") return d.pivot;
  if (Array.isArray(d.pivot) && d.pivot.length >= 2) {
    const px = Number(d.pivot[0]), py = Number(d.pivot[1]);
    return `${w ? (px / w) * 100 : 50}% ${h ? (py / h) * 100 : 50}%`;
  }
  if (d.pivot && d.pivot.x != null) {
    return `${(d.pivot.x / (d.w || w || 200)) * 100}% ${(d.pivot.y / (d.h || h || 200)) * 100}%`;
  }
  return "50% 50%";
}

function img(src, cls) {
  const el = document.createElement("img");
  el.className = cls || "";
  el.alt = "";
  el.decoding = "async";
  el.draggable = false;
  el.src = src;
  return el;
}

function resolveSrc(src, artId) {
  if (/^(https?:|data:|\/)/.test(src) || src.startsWith("diy-pbl-bookshare/")) return src;
  // "pinwheel.webp" → art/<artId>/pinwheel.webp ; "r6a/pinwheel.webp" → art/r6a/...
  if (src.includes("/")) return `${ART}${src.replace(/^\//, "")}`;
  return `${ART}${artId}/${src}`;
}

function xf({ dx = 0, dy = 0, rot = 0, sx = 1, sy = 1 } = {}) {
  return `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
}

/** Build WAAPI keyframes from a motion descriptor. */
function buildFrames(d) {
  const m = d.motion || {};
  const baseRot = d.rot || 0;
  const kind = m.kind || d.preset || "path";

  if (kind === "rotate") {
    const from = m.from != null ? m.from : baseRot;
    const to = m.to != null ? m.to : from + 360;
    return {
      frames: [
        { offset: 0, transform: xf({ rot: from }) },
        { offset: 1, transform: xf({ rot: to }) },
      ],
      duration: (m.duration || 10) * 1000,
      easing: m.easing || "linear",
      iterations: Infinity,
    };
  }

  if (kind === "sway") {
    const amp = m.amp != null ? m.amp : 5;
    const start = m.start != null ? m.start : baseRot;
    // mid can flip sign for mirrored fronds
    const a0 = start - amp, a1 = start + amp;
    return {
      frames: [
        { offset: 0, transform: xf({ rot: a0 }) },
        { offset: 0.5, transform: xf({ rot: a1 }) },
        { offset: 1, transform: xf({ rot: a0 }) },
      ],
      duration: (m.duration || 6.5) * 1000,
      easing: m.easing || "ease-in-out",
      iterations: Infinity,
      delay: (m.delay || 0) * 1000,
    };
  }

  if (kind === "bob") {
    // mailbox flag style: hold / swing / hold / return via keyframes on rot
    if (Array.isArray(m.keyframes) && m.keyframes.length) {
      return framesFromList(m, baseRot);
    }
    const amp = m.amp != null ? m.amp : 12;
    return {
      frames: [
        { offset: 0, transform: xf({ rot: baseRot - amp }) },
        { offset: 0.5, transform: xf({ rot: baseRot + amp }) },
        { offset: 1, transform: xf({ rot: baseRot - amp }) },
      ],
      duration: (m.duration || 2.4) * 1000,
      easing: "ease-in-out",
      iterations: Infinity,
    };
  }

  if (kind === "roll-path" || kind === "path" || kind === "drift-across") {
    return framesFromList(m, baseRot, kind === "drift-across");
  }

  return framesFromList(m, baseRot);
}

function framesFromList(m, baseRot, driftFallback) {
  if (Array.isArray(m.keyframes) && m.keyframes.length) {
    const frames = m.keyframes.map((k) => {
      const frame = {
        transform: xf({
          dx: k.dx != null ? k.dx : (k.x != null ? k.x : 0),
          dy: k.dy != null ? k.dy : (k.y != null ? k.y : 0),
          rot: k.rot != null ? k.rot : baseRot,
          sx: k.sx != null ? k.sx : 1,
          sy: k.sy != null ? k.sy : 1,
        }),
        opacity: k.opacity != null ? k.opacity : 1,
      };
      if (k.t != null) frame.offset = Math.min(1, Math.max(0, Number(k.t)));
      if (k.offset != null) frame.offset = Math.min(1, Math.max(0, Number(k.offset)));
      if (k.easing) frame.easing = k.easing;
      return frame;
    });
    return {
      frames,
      duration: (m.duration || 8) * 1000,
      easing: m.easing || "linear",
      iterations: m.iterations == null ? Infinity : m.iterations,
      delay: (m.delay || 0) * 1000,
    };
  }
  if (driftFallback) {
    return {
      frames: [
        { offset: 0, transform: xf({ dx: -80, rot: baseRot }) },
        { offset: 1, transform: xf({ dx: 80, rot: baseRot }) },
      ],
      duration: (m.duration || 48) * 1000,
      easing: "linear",
      iterations: Infinity,
    };
  }
  return {
    frames: [{ transform: xf({ rot: baseRot }), opacity: 1 }],
    duration: 1000,
    iterations: 1,
  };
}

function startPoseTransform(d) {
  const m = d.motion || {};
  if (Array.isArray(m.keyframes) && m.keyframes.length) {
    const k = m.keyframes[0];
    return xf({
      dx: k.dx != null ? k.dx : 0,
      dy: k.dy != null ? k.dy : 0,
      rot: k.rot != null ? k.rot : (d.rot || 0),
      sx: k.sx != null ? k.sx : 1,
      sy: k.sy != null ? k.sy : 1,
    });
  }
  return xf({ rot: d.rot || 0 });
}

/**
 * Mount decor sprites into the design layer (behind text/cards unless z>=20).
 * Animations are armed but only started by startDecorMotions after draw-in.
 */
export function placeDecor(root, slide, ensureDesignLayer) {
  const items = slide.decor;
  if (!Array.isArray(items) || !items.length) return;
  const design = ensureDesignLayer(root);
  let layer = design.querySelector(":scope > .bs-decor-layer");
  if (!layer) {
    layer = h("div", "bs-decor-layer");
    layer.setAttribute("aria-hidden", "true");
    design.insertBefore(layer, design.firstChild);
  }
  const artId = slide.art || root.dataset.art || "";
  for (const d of items) {
    if (!d || !d.src) continue;
    const preset = PRESETS.has(d.preset) ? d.preset : (d.motion ? (d.motion.kind || "path") : "path");
    const el = img(resolveSrc(d.src, artId), `bs-decor bs-decor--${preset}`);
    const x = d.x ?? 0, y = d.y ?? 0, w = d.w ?? 200, h = d.h ?? 200;
    applyRect(el, x, y, w, h);
    el.style.transform = startPoseTransform(d);
    el.style.transformOrigin = decorOrigin(d, w, h);
    el.style.objectFit = "contain";
    el.style.pointerEvents = "none";
    el.style.zIndex = String(d.z != null ? d.z : 2);
    el.style.setProperty("--bs-decor-rot", `${d.rot || 0}deg`);
    if (d.duration) el.style.setProperty("--bs-decor-dur", `${d.duration}s`);
    el.dataset.bsDecor = "1";
    el._bsDecor = d;
    // Hidden until draw-in settles (CSS also gates on .is-drawn).
    el.style.opacity = "0";
    layer.appendChild(el);
  }
}

/** Cancel any running decor animations on this scene. */
export function cancelDecorMotions(root) {
  if (!root) return;
  root.querySelectorAll(".bs-decor").forEach((el) => {
    try { el.getAnimations?.().forEach((a) => a.cancel()); } catch (e) {}
    if (el._bsBob) { try { el._bsBob.cancel(); } catch (e) {} el._bsBob = null; }
  });
}

/**
 * After pencil draw-in: reveal sprites and run motions (or freeze at start pose).
 */
export function startDecorMotions(root) {
  if (!root) return;
  const reduce = reduced();
  root.querySelectorAll(".bs-decor").forEach((el) => {
    const d = el._bsDecor;
    if (!d) return;
    el.style.opacity = "1";
    el.style.visibility = "visible";
    // Cancel prior
    try { el.getAnimations?.().forEach((a) => a.cancel()); } catch (e) {}
    if (el._bsBob) { try { el._bsBob.cancel(); } catch (e) {} el._bsBob = null; }

    if (reduce) {
      el.style.transform = startPoseTransform(d);
      el.style.opacity = "1";
      return;
    }

    const built = buildFrames(d);
    try {
      const anim = el.animate(built.frames, {
        duration: built.duration,
        easing: built.easing || "linear",
        iterations: built.iterations == null ? Infinity : built.iterations,
        delay: built.delay || 0,
        fill: "both",
      });
      el._bsMain = anim;
    } catch (e) {}

    // Optional secondary bob (vertical) while primary path runs — e.g. tortoise, ants.
    const bob = d.motion && d.motion.bob;
    if (bob && bob.amp) {
      try {
        const amp = bob.amp;
        const dur = (bob.duration || 2) * 1000;
        // Composite by animating translateY via a wrapper? Element can only have one transform anim.
        // Encode bob into primary when present instead. If separate, use CSS variable + filter.
        // Use opacity-neutral composite: Web Animations composite "add" for translateY.
        el._bsBob = el.animate(
          [
            { transform: `translateY(${-amp}px)`, composite: "accumulate" },
            { transform: `translateY(${amp}px)`, composite: "accumulate" },
            { transform: `translateY(${-amp}px)`, composite: "accumulate" },
          ],
          { duration: dur, easing: "ease-in-out", iterations: Infinity, composite: "accumulate" }
        );
      } catch (e) {}
    }
  });
}

export { PRESETS as DECOR_PRESETS };

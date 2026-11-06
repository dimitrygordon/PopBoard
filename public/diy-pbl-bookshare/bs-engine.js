// Timeline helpers for the DIY PBL Bookshare storyboard (Friction Lesson pattern, no audio).
export const EASE = { out: "cubic-bezier(.33,1,.68,1)", inout: "ease-in-out", linear: "linear", back: "cubic-bezier(.34,1.56,.64,1)" };
export const ART = "diy-pbl-bookshare/art/";

export function fx(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function h(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

export function timeline(root, { reduced = false } = {}) {
  const anims = [];
  function A(node, keyframes, t, d, easing = EASE.out, opts = {}) {
    if (!node) return null;
    const a = node.animate(keyframes, {
      delay: t * 1000, duration: Math.max(1, d * 1000), easing,
      fill: opts.fill || "both",
      iterations: opts.iterations || 1, direction: opts.direction || "normal",
    });
    a._end = opts.iterations === Infinity ? t + d : t + d * (opts.iterations || 1);
    a._loop = opts.iterations === Infinity;
    anims.push(a);
    return a;
  }
  const T = {
    A,
    reduced,
    anims,
    fade: (n, t, d = 0.5) => A(n, [{ opacity: 0 }, { opacity: 1 }], t, d),
    fadeUp: (n, t, d = 0.5, dy = 12) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, d); return A(n, [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], t, d); },
    pop: (n, t, d = 0.35) => { A(n, [{ opacity: 0 }, { opacity: 1 }], t, Math.min(d, 0.2)); return A(n, [{ transform: "scale(.85)" }, { transform: "scale(1)" }], t, d, EASE.back); },
    loop: (n, keyframes, t, d) => A(n, keyframes, t, d, EASE.inout, { iterations: Infinity }),
    end: () => Math.max(0.5, ...anims.map((a) => a._loop ? 8 : (a._end || 0))),
    finishAll() { anims.forEach((a) => { try { a.finish(); } catch (e) {} }); },
  };
  return T;
}

// Thin Magic Move / FLIP handoffs for DIY PBL Bookshare (magic-slide + Leo transitions-plan).
// Art stage only. Script panel gets a short quiet fade. Reduced motion = simple fade.

export const THEME_BAND = {
  1: "cream", 2: "cream",
  3: "teal", 4: "teal", 5: "teal",
  6: "amber", 7: "amber", 8: "amber",
  9: "coral", 10: "coral", 11: "coral", 12: "coral",
  13: "violet", 14: "violet", 15: "violet",
  16: "cream", 17: "cream", 18: "cream", 19: "cream", 20: "cream",
};

// Primary shared motif per adjacent pair (1-based). Ids match sprite file stems / magic ids.
// When TO lacks the same bitmap, runFlip aims the FROM clone at a stage anchor (soft motif wipe).
export const HANDOFFS = {
  "1-2": { primary: "marble" },
  "2-3": { primary: "lantern_glow" },
  "3-4": { primary: "footprints" },
  "4-5": { primary: "journal_page" }, // soft wipe into marble coaster (no shared bitmap)
  "5-6": { primary: "marble" }, // soft wipe into pedestal / heart
  "6-7": { primary: "standards" },
  "7-8": { primary: "checkmark" },
  "8-9": { primary: "cloud" },
  "9-10": { primary: "doc_card" },
  "10-11": { primary: "breakeven_glow" },
  "11-12": { primary: "tip_card" },
  "12-13": { primary: "needle" },
  "13-14": { primary: "barbell" },
  "14-15": { primary: "q_bubble" },
  "15-16": { primary: "block" },
  "16-17": { primary: "magnifier" }, // soft wipe into flip_card / glow wall
  "17-18": { primary: "glow" },
  "18-19": { primary: "glow" }, // soft wipe into note_card (discuss has no lanterns)
  "19-20": { primary: "note_card" }, // soft wipe into bookshelf center (page sprite hidden)
};

export function handoffKey(from1, to1) {
  return `${from1}-${to1}`;
}

export function captureMagic(root) {
  const out = {};
  if (!root) return out;
  root.querySelectorAll("[data-magic-id]").forEach((el) => {
    const id = el.dataset.magicId;
    if (!id || out[id]) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const src = el.tagName === "IMG" ? (el.currentSrc || el.src || null) : null;
    out[id] = {
      id,
      src,
      tag: el.tagName,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      el,
    };
  });
  return out;
}

export function resolvePrimary(plan, fromCapture) {
  if (plan && plan.primary && fromCapture[plan.primary]) return plan.primary;
  // Reverse nav or missing bitmap: fly whatever magic motif exists on FROM.
  const keys = Object.keys(fromCapture);
  return keys[0] || null;
}

function makeClone(rec) {
  let clone;
  if (rec.src) {
    clone = document.createElement("img");
    clone.src = rec.src;
    clone.alt = "";
  } else {
    clone = document.createElement("div");
    clone.className = "bs-flip-clone-box";
    // Carry a soft cream paper chip when FROM was a DOM card
    clone.style.background = "rgba(245, 236, 220, 0.92)";
    clone.style.borderRadius = "10px";
    clone.style.boxShadow = "0 8px 24px rgba(42,36,24,0.18)";
  }
  clone.classList.add("bs-flip-clone");
  clone.dataset.magicId = rec.id;
  Object.assign(clone.style, {
    left: rec.rect.left + "px",
    top: rec.rect.top + "px",
    width: rec.rect.width + "px",
    height: rec.rect.height + "px",
    opacity: "1",
  });
  document.body.appendChild(clone);
  return clone;
}

export function clearFlipClones() {
  document.querySelectorAll(".bs-flip-clone").forEach((n) => n.remove());
  document.querySelectorAll(".bs-bg-xfade").forEach((n) => n.remove());
}

/**
 * Soft background crossfade: keep FROM bg briefly over TO bg.
 */
export function startBgCrossfade(fromRoot, toRoot, ms = 320) {
  if (!fromRoot || !toRoot) return Promise.resolve();
  const fromBg = fromRoot.querySelector(".bs-bg");
  if (!fromBg || !fromBg.src) return Promise.resolve();
  const ghost = document.createElement("img");
  ghost.className = "bs-bg-xfade show";
  ghost.src = fromBg.currentSrc || fromBg.src;
  ghost.alt = "";
  toRoot.insertBefore(ghost, toRoot.firstChild);
  // Force paint then fade out
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      ghost.classList.remove("show");
      setTimeout(() => {
        ghost.remove();
        resolve();
      }, ms);
    });
  });
}

/**
 * Run FLIP from captured FROM records to current TO scene.
 */
export function runFlip(fromCapture, toRoot, primaryId, { duration = 560, reduced = false } = {}) {
  clearFlipClones();
  if (reduced || !primaryId || !fromCapture[primaryId]) {
    return Promise.resolve(false);
  }
  const from = fromCapture[primaryId];
  const toEls = captureMagic(toRoot);
  const to = toEls[primaryId];
  let toRect;
  if (to) {
    toRect = to.rect;
    to.el.style.visibility = "hidden";
  } else {
    const art = document.querySelector(".fl-art") || toRoot;
    const ar = art.getBoundingClientRect();
    toRect = {
      left: ar.left + ar.width * 0.58,
      top: ar.top + ar.height * 0.40,
      width: Math.max(48, from.rect.width * 0.9),
      height: Math.max(48, from.rect.height * 0.9),
    };
  }

  const clone = makeClone(from);
  const dx = (toRect.left + toRect.width / 2) - (from.rect.left + from.rect.width / 2);
  const dy = (toRect.top + toRect.height / 2) - (from.rect.top + from.rect.height / 2);
  const sx = toRect.width / Math.max(1, from.rect.width);
  const sy = toRect.height / Math.max(1, from.rect.height);

  clone.style.transformOrigin = "center center";
  const anim = clone.animate(
    [
      { transform: "translate(0px,0px) scale(1,1)", opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: to ? 1 : 0.15 },
    ],
    { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );

  return anim.finished.then(() => {
    if (to && to.el) to.el.style.visibility = "";
    clone.remove();
    return true;
  }).catch(() => {
    if (to && to.el) to.el.style.visibility = "";
    clone.remove();
    return false;
  });
}

export function fadeScript(sideEl, ms = 180) {
  if (!sideEl) return Promise.resolve();
  sideEl.style.transition = `opacity ${ms}ms ease`;
  sideEl.style.opacity = "0.35";
  return new Promise((r) => setTimeout(r, ms));
}

export function restoreScript(sideEl, ms = 180) {
  if (!sideEl) return Promise.resolve();
  sideEl.style.transition = `opacity ${ms}ms ease`;
  sideEl.style.opacity = "1";
  return new Promise((r) => setTimeout(r, ms));
}

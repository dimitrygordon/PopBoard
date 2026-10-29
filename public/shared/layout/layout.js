// PopBoard shared layout rule (JS half). Loaded by every study page as a module.
// 1) Text floor: any caption or label rendered under 13px is raised to 13px (table cells keep their size;
//    their table scrolls sideways instead, see contain()).
// 2) Keeps --pb-vh exact on browsers without dvh and re-runs on resize/rotation.
// Opt out on one element (and its children) with data-pb-free.
export const MIN_TEXT_PX = 13;

const TEXT_SEL = "footer,p,span,small,label,output,figcaption,caption,dt,dd,li,a,button,summary,legend,h1,h2,h3,h4,h5,h6,div,b,strong,em,i,sub,sup,abbr,time,kbd,code";
function ownText(el) { for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true; return false; }

let checked = new WeakSet();
export function raiseSmallText(root = document.body, min = MIN_TEXT_PX) {
  if (!root) return 0;
  let n = 0;
  for (const el of root.querySelectorAll(TEXT_SEL)) {
    if (checked.has(el)) continue;
    if (el.closest("[data-pb-free],svg,.sr-only")) { checked.add(el); continue; }
    if (el.matches("sub,sup")) { checked.add(el); continue; } // part of a symbol; its parent carries the size
    if (!ownText(el)) continue; // text may arrive later; check again then
    checked.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > 0 && fs < min - 0.05) { el.style.fontSize = min + "px"; el.dataset.pbRaised = "1"; n++; }
  }
  return n;
}

// Half stop of a bottom sheet that sits right under `caption` (the last thing above the controls).
// Returns a height in px, clamped between the peek and full heights.
export function halfUnder(caption, peek, full, gap = 8) {
  const b = caption?.getBoundingClientRect?.().bottom;
  if (!(b > 0)) return Math.max(peek + 1, Math.min(full - 1, Math.round(innerHeight * 0.45)));
  return Math.max(peek + 1, Math.min(full - 1, Math.floor(innerHeight - b - gap)));
}

// Tables wider than their box get a horizontal scroller around them, so the page itself never scrolls sideways.
export function contain(root = document.body) {
  if (!root) return;
  for (const t of root.querySelectorAll("table")) {
    if (t.closest("[data-pb-free]") || t.parentElement?.classList.contains("pb-scroll-x")) continue;
    const box = t.parentElement?.getBoundingClientRect?.(), r = t.getBoundingClientRect();
    if (!box || (r.width <= box.width + 1 && r.right <= document.documentElement.clientWidth + 1)) continue;
    const w = document.createElement("div"); w.className = "pb-scroll-x"; t.before(w); w.appendChild(t);
  }
}

let timer = 0;
function run() {
  timer = 0;
  if (!CSS.supports?.("height", "100dvh")) document.documentElement.style.setProperty("--pb-vh", innerHeight + "px");
  raiseSmallText();
  contain();
}
export function schedule(reset = false) { if (reset === true) checked = new WeakSet(); if (!timer) timer = setTimeout(run, 120); }
const rescan = () => schedule(true);

if (typeof window !== "undefined" && !window.__pbLayout) {
  window.__pbLayout = true;
  const start = () => {
    schedule();
    addEventListener("resize", rescan, { passive: true });
    addEventListener("orientationchange", rescan);
    document.fonts?.ready?.then(rescan);
    // Modules add text after load (readouts, toasts, sheets) and swap classes (theme, modes).
    new MutationObserver((list) => schedule(list.some((m) => m.type === "attributes"))).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    new MutationObserver(rescan).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
}

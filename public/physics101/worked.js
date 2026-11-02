// Read this page: a worked example ("Example Problem ...") opens in place. The question stays pinned; tap it
// (or its button) and the "Step one / two / three" paragraphs unfold one by one with pencil ticks. The step
// that solves it sits under a scribble you erase with Show answer. Tap again to fold it back.
// Narration keeps working: the same <p> nodes are moved, not copied, and a highlighted word opens the steps.
import { bindWorked, eraseCover } from "./sq-core.js";

const TICK = `<svg class="sq-tick" data-draw viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13c2 2 3.5 3.6 5 5.5C12 12 15.5 7.5 20 4"/></svg>`;

export function enhanceWorked(root) {
  const rich = root.querySelector(".rich"); if (!rich || rich.dataset.worked) return;
  const h3 = rich.querySelector("h3"); if (!h3 || !/Example Problem/i.test(h3.textContent)) return;
  const ps = [...rich.children], first = ps.findIndex((p) => p.tagName === "P" && /^Step [a-z]+\b/i.test(p.textContent.trim()));
  if (first < 1) return;
  rich.dataset.worked = "1";
  const pin = document.createElement("div"); pin.className = "sq-pin wk-pin";
  const ol = document.createElement("ol"); ol.className = "sq-steps wk-steps"; ol.setAttribute("aria-label", "Worked solution");
  rich.insertBefore(pin, ps[0]); for (const p of ps.slice(0, first)) pin.appendChild(p);
  pin.after(ol);
  const steps = ps.slice(first);
  const solve = steps.findIndex((p) => /^Step [a-z]+:?\s*solve/i.test(p.textContent.trim()));
  steps.forEach((p, i) => {
    const li = document.createElement("li"); li.className = "sq-step"; li.innerHTML = TICK; li.appendChild(p); ol.appendChild(li);
    if (i === (solve >= 0 ? solve : steps.length - 1)) {
      li.classList.add("wk-answer");
      const cover = document.createElement("div"); cover.className = "sq-cover";
      cover.innerHTML = `<svg viewBox="0 0 104 64" preserveAspectRatio="none" aria-hidden="true"><path d="${SCRIBBLE}"/></svg><button type="button" class="sq-show">Show answer</button>`;
      p.setAttribute("aria-hidden", "true"); li.appendChild(cover);
      cover.querySelector("button").addEventListener("click", () => { p.removeAttribute("aria-hidden"); eraseCover(cover, () => { p.tabIndex = -1; p.focus({ preventScroll: true }); }); });
    }
  });
  const w = bindWorked(pin, ol);
  // narration reaches the steps: open them so the highlighted word is visible
  new MutationObserver(() => { if (ol.hidden && ol.querySelector(".hl")) w.toggle(true); }).observe(ol, { subtree: true, attributes: true, attributeFilter: ["class"] });
}

const SCRIBBLE = (() => { let d = "M2 12"; for (let i = 0; i < 26; i++) d += ` L${4 + i * 3.8} ${i % 2 ? 6 + (i % 5) : 30 + (i % 3) * 4}`; d += " M3 40"; for (let i = 0; i < 26; i++) d += ` L${5 + i * 3.7} ${i % 2 ? 34 + (i % 4) : 58 + (i % 3) * 3}`; return d; })();

export function watchReadText(el) {
  if (!el) return;
  enhanceWorked(el);
  new MutationObserver(() => enhanceWorked(el)).observe(el, { childList: true });
}

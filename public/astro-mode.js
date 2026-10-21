/* astro-mode.js — third theme, "Astronomy Mode", layered on the existing
   light/dark toggle. Cycle: Light → Dark → Astronomy → Light. The button shows
   the CURRENT mode (app.js labels Light/Dark; this file labels Astronomy).
   Astronomy keeps data-theme="dark" (dark tokens) and adds html[data-astro];
   the sky (login-sky.js) becomes a fixed, click-through backdrop. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, KEY = "astroMode";
  var IDS = ["themeToggle", "themeTogglePortal", "themeToggleStudents", "themeToggleDashboard", "themeToggleSeats"];
  var STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M12 3.2l2.3 5.3 5.7.5-4.3 3.8 1.3 5.6L12 15.5l-5 2.9 1.3-5.6L4 9l5.7-.5z"/></svg>';
  var NEXT = { light: "Dark", dark: "Astronomy", astro: "Light" };
  function on() { return root.hasAttribute("data-astro"); }
  function mode() { return on() ? "astro" : (root.getAttribute("data-theme") === "dark" ? "dark" : "light"); }
  function store(v) { try { if (v) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch (e) {} }
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>';
  var LABEL = { light: SUN + " Light", dark: MOON + " Dark", astro: STAR + " Astronomy" };
  // The label always names the CURRENT applied mode, derived from html[data-theme]/[data-astro],
  // so it stays right regardless of what app.js (or a stale cached copy of it) wrote.
  function relabel() {
    var m = mode();
    IDS.forEach(function (id) {
      var b = doc.getElementById(id); if (!b) return;
      b.classList.add("theme-toggle-btn");
      if (b.getAttribute("data-mode") !== m || b.innerHTML !== LABEL[m]) { b.innerHTML = LABEL[m]; b.setAttribute("data-mode", m); }
      var name = m === "astro" ? "Astronomy" : m === "dark" ? "Dark" : "Light";
      b.setAttribute("aria-label", "Theme: " + name + ". Switch to " + NEXT[m]);
      b.title = "Switch to " + NEXT[m];
    });
  }
  function setAstro(v) {
    if (v) root.setAttribute("data-astro", ""); else root.removeAttribute("data-astro");
    store(v); relabel();
    if (v && window.__laSky) { window.__laSky.show(true); window.__laSky.update(true); window.__laSky.frame(performance.now(), 0); }
    if (!v && window.__laSky) window.__laSky.show(false);
  }
  // capture on document runs before app.js's click handlers on the buttons
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button");
    if (!b || IDS.indexOf(b.id) < 0) return;
    if (mode() === "dark") { e.stopImmediatePropagation(); e.preventDefault(); setAstro(true); }
    else if (mode() === "astro") { root.removeAttribute("data-astro"); store(false); if (window.__laSky) window.__laSky.show(false); } // app.js then switches dark → light
  }, true);
  new MutationObserver(function () {
    if (root.getAttribute("data-theme") !== "dark" && on()) { root.removeAttribute("data-astro"); store(false); }
    relabel(); setTimeout(relabel, 0); // after app.js setTheme() finishes writing its own labels
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  function init() {
    var saved = false; try { saved = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (saved && root.getAttribute("data-theme") === "dark") setAstro(true); else { if (saved) store(false); relabel(); }
  }
  window.__astroMode = { mode: mode, set: setAstro };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

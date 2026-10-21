/* astro-mode.js — third theme, "Astronomy Mode", layered on the existing
   light/dark toggle without changing app.js. Cycle: light → dark → astronomy → light.
   Astronomy keeps data-theme="dark" (dark tokens) and adds html[data-astro];
   the login sky (login-sky.js) becomes a fixed, click-through backdrop. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, KEY = "astroMode";
  var IDS = ["themeToggle", "themeTogglePortal", "themeToggleStudents", "themeToggleDashboard", "themeToggleSeats"];
  var STAR = '<svg class="astro-ic" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.5 7.8 16l1.1-4.8L5.2 8l4.9-.4z"/><path d="M19 17.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg>';
  var busy = false;
  function on() { return root.hasAttribute("data-astro"); }
  function store(v) { try { if (v) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); } catch (e) {} }
  function relabel() {
    if (busy) return;
    var dark = root.getAttribute("data-theme") === "dark";
    IDS.forEach(function (id) {
      var b = doc.getElementById(id); if (!b) return;
      if (dark && !on()) { if (b.getAttribute("data-astro-label") !== "1") { b.innerHTML = STAR + " Astronomy Mode"; b.setAttribute("data-astro-label", "1"); } }
      else if (b.getAttribute("data-astro-label") === "1") {
        // restore the app's own label for the state it set (dark → "Light Mode" with sun)
        b.removeAttribute("data-astro-label"); if (b.__astroOrig) b.innerHTML = b.__astroOrig;
      }
    });
  }
  function remember() { IDS.forEach(function (id) { var b = doc.getElementById(id); if (b && b.getAttribute("data-astro-label") !== "1") b.__astroOrig = b.innerHTML; }); }
  function setAstro(v) {
    remember();
    if (v) root.setAttribute("data-astro", ""); else root.removeAttribute("data-astro");
    store(v); relabel();
    if (v && window.__laSky) { window.__laSky.update(true); window.__laSky.frame(performance.now(), 0); }
  }
  // capture on document runs before app.js's click handlers on the buttons
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button");
    if (!b || IDS.indexOf(b.id) < 0) return;
    if (root.getAttribute("data-theme") === "dark" && !on()) { e.stopImmediatePropagation(); e.preventDefault(); setAstro(true); }
    else if (on()) { root.removeAttribute("data-astro"); store(false); } // app.js then switches dark → light
  }, true);
  // follow app.js: if the theme leaves dark (or the app rewrites labels), keep state + labels consistent
  new MutationObserver(function () {
    if (root.getAttribute("data-theme") !== "dark" && on()) { root.removeAttribute("data-astro"); store(false); }
    remember(); relabel();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  function init() {
    var saved = false; try { saved = localStorage.getItem(KEY) === "1"; } catch (e) {}
    remember();
    if (saved && root.getAttribute("data-theme") === "dark") setAstro(true); else { if (saved) store(false); relabel(); }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

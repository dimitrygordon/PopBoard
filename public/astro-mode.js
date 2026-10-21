/* astro-mode.js — sky themes layered on the app's light/dark toggle.
   Cycle: Light → Dark → Weather → Astronomy → Light. The button shows the CURRENT mode.
   Storage: app.js keeps "theme" (light|dark); this file keeps "skyMode" (off|weather|astro).
   Legacy astroMode=1 (the old name for what is now Weather) migrates to skyMode=weather.
   Sky modes keep data-theme="dark" (dark tokens) and set html[data-astro] (sky on, glass UI)
   plus html[data-sky="weather"|"astro"]. The sky itself is login-sky.js. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, KEY = "skyMode";
  var IDS = ["themeToggle", "themeTogglePortal", "themeToggleStudents", "themeToggleDashboard", "themeToggleSeats"];
  var I = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg">' + d + '</svg>'; };
  var ICON = {
    light: I('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
    dark: I('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>'),
    weather: I('<path d="M8 3.5v1.6M3.6 8H2M4.9 4.9l1.1 1.1M12.4 4.9l-1.1 1.1"/><path d="M5.6 10.6a3.2 3.2 0 0 1 5.9-2.2"/><path d="M8.5 20h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A2.9 2.9 0 0 0 8.5 20Z"/>'),
    astro: I('<path d="M12 3.2l2.3 5.3 5.7.5-4.3 3.8 1.3 5.6L12 15.5l-5 2.9 1.3-5.6L4 9l5.7-.5z"/>')
  };
  var NAME = { light: "Light", dark: "Dark", weather: "Weather", astro: "Astronomy" };
  var NEXT = { light: "dark", dark: "weather", weather: "astro", astro: "light" };
  function sky() { var v = root.getAttribute("data-sky"); return v === "astro" || v === "weather" ? v : null; }
  function mode() { return sky() || (root.getAttribute("data-theme") === "dark" ? "dark" : "light"); }
  function load() {
    try {
      var v = localStorage.getItem(KEY);
      if (!v && localStorage.getItem("astroMode") === "1") { v = "weather"; localStorage.setItem(KEY, v); }
      localStorage.removeItem("astroMode");
      return v === "weather" || v === "astro" ? v : "off";
    } catch (e) { return "off"; }
  }
  function store(v) { try { localStorage.setItem(KEY, v || "off"); } catch (e) {} }
  function relabel() {
    var m = mode();
    IDS.forEach(function (id) {
      var b = doc.getElementById(id); if (!b) return;
      b.classList.add("theme-toggle-btn");
      var html = ICON[m] + " " + NAME[m];
      if (b.innerHTML !== html) b.innerHTML = html;
      b.setAttribute("data-mode", m);
      b.setAttribute("aria-label", "Theme: " + NAME[m] + ". Switch to " + NAME[NEXT[m]]);
      b.title = "Switch to " + NAME[NEXT[m]];
    });
  }
  function setSky(v) { // v: null | "weather" | "astro"
    if (v) { root.setAttribute("data-astro", ""); root.setAttribute("data-sky", v); }
    else { root.removeAttribute("data-astro"); root.removeAttribute("data-sky"); }
    store(v || "off"); relabel();
    var S = window.__laSky;
    if (S) { if (v) { S.setMode(v); S.show(true); } else S.show(false); }
  }
  // capture on document runs before app.js's click handlers on the buttons
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button");
    if (!b || IDS.indexOf(b.id) < 0) return;
    var m = mode();
    if (m === "dark" || m === "weather") { e.stopImmediatePropagation(); e.preventDefault(); setSky(m === "dark" ? "weather" : "astro"); }
    else if (m === "astro") { root.removeAttribute("data-astro"); root.removeAttribute("data-sky"); store("off"); if (window.__laSky) window.__laSky.show(false); } // app.js then switches dark → light
  }, true);
  new MutationObserver(function () {
    if (root.getAttribute("data-theme") !== "dark" && sky()) { root.removeAttribute("data-astro"); root.removeAttribute("data-sky"); store("off"); }
    relabel(); setTimeout(relabel, 0); // after app.js setTheme() finishes writing its own labels
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  function init() {
    var v = load();
    if (v !== "off" && root.getAttribute("data-theme") === "dark") setSky(v);
    else { if (v !== "off") store("off"); relabel(); }
  }
  window.__astroMode = { mode: mode, set: setSky };
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

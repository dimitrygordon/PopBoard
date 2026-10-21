/* astro-study.js — Weather / Astronomy sky modes for the Study pages. Reads the
   same saved theme as the main app (theme=dark + skyMode=weather|astro; legacy
   astroMode=1 → weather) and, if on, shows the sky (login-sky.js) behind the page. */
(function () {
  "use strict";
  var mode = "off";
  try {
    mode = localStorage.getItem("skyMode") || "off";
    if (mode === "off" && localStorage.getItem("astroMode") === "1") { mode = "weather"; localStorage.setItem("skyMode", mode); }
    localStorage.removeItem("astroMode");
    if (localStorage.getItem("theme") !== "dark") mode = "off";
  } catch (e) {}
  if (mode !== "weather" && mode !== "astro") return;
  window.__laSkyMode = mode;
  var root = document.documentElement; root.setAttribute("data-astro", ""); root.setAttribute("data-sky", mode);
  // solid dark backing for in-flow sim canvases (absolute overlays stay transparent so the canvas below shows through)
  function backCanvases() {
    if (document.getElementById("sandboxCanvas")) return; // full-screen sim: already opaque
    [].forEach.call(document.querySelectorAll("canvas:not(#la-sky)"), function (c) {
      var cs = getComputedStyle(c); if (cs.position === "absolute" || cs.position === "fixed") return;
      if (cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent") c.style.backgroundColor = "#0f1318";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", backCanvases); else backCanvases();
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.getElementById("sandboxCanvas") || /study-sandbox/.test(location.pathname)) return; // sky would be fully hidden behind the sandbox canvas
  var s = document.createElement("script"); s.src = "/login-sky.js?v=20261021f"; s.defer = true;
  s.onload = function () {
    var last = performance.now();
    function loop(now) { // the sky's only rAF loop on this page; sims keep their own
      var dt = Math.min(.033, (now - last) / 1000); last = now;
      if (!document.hidden && window.__laSky) window.__laSky.frame(now, dt);
      requestAnimationFrame(loop);
    }
    if (reduce) { setTimeout(function () { if (window.__laSky) window.__laSky.frame(performance.now(), 0); }, 50); }
    else requestAnimationFrame(loop);
  };
  (document.head || root).appendChild(s);
})();

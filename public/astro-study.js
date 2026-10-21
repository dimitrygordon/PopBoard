/* astro-study.js — Astronomy Mode for the Study pages. Reads the same saved
   theme as the main app (localStorage theme=dark + astroMode=1) and, if on,
   shows the live sky (login-sky.js) behind the page with glass panels. */
(function () {
  "use strict";
  var on = false; try { on = localStorage.getItem("theme") === "dark" && localStorage.getItem("astroMode") === "1"; } catch (e) {}
  if (!on) return;
  var root = document.documentElement; root.setAttribute("data-astro", "");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var s = document.createElement("script"); s.src = "/login-sky.js"; s.defer = true;
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

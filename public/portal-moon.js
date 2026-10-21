/* portal-moon.js — Da Vinci. Draws tonight's real moon phase into the
   portal moons and plays the grow / shrink animations on studyPortal. */
(function () {
  "use strict";
  var doc = document, win = window;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function phase(t) { var p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / 29.530588853) % 1; return p < 0 ? p + 1 : p; }
  function moonSVG(p) {
    var r = 8, k = Math.cos(2 * Math.PI * p), s = p < 0.5 ? 1 : -1;
    var rx = Math.max(0.01, Math.abs(k) * r);
    var sw1 = s > 0 ? 1 : 0, sw2 = (s > 0) === (k > 0) ? 0 : 1;
    var lit = Math.abs(p - 0.5) < 0.015 ? '<circle cx="12" cy="12" r="8" fill="#fff6dc"/>'
      : Math.min(p, 1 - p) < 0.015 ? ""
      : '<path fill="#fff6dc" d="M12 4A8 8 0 0 ' + sw1 + ' 12 20A' + rx.toFixed(2) + ' 8 0 0 ' + sw2 + ' 12 4Z"/>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="rgba(120,120,150,.35)" stroke="rgba(255,246,220,.55)" stroke-width="1"/>' + lit + '</svg>';
  }
  function paint() {
    var svg = moonSVG(phase(Date.now()));
    [].forEach.call(doc.querySelectorAll(".study-pill-moon, .study-portal-moon"), function (el) { el.innerHTML = svg; });
  }
  function grow(pt) {
    return new Promise(function (done) {
      var m = doc.createElement("div"); m.className = "pm-moon"; doc.body.appendChild(m);
      doc.documentElement.classList.add("pm-leaving");
      var R = Math.hypot(Math.max(pt.x, innerWidth - pt.x), Math.max(pt.y, innerHeight - pt.y));
      var scale = (R * 2.1) / 18;
      if (!m.animate) return done();
      var a = m.animate([
        { transform: "scale(1)", offset: 0 },
        { transform: "scale(1.6)", offset: 0.18 },
        { transform: "scale(" + scale + ") rotate(25deg)", offset: 1 }
      ], { duration: 700, easing: "cubic-bezier(.6,0,.25,1)", fill: "forwards" });
      a.onfinish = function () { done(); };
      setTimeout(done, 900);
      win.addEventListener("pageshow", function (e) { if (e.persisted) { m.remove(); doc.documentElement.classList.remove("pm-leaving"); } }, { once: true });
    });
  }
  function shrink() {
    return new Promise(function (done) {
      doc.documentElement.classList.add("pm-closing");
      setTimeout(done, 560);
      win.addEventListener("pageshow", function (e) { if (e.persisted) doc.documentElement.classList.remove("pm-closing"); }, { once: true });
    });
  }
  function hook() {
    paint();
    var P = win.studyPortal; if (!P || reduce) return;
    if (doc.querySelector("a.study-pill")) P.onOpen = grow;
    if (doc.getElementById("studyBackBtn")) P.onClose = shrink;
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", hook); else hook();
  win.__portalMoon = { phase: phase, svg: moonSVG };
})();

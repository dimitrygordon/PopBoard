// PopBoard shared fun layer: hub badges (classic script for study.html).
// Reads medals saved by fun-core.js (same key) and returns a badge element.
(function () {
  var KEY = "popboard.fun.medals", TIERS = ["bronze", "silver", "gold"];
  function medals(id) {
    try { var all = JSON.parse(localStorage.getItem(KEY) || "{}"); var v = all && all[id]; return Array.isArray(v) ? TIERS.filter(function (t) { return v.indexOf(t) >= 0; }) : []; }
    catch (e) { return []; }
  }
  function badge(id) {
    var m = medals(id); if (!m.length) return null;
    var el = document.createElement("span"); el.className = "fun-badges";
    el.setAttribute("aria-label", "Medals earned: " + m.join(", "));
    m.forEach(function (t) { var d = document.createElement("span"); d.className = "fun-badge " + t; d.title = t; el.appendChild(d); });
    return el;
  }
  window.PopBoardFun = { medals: medals, badge: badge };
})();

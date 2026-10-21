/* ui-polish.js — mascot empty states and composer polish. Purely
   presentational: never touches app.js state, only observes the DOM. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // same layers/rects as login-alive.js (3000px source)
  var S = 3000, BASE = "/login-alive/";
  var PARTS = { tassel: [700, 640, 260, 750], browL: [982, 1200, 183, 125], browR: [1678, 1183, 194, 125], eyeL: [979, 1385, 238, 315], eyeR: [1632, 1369, 238, 315], mouth: [1209, 1633, 420, 317] };
  function mascot() {
    var m = doc.createElement("div"); m.className = "ui-mascot"; m.setAttribute("aria-hidden", "true");
    var b = new Image(); b.alt = ""; b.src = BASE + "base.png"; b.className = "ui-mascot-base"; m.appendChild(b);
    Object.keys(PARTS).forEach(function (k) {
      var r = PARTS[k], el = new Image(); el.alt = ""; el.src = BASE + k + ".png"; el.className = "ui-mascot-" + k;
      el.style.left = (r[0] / S * 100) + "%"; el.style.top = (r[1] / S * 100) + "%"; el.style.width = (r[2] / S * 100) + "%"; el.style.height = (r[3] / S * 100) + "%";
      m.appendChild(el);
    });
    return m;
  }
  var EMPTY = [
    { list: "posts", view: "app", title: "No posts yet", body: "Be the first to ask a question or share a thought — type it in the bar below." },
    { list: "boardsList", view: "boardsPortal", title: "No PopBoards yet", body: "Name your first PopBoard above and press Create PopBoard. Students join with that name." },
    { list: "studentsList", view: "studentsPortal", title: "No students yet", body: "Students appear here when they join with the board name, or add one above." },
    { list: "seatCanvas", view: "seatingMap", title: "No seats yet", body: "Press + Add Seat to place your first one.", inside: true, match: ".seat" }
  ];
  function wire(cfg) {
    var c = doc.getElementById(cfg.list), view = doc.getElementById(cfg.view); if (!c || !view) return;
    var box = null, t = null;
    function isEmpty() { return cfg.match ? !c.querySelector(cfg.match) : c.children.length === 0 || (c.children.length === 1 && box && box.parentNode === c); }
    function sync() {
      clearTimeout(t);
      t = setTimeout(function () {
        var show = !view.classList.contains("hidden") && !c.hasAttribute("data-ui-loading") && isEmpty();
        if (show && !box) {
          box = doc.createElement("div"); box.className = "ui-empty" + (cfg.inside ? " ui-empty-inside" : "");
          box.appendChild(mascot());
          var h = doc.createElement("p"); h.className = "ui-empty-title"; h.textContent = cfg.title;
          var p = doc.createElement("p"); p.className = "ui-empty-body"; p.textContent = cfg.body;
          box.appendChild(h); box.appendChild(p);
          if (cfg.inside) c.appendChild(box); else c.parentNode.insertBefore(box, c.nextSibling);
        } else if (!show && box) { box.remove(); box = null; }
      }, cfg.inside ? 50 : 400); // lists: wait out the first snapshot so it never flashes
    }
    new MutationObserver(sync).observe(c, { childList: true, attributes: true, attributeFilter: ["data-ui-loading"] });
    new MutationObserver(sync).observe(view, { attributes: true, attributeFilter: ["class"] });
    sync();
  }

  /* composer: live character count + dimmed Post until there's something to post */
  function composer() {
    var ta = doc.getElementById("postInput"), post = doc.getElementById("postBtn"), prev = doc.getElementById("postImagePreview");
    if (!ta || !post) return;
    var right = post.parentNode, count = doc.createElement("span");
    count.className = "ui-char-count"; count.setAttribute("aria-live", "off");
    right.insertBefore(count, right.firstChild);
    function upd() {
      var n = ta.value.length, has = ta.value.trim().length > 0 || (prev && prev.children.length > 0);
      count.textContent = n ? n + (n === 1 ? " character" : " characters") : "";
      post.classList.toggle("is-empty", !has);
    }
    ta.addEventListener("input", upd);
    if (prev) new MutationObserver(upd).observe(prev, { childList: true });
    new MutationObserver(upd).observe(ta, { attributes: true }); // value resets after posting
    setInterval(function () { if (doc.activeElement !== ta) upd(); }, 1000);
    upd();
  }
  /* poll carousel with nothing this viewer can see (e.g. all polls hidden from students): no arrows */
  function polls() {
    var sec = doc.getElementById("pollSection"); if (!sec) return;
    function upd() { var tr = doc.getElementById("pollCarouselTrack"); sec.classList.toggle("poll-view-empty", !!tr && tr.children.length === 0); }
    new MutationObserver(upd).observe(sec, { childList: true, subtree: true });
    upd();
  }
  function init() { EMPTY.forEach(wire); composer(); polls(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

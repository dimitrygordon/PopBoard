/* ui-toast.js — non-blocking toasts (replaces window.alert), a styled
   confirm modal (window.uiConfirm), button busy spinners and list skeletons.
   Loaded (defer) before login-alive.js so its alert() wrapper — which makes
   the login mascot shake its head on errors — still wraps this one. */
(function () {
  "use strict";
  var doc = document, win = window;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  win.__uiToasts = [];
  var host = null;
  function ensureHost() {
    if (host && doc.body.contains(host)) return host;
    host = doc.createElement("div"); host.className = "ui-toast-host"; host.setAttribute("aria-live", "polite"); host.setAttribute("role", "status");
    doc.body.appendChild(host); return host;
  }
  var ICON = {
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></svg>',
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/></svg>'
  };
  function classify(m) {
    if (/success|saved|copied|merged|done|created/i.test(m) && !/couldn|can't|cannot|wrong|fail/i.test(m)) return "success";
    if (/^thanks|waiting for approval|your account was created/i.test(m)) return "info";
    return "error";
  }
  function toast(message, opts) {
    opts = opts || {};
    var type = opts.type || classify(String(message));
    var el = doc.createElement("div");
    el.className = "ui-toast ui-toast-" + type;
    if (type === "error") el.setAttribute("role", "alert");
    var ic = doc.createElement("span"); ic.className = "ui-toast-icon"; ic.innerHTML = ICON[type] || ICON.info;
    var tx = doc.createElement("span"); tx.className = "ui-toast-text"; tx.textContent = String(message);
    el.appendChild(ic); el.appendChild(tx);
    var timer = null;
    function close() { if (!el.parentNode) return; clearTimeout(timer); el.classList.add("is-leaving"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduce ? 0 : 220); }
    if (opts.action) {
      var a = doc.createElement("button"); a.type = "button"; a.className = "ui-toast-action"; a.textContent = opts.action;
      a.onclick = function () { close(); try { opts.onAction && opts.onAction(); } catch (e) { console.error(e); } };
      el.appendChild(a);
    }
    var x = doc.createElement("button"); x.type = "button"; x.className = "ui-toast-close"; x.setAttribute("aria-label", "Dismiss"); x.innerHTML = "&times;"; x.onclick = close;
    el.appendChild(x);
    var h = ensureHost(); h.appendChild(el);
    while (h.children.length > 4) h.removeChild(h.firstChild);
    var ms = opts.duration || Math.min(9000, 3500 + String(message).length * 45);
    function arm() { timer = setTimeout(close, ms); }
    el.addEventListener("mouseenter", function () { clearTimeout(timer); });
    el.addEventListener("mouseleave", arm);
    el.addEventListener("focusin", function () { clearTimeout(timer); });
    arm();
    win.__uiToasts.push({ type: type, message: String(message), t: Date.now() });
    clearBusy();
    return { close: close, el: el };
  }
  win.uiToast = toast;
  // Every alert() in app.js becomes a toast. Same message text, same call
  // sites; login-alive.js wraps this to trigger the mascot's head shake.
  win.alert = function (message) { toast(message == null ? "" : message); };

  /* ---------- styled confirm ---------- */
  function uiConfirm(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var prevFocus = doc.activeElement;
      var back = doc.createElement("div"); back.className = "ui-modal-backdrop";
      var box = doc.createElement("div"); box.className = "ui-modal"; box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
      var id = "uiModalMsg" + Date.now(); box.setAttribute("aria-labelledby", id);
      var p = doc.createElement("p"); p.className = "ui-modal-text"; p.id = id; p.textContent = String(message);
      var row = doc.createElement("div"); row.className = "ui-modal-actions";
      var no = doc.createElement("button"); no.type = "button"; no.className = "ui-btn ui-btn-secondary ui-confirm-cancel"; no.textContent = opts.cancelLabel || "Cancel";
      var ok = doc.createElement("button"); ok.type = "button"; ok.className = "ui-btn " + (opts.danger === false ? "ui-btn-primary" : "ui-btn-danger") + " ui-confirm-ok"; ok.textContent = opts.confirmLabel || "Confirm";
      row.appendChild(no); row.appendChild(ok); box.appendChild(p); box.appendChild(row); back.appendChild(box); doc.body.appendChild(back);
      function done(v) { doc.removeEventListener("keydown", key, true); back.classList.add("is-leaving"); setTimeout(function () { back.remove(); }, reduce ? 0 : 160); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {} resolve(v); }
      function key(e) {
        if (e.key === "Escape") { e.preventDefault(); done(false); }
        else if (e.key === "Tab") { var f = [no, ok], i = f.indexOf(doc.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? 1 : 1)) % 2].focus(); }
      }
      no.onclick = function () { done(false); }; ok.onclick = function () { done(true); };
      back.addEventListener("mousedown", function (e) { if (e.target === back) done(false); });
      doc.addEventListener("keydown", key, true);
      setTimeout(function () { ok.focus(); }, 0);
    });
  }
  win.uiConfirm = uiConfirm;

  /* ---------- busy spinners on async submit buttons ---------- */
  var BUSY = ["joinBtn", "teacherSignInBtn", "teacherSignUpBtn", "createBoardBtn", "postBtn", "addStudentBtn", "studentEditSaveBtn"];
  var busyEl = null, busyIv = null, busyStart = 0, busySig = "";
  var VIEWS = ["login", "teacherLogin", "teacherSignup", "boardsPortal", "studentsPortal", "seatingMap", "studentDashboard", "app"];
  function sig() {
    var v = VIEWS.map(function (id) { var e = doc.getElementById(id); return e && !e.classList.contains("hidden") ? 1 : 0; }).join("");
    ["posts", "boardsList", "studentsList"].forEach(function (id) { var e = doc.getElementById(id); v += "|" + (e ? e.children.length : 0); });
    var pi = doc.getElementById("postInput"); return v + "|" + (pi && pi.value ? 1 : 0);
  }
  function clearBusy() {
    if (!busyEl) return;
    busyEl.classList.remove("is-busy"); busyEl.removeAttribute("aria-busy"); busyEl = null; clearInterval(busyIv);
  }
  doc.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("button");
    if (!b || BUSY.indexOf(b.id) < 0 || b.disabled) return;
    clearBusy(); busyEl = b; busyStart = Date.now();
    setTimeout(function () { // after the handler's own synchronous validation
      if (busyEl !== b) return; busySig = sig();
      b.classList.add("is-busy"); b.setAttribute("aria-busy", "true");
      busyIv = setInterval(function () {
        if (busyEl !== b) return;
        if (!b.offsetParent || sig() !== busySig || Date.now() - busyStart > 8000) clearBusy();
        else if (!b.classList.contains("is-busy")) b.classList.add("is-busy"); // survives className rewrites
      }, 150);
    }, 0);
  }, true);

  /* ---------- skeleton loaders for lists ---------- */
  var LISTS = [["posts", "app", 3], ["boardsList", "boardsPortal", 2], ["studentsList", "studentsPortal", 4]];
  function skeleton(list) {
    var c = doc.getElementById(list[0]), view = doc.getElementById(list[1]); if (!c || !view) return;
    var shown = false;
    new MutationObserver(function () {
      var vis = !view.classList.contains("hidden");
      if (vis && !shown) { shown = true; if (!c.children.length) start(); }
      if (!vis) shown = false;
    }).observe(view, { attributes: true, attributeFilter: ["class"] });
    function start() {
      c.setAttribute("data-ui-loading", "");
      var sk = doc.createElement("div"); sk.className = "ui-skeleton-list"; sk.setAttribute("aria-hidden", "true");
      for (var i = 0; i < list[2]; i++) { var r = doc.createElement("div"); r.className = "ui-skeleton-card"; r.innerHTML = "<i></i><i></i><i></i>"; sk.appendChild(r); }
      c.parentNode.insertBefore(sk, c);
      var stop = function () { c.removeAttribute("data-ui-loading"); if (sk.parentNode) sk.remove(); o.disconnect(); clearTimeout(tm); };
      var o = new MutationObserver(stop); o.observe(c, { childList: true });
      var tm = setTimeout(stop, 2500);
    }
  }
  function init() { LISTS.forEach(skeleton); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

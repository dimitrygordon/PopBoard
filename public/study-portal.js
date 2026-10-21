// Guest entry from the login page into the Study lab, and the way back.
// No Firebase. Teachers and students still return through board-return.js;
// a visit with no board goes home. Pure helpers are covered by node --test.

import { studyLibraryBackHref } from "./board-return.js";

export var PORTAL_ORIGIN_KEY = "popboard.portalOrigin";

export function finiteCoord(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

// A missing or unusable coordinate falls back one axis at a time, so a
// keyboard activation (no tap point) uses the pill center for both.
export function resolvePortalPoint(input, fallback) {
  var src = input || {};
  var fb = fallback || {};
  var x = finiteCoord(src.x);
  var y = finiteCoord(src.y);
  if (x == null) x = finiteCoord(fb.x);
  if (y == null) y = finiteCoord(fb.y);
  if (x == null) x = 0;
  if (y == null) y = 0;
  return { x: x, y: y };
}

export function serializePortalOrigin(point) {
  if (!point || finiteCoord(point.x) == null || finiteCoord(point.y) == null) return "";
  return JSON.stringify({ x: point.x, y: point.y });
}

export function parsePortalOrigin(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    var data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    var x = finiteCoord(data.x);
    var y = finiteCoord(data.y);
    if (x == null || y == null) return null;
    return { x: x, y: y };
  } catch (e) {
    return null;
  }
}

export function portalCssVars(point) {
  var clean = resolvePortalPoint(point, null);
  return { "--portal-x": clean.x + "px", "--portal-y": clean.y + "px" };
}

// Reduced motion skips the designer's hook and the scripted view
// transition. The page then navigates with a plain location assignment.
// Cross-document @view-transition is also turned off in that case.
export function portalNavPlan(opts) {
  var o = opts || {};
  var reduced = !!o.reducedMotion;
  return {
    runHook: !reduced,
    useViewTransition: !reduced && !!o.supportsViewTransition
  };
}

// Primary clicks are taken over so the hook can run. Modified clicks keep
// the real href (new tab, new window) and work with JavaScript off because
// this function is never called.
export function shouldInterceptActivation(event) {
  if (!event || event.defaultPrevented) return false;
  if (event.button && event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return true;
}

// Close destination. Same helper the gallery's Back link uses, so a guest
// with no board lands on ./ and a teacher or student returns to that board.
export function portalCloseHref(search) {
  return studyLibraryBackHref(search);
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function supportsViewTransition() {
  return typeof document.startViewTransition === "function";
}

function elementCenter(el, fallback) {
  if (!el || !el.getBoundingClientRect) return fallback;
  var r = el.getBoundingClientRect();
  if (!r.width && !r.height) return fallback;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pillCenter() {
  return elementCenter(document.querySelector("a.study-pill"), {
    x: (window.innerWidth || 0) / 2,
    y: Math.max(0, (window.innerHeight || 0) - 22)
  });
}

function moonCenter() {
  return elementCenter(document.querySelector(".study-portal-moon"), {
    x: (window.innerWidth || 0) / 2,
    y: 36
  });
}

function readOrigin() {
  var raw = "";
  try { raw = sessionStorage.getItem(PORTAL_ORIGIN_KEY) || ""; } catch (e) {}
  return parsePortalOrigin(raw);
}

function writeOrigin(point) {
  var vars = portalCssVars(point);
  var root = document.documentElement;
  root.style.setProperty("--portal-x", vars["--portal-x"]);
  root.style.setProperty("--portal-y", vars["--portal-y"]);
  try { sessionStorage.setItem(PORTAL_ORIGIN_KEY, serializePortalOrigin(point)); } catch (e) {}
}

function applyOrigin(point) {
  if (!point) return;
  var vars = portalCssVars(point);
  document.documentElement.style.setProperty("--portal-x", vars["--portal-x"]);
  document.documentElement.style.setProperty("--portal-y", vars["--portal-y"]);
}

function navigate(url, plan) {
  if (plan.useViewTransition) {
    try {
      // Cross-document @view-transition may start its own transition as
      // soon as location changes, which skips this same-document one.
      // Swallow that expected abort so it does not surface as an error.
      var vt = document.startViewTransition(function () { location.href = url; });
      var ignore = function () {};
      if (vt) {
        if (vt.ready && vt.ready.catch) vt.ready.catch(ignore);
        if (vt.updateCallbackDone && vt.updateCallbackDone.catch) vt.updateCallbackDone.catch(ignore);
        if (vt.finished && vt.finished.catch) vt.finished.catch(ignore);
      }
      return;
    } catch (e) { /* fall through to a plain navigation */ }
  }
  location.href = url;
}

function runHook(fn, arg) {
  if (typeof fn !== "function") return Promise.resolve();
  try {
    var result = fn(arg);
    if (result && typeof result.then === "function") return Promise.resolve(result);
  } catch (e) {
    console.error(e);
  }
  return Promise.resolve();
}

function open(input) {
  var point = resolvePortalPoint(input, pillCenter());
  writeOrigin(point);
  var plan = portalNavPlan({
    reducedMotion: prefersReducedMotion(),
    supportsViewTransition: supportsViewTransition()
  });
  var portal = window.studyPortal;
  var hook = plan.runHook && portal ? runHook(portal.onOpen, { x: point.x, y: point.y }) : Promise.resolve();
  return hook.then(function () { navigate("/study", plan); }, function (err) {
    console.error(err);
    navigate("/study", plan);
  });
}

function close() {
  var stored = readOrigin();
  var point = stored || (document.getElementById("studyBackBtn") ? moonCenter() : pillCenter());
  applyOrigin(point);
  var plan = portalNavPlan({
    reducedMotion: prefersReducedMotion(),
    supportsViewTransition: supportsViewTransition()
  });
  var portal = window.studyPortal;
  var hook = plan.runHook && portal ? runHook(portal.onClose, { x: point.x, y: point.y }) : Promise.resolve();
  return hook.then(function () { finishClose(plan); }, function (err) {
    console.error(err);
    finishClose(plan);
  });
}

function finishClose(plan) {
  // Only the Study gallery has a board to return to. On the login page
  // close() is the matching hook and does not navigate.
  if (!document.getElementById("studyBackBtn")) return;
  navigate(portalCloseHref(location.search), plan);
}

function bindActivation(el, fn) {
  if (!el || el.dataset.studyPortalBound) return;
  el.dataset.studyPortalBound = "1";
  el.addEventListener("click", function (e) {
    if (!shouldInterceptActivation(e)) return;
    e.preventDefault();
    fn(e);
  });
}

function install() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  // study.html reads the tap point for the reverse close animation.
  if (document.getElementById("studyBackBtn")) applyOrigin(readOrigin());

  window.studyPortal = {
    onOpen: null,
    onClose: null,
    open: function (input) { return open(input || {}); },
    close: function () { return close(); }
  };

  bindActivation(document.querySelector("a.study-pill"), function (e) {
    // Keyboard activation has no tap point (detail 0); open() then uses
    // the pill center. A real click passes the pointer coordinates.
    if (e.detail === 0) window.studyPortal.open({});
    else window.studyPortal.open({ x: e.clientX, y: e.clientY });
  });

  bindActivation(document.getElementById("studyBackBtn"), function () {
    window.studyPortal.close();
  });
}

install();

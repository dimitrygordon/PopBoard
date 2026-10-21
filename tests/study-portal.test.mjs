import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  PORTAL_ORIGIN_KEY,
  finiteCoord,
  resolvePortalPoint,
  serializePortalOrigin,
  parsePortalOrigin,
  portalCssVars,
  portalNavPlan,
  shouldInterceptActivation,
  portalCloseHref
} from "../public/study-portal.js";

const publicDir = new URL("../public/", import.meta.url);

function readPublic(name) {
  return readFileSync(new URL(name, publicDir), "utf8");
}

test("portal origin key is the sessionStorage name study.html reads", () => {
  assert.equal(PORTAL_ORIGIN_KEY, "popboard.portalOrigin");
  const portal = readPublic("study-portal.js");
  assert.match(portal, /popboard\.portalOrigin/);
  assert.match(portal, /--portal-x/);
  assert.match(portal, /--portal-y/);
});

test("a missing tap point uses the pill center, one axis at a time", () => {
  const center = { x: 180, y: 640 };
  assert.deepEqual(resolvePortalPoint(undefined, center), center);
  assert.deepEqual(resolvePortalPoint({}, center), center);
  assert.deepEqual(resolvePortalPoint({ x: 12 }, center), { x: 12, y: 640 });
  assert.deepEqual(resolvePortalPoint({ y: 9 }, center), { x: 180, y: 9 });
  assert.deepEqual(resolvePortalPoint({ x: 0, y: 0 }, center), { x: 0, y: 0 });
});

test("non-finite coordinates are ignored", () => {
  assert.equal(finiteCoord(0), 0);
  assert.equal(finiteCoord(NaN), null);
  assert.equal(finiteCoord(Infinity), null);
  assert.equal(finiteCoord("12"), null);
  assert.equal(finiteCoord(null), null);
  assert.deepEqual(
    resolvePortalPoint({ x: NaN, y: Infinity }, { x: 4, y: 5 }),
    { x: 4, y: 5 }
  );
});

test("origin round-trips and rejects garbage", () => {
  const raw = serializePortalOrigin({ x: 12.5, y: 40 });
  assert.deepEqual(parsePortalOrigin(raw), { x: 12.5, y: 40 });
  assert.equal(parsePortalOrigin(""), null);
  assert.equal(parsePortalOrigin("{"), null);
  assert.equal(parsePortalOrigin("[]"), null);
  assert.equal(parsePortalOrigin("null"), null);
  assert.equal(parsePortalOrigin(JSON.stringify({ x: "12", y: 3 })), null);
  assert.equal(serializePortalOrigin({ x: NaN, y: 1 }), "");
  assert.deepEqual(portalCssVars({ x: 8, y: 9 }), { "--portal-x": "8px", "--portal-y": "9px" });
});

test("reduced motion skips the hook and the scripted view transition", () => {
  assert.deepEqual(portalNavPlan({ reducedMotion: true, supportsViewTransition: true }), {
    runHook: false,
    useViewTransition: false
  });
  assert.deepEqual(portalNavPlan({ reducedMotion: false, supportsViewTransition: true }), {
    runHook: true,
    useViewTransition: true
  });
  assert.deepEqual(portalNavPlan({ reducedMotion: false, supportsViewTransition: false }), {
    runHook: true,
    useViewTransition: false
  });
  assert.deepEqual(portalNavPlan({}), { runHook: true, useViewTransition: false });
});

test("only an unmodified primary click is taken over", () => {
  assert.equal(shouldInterceptActivation({ button: 0 }), true);
  assert.equal(shouldInterceptActivation({}), true);
  assert.equal(shouldInterceptActivation(null), false);
  assert.equal(shouldInterceptActivation({ defaultPrevented: true }), false);
  assert.equal(shouldInterceptActivation({ button: 1 }), false);
  assert.equal(shouldInterceptActivation({ button: 0, metaKey: true }), false);
  assert.equal(shouldInterceptActivation({ button: 0, ctrlKey: true }), false);
  assert.equal(shouldInterceptActivation({ button: 0, shiftKey: true }), false);
  assert.equal(shouldInterceptActivation({ button: 0, altKey: true }), false);
});

test("close uses the board-return helper: home with no board, board when known", () => {
  assert.equal(portalCloseHref(""), "./");
  assert.equal(portalCloseHref("?teacher=t1"), "./");
  assert.equal(portalCloseHref("?emulators=1"), "./?emulators=1");
  assert.equal(portalCloseHref("?board=b1&pbreturn=teacher"), "./?board=b1&pbreturn=teacher");
  const student = portalCloseHref("?board=b1&student=s1&name=Ada&pbreturn=student&emulators=1");
  assert.match(student, /^\.\//);
  assert.match(student, /board=b1/);
  assert.match(student, /student=s1/);
  assert.match(student, /pbreturn=student/);
  assert.match(student, /emulators=1/);
  const portal = readPublic("study-portal.js");
  assert.match(portal, /studyLibraryBackHref/);
  assert.match(portal, /onOpen/);
  assert.match(portal, /onClose/);
  assert.match(portal, /startViewTransition/);
  assert.match(portal, /prefers-reduced-motion/);
});

test("login page pill, prefetch, and view transition match the designer spec", () => {
  const html = readPublic("index.html");
  const css = readPublic("style.css");
  assert.match(html, /<link rel="prefetch" href="\/study"\s*\/>/);
  assert.match(html, /@view-transition\s*\{\s*navigation:\s*auto;\s*\}/);
  assert.match(html, /class="study-pill" href="\/study" aria-label="Explore the Study Lab, no account needed"/);
  assert.match(html, /class="study-pill-moon" aria-hidden="true"/);
  assert.match(html, /Explore the Study Lab/);
  assert.match(html, /study-portal\.js/);
  const loginAt = html.indexOf('id="login"');
  const pillAt = html.indexOf('class="study-pill"');
  const teacherAt = html.indexOf('id="teacherLogin"');
  assert.ok(loginAt !== -1 && pillAt > loginAt && teacherAt > pillAt, "pill sits after the login card");
  assert.match(css, /view-transition-name:\s*study-moon/);
  assert.match(css, /height:\s*44px/);
  assert.match(css, /rgba\(255,\s*255,\s*255,\s*0?\.25\)/);
  assert.match(css, /Fredoka/);
  assert.doesNotMatch(readPublic("login-alive.css"), /study-pill/);
  assert.doesNotMatch(readPublic("login-alive.js"), /studyPortal/);
});

test("study gallery shares the moon transition and does not require a board", () => {
  const html = readPublic("study.html");
  assert.match(html, /@view-transition\s*\{\s*navigation:\s*auto;\s*\}/);
  assert.match(html, /class="study-portal-moon"/);
  assert.match(html, /view-transition-name:\s*study-moon/);
  assert.match(html, /study-portal\.js/);
  assert.match(html, /studyLibraryBackHref/);
  assert.match(html, /href="\.\/"/);
  assert.match(html, /if \(!boardParam\) \{ return ""; \}/);
});

test("study pages do not sign a guest in or bounce them to the login screen", () => {
  const names = readdirSync(publicDir).filter((name) => name === "study.html" || /^study-.*\.html$/.test(name));
  assert.ok(names.length >= 16);
  for (const name of names) {
    const html = readPublic(name);
    assert.doesNotMatch(html, /signInAnonymously|signInWith|onAuthStateChanged|location\.replace\(/, name);
    if (name !== "study.html" && name !== "study-checkride.html") {
      assert.doesNotMatch(html, /firebase-auth|firebase-firestore|getAuth\(/, name);
    }
  }
  const checkride = readPublic("study-checkride.html");
  assert.match(checkride, /if \(!window\.__studyIdentity\)/);
  assert.match(checkride, /if \(identity\)/);
  const machines = readPublic("machines-ui.js");
  const pendulum = readPublic("pendulum-ui.js");
  assert.match(machines, /study\.html"\s*\+\s*location\.search/);
  assert.match(pendulum, /study\.html"\s*\+\s*location\.search/);
  assert.doesNotMatch(machines, /getAuth|firebase/);
  assert.doesNotMatch(pendulum, /getAuth|firebase/);
});

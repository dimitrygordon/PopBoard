// Unit checks for the shared layout rule (public/shared/layout/layout.js) that need no browser.
import test from "node:test";
import assert from "node:assert/strict";
import { halfUnder, MIN_TEXT_PX } from "../public/shared/layout/layout.js";

const cap = (bottom) => ({ getBoundingClientRect: () => ({ bottom }) });

test("text floor is 13px", () => assert.equal(MIN_TEXT_PX, 13));

test("half stop sits right under the caption", () => {
  globalThis.innerHeight = 800;
  assert.equal(halfUnder(cap(400), 100, 700), 392); // 800 - 400 - 8 gap
  assert.equal(halfUnder(cap(400), 100, 700, 0), 400);
});

test("half stop stays between peek and full", () => {
  globalThis.innerHeight = 800;
  assert.equal(halfUnder(cap(780), 120, 700), 121); // caption near the bottom: just above peek
  assert.equal(halfUnder(cap(20), 120, 700), 699);  // caption near the top: just below full
});

test("half stop falls back when the caption is not laid out yet", () => {
  globalThis.innerHeight = 800;
  assert.equal(halfUnder(cap(0), 100, 700), 360);
  assert.equal(halfUnder(null, 100, 700), 360);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("Patoka Valley is registered in the study library", () => {
  const html = read("public/study.html");
  assert.match(html, /id: "patoka-valley"/);
  assert.match(html, /file: "study-patoka-valley\.html"/);
});

test("study page uses the shared back convention and does not sign anyone in", () => {
  const html = read("public/study-patoka-valley.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /astro-course\/story-return\.js/);
  assert.match(html, /id="resetViewBtn"/);
  assert.match(html, /id="landmark-btn"/);
  assert.match(html, /world\/world\.js/);
  assert.doesNotMatch(html, /firebase|signInAnonymously|getAuth\(/);
});

test("login page no longer loads the 3D valley or hidden-world hooks", () => {
  const html = read("public/index.html");
  assert.doesNotMatch(html, /hidden-world/);
  assert.doesNotMatch(html, /world\/world\.js/);
  assert.doesNotMatch(html, /pb-valley-world/);
  // Prior lightweight login backdrop stays.
  assert.match(html, /login-sky\.js/);
  assert.match(html, /login-alive\.js/);
});

test("world.js loads assets from its own folder and exposes Reset view", () => {
  const js = read("public/world/world.js");
  assert.match(js, /function worldUrl/);
  assert.match(js, /import\.meta\.url/);
  assert.match(js, /worldUrl\("data\/height\.png"\)/);
  assert.match(js, /worldUrl\("models\/" \+ list\[i\]\)/);
  assert.doesNotMatch(js, /loadImageData\("\.\/data\//);
  assert.match(js, /function resetView/);
  assert.match(js, /resetView: resetView/);
  assert.match(js, /function bindModuleChrome/);
  assert.match(js, /LIGHT_CLIENT/);
  assert.match(js, /study\.html" \+ location\.search/);
});

test("valley data and fallback still exist", () => {
  assert.ok(existsSync(new URL("public/world/fallback.jpg", root)));
  assert.ok(existsSync(new URL("public/world/data/height.png", root)));
  assert.ok(existsSync(new URL("public/world/data/cover.png", root)));
  assert.ok(existsSync(new URL("public/world/data/meta.json", root)));
});

test("old /world/ path is redirected to the module", () => {
  const redir = read("public/_redirects");
  assert.match(redir, /\/world\s+\/study-patoka-valley\s+302/);
  const index = read("public/world/index.html");
  assert.match(index, /\/study-patoka-valley/);
});

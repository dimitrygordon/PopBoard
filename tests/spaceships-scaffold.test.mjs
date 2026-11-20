import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const fleet = JSON.parse(read("public/spaceships/fleet.json"));
const docs = read("docs/spaceships-assets.md");

test("the module is registered in the study library", () => {
  const html = read("public/study.html");
  assert.match(html, /id: "spaceships"/);
  assert.match(html, /file: "study-spaceships\.html"/);
});

test("study pages use the shared back convention and do not sign anyone in", () => {
  for (const name of ["public/study-spaceships.html", "public/study-spaceship.html"]) {
    const html = read(name);
    assert.match(html, /data-study-back/);
    assert.match(html, /astro-course\/story-return\.js/);
    assert.doesNotMatch(html, /firebase|signInAnonymously|getAuth\(/);
  }
  assert.match(read("public/spaceships/ss-gallery.js"), /study\.html/);
  assert.match(read("public/spaceships/ss-viewer.js"), /study-spaceships\.html/);
});

test("pages load shared layout, Jost, Leo colors, and reduced-motion rules", () => {
  const css = read("public/spaceships/spaceships.css");
  for (const htmlFile of ["public/study-spaceships.html", "public/study-spaceship.html"]) {
    assert.match(read(htmlFile), /shared\/layout\/layout\.css/);
    assert.match(read(htmlFile), /spaceships\/spaceships\.css/);
  }
  assert.match(css, /font-family: "Jost"/);
  assert.match(css, /#000000|#000\b/);
  assert.match(css, /#4caf50/i);
  assert.match(css, /#cccccc/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 390px/);
});

test("model-viewer is vendored at 4.4.0 and only loaded on the detail page", () => {
  const version = read("public/vendor/model-viewer/VERSION").trim();
  assert.equal(version, "4.4.0");
  const min = new URL("public/vendor/model-viewer/model-viewer.min.js", root);
  assert.ok(existsSync(min), "missing model-viewer.min.js");
  const size = statSync(min).size;
  assert.ok(size > 500_000 && size < 2_000_000, `unexpected size ${size}`);
  assert.ok(existsSync(new URL("public/vendor/model-viewer/LICENSE", root)));
  const notices = read("THIRD-PARTY-NOTICES.md");
  assert.match(notices, /@google\/model-viewer 4\.4\.0/);
  assert.match(notices, /public\/vendor\/model-viewer\/model-viewer\.min\.js/);
  const detail = read("public/study-spaceship.html");
  assert.match(detail, /vendor\/model-viewer\/model-viewer\.min\.js/);
  assert.match(detail, /<model-viewer/);
  assert.match(detail, /camera-controls/);
  assert.match(detail, /touch-action="pan-y"/);
  assert.match(detail, /ar-modes="webxr scene-viewer quick-look"/);
  assert.match(detail, /ar-scale="fixed"/);
  const gallery = read("public/study-spaceships.html") + read("public/spaceships/ss-gallery.js");
  assert.doesNotMatch(gallery, /model-viewer/);
  assert.doesNotMatch(gallery, /\.glb|\.usdz/);
});

test("fleet.json has 12 to 16 craft, required fields, and labelled placeholder facts", () => {
  assert.equal(fleet.schemaVersion, 1);
  assert.ok(Array.isArray(fleet.craft));
  assert.ok(fleet.craft.length >= 12 && fleet.craft.length <= 16, fleet.craft.length);
  const ids = new Set();
  for (const craft of fleet.craft) {
    assert.match(craft.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(ids.has(craft.id), false, `duplicate id ${craft.id}`);
    ids.add(craft.id);
    assert.ok(craft.name);
    assert.ok(craft.still.startsWith("stills/") && craft.still.endsWith(".webp"));
    assert.ok(craft.glb.startsWith("models/") && craft.glb.endsWith(".glb"));
    assert.ok(craft.usdz.startsWith("models/") && craft.usdz.endsWith(".usdz"));
    assert.equal(craft.credit, "3D model courtesy NASA");
    assert.match(craft.sourceUrl, /^https:\/\/science\.nasa\.gov\/3d-resources\/?$/);
    assert.ok(Array.isArray(craft.facts) && craft.facts.length >= 1);
    for (const row of craft.facts) {
      assert.ok(row.label);
      assert.match(row.value, /PLACEHOLDER/);
      assert.equal(row.verified, false);
    }
    assert.match(craft.subtitle, /PLACEHOLDER/);
    assert.equal(craft.placeholder, true);
    const stillPath = new URL("public/spaceships/" + craft.still, root);
    assert.ok(existsSync(stillPath), `missing still ${craft.still}`);
    // Expected NASA files are not shipped yet.
    assert.equal(existsSync(new URL("public/spaceships/" + craft.glb, root)), false);
    assert.equal(existsSync(new URL("public/spaceships/" + craft.usdz, root)), false);
  }
  assert.ok(existsSync(new URL("public/spaceships/" + fleet.placeholderGlb, root)));
  assert.ok(existsSync(new URL("public/spaceships/" + fleet.placeholderStill, root)));
});

test("docs list the exact asset paths and fleet.json fields Angelo needs", () => {
  assert.match(docs, /study-spaceships\.html/);
  assert.match(docs, /study-spaceship\.html\?id=<id>/);
  assert.match(docs, /models\/<id>\.glb/);
  assert.match(docs, /models\/<id>\.usdz/);
  assert.match(docs, /stills\/<id>\.webp/);
  assert.match(docs, /models\/_placeholder\.glb/);
  for (const field of ["id", "name", "still", "glb", "usdz", "credit", "sourceUrl", "facts", "placeholder", "tags", "listed", "subtitle", "sourceLabel"]) {
    assert.match(docs, new RegExp("`" + field + "`"));
  }
  for (const craft of fleet.craft) {
    assert.match(docs, new RegExp("`" + craft.id + "`"));
  }
});

test("the viewer falls back to the placeholder GLB, honors reduced motion, and probes USDZ", () => {
  const js = read("public/spaceships/ss-viewer.js");
  assert.match(js, /assetExists/);
  assert.match(js, /placeholderGlb/);
  assert.match(js, /fallbackBanner/);
  assert.match(js, /ios-src/);
  assert.match(js, /reducedMotion/);
  assert.match(js, /auto-rotate/);
  assert.match(js, /canActivateAR|activateAR/);
  assert.match(read("public/study-spaceship.html"), /View in your space/);
  assert.match(js, /3D model courtesy NASA|craft\.credit/);
});

test("placeholder GLB is a valid 1 m Y-up box", () => {
  const buf = readFileSync(new URL("public/spaceships/models/_placeholder.glb", root));
  assert.equal(buf.subarray(0, 4).toString(), "glTF");
  const total = buf.readUInt32LE(8);
  assert.equal(total, buf.length);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const acc = json.accessors[0];
  assert.deepEqual(acc.min, [-0.5, -0.5, -0.5]);
  assert.deepEqual(acc.max, [0.5, 0.5, 0.5]);
  assert.equal(json.extras.units, "meters");
  assert.equal(json.extras.up, "Y");
});

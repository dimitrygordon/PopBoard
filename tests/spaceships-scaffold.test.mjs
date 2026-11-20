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
  const decoder = new URL("public/vendor/model-viewer/meshopt_decoder.js", root);
  assert.ok(existsSync(decoder), "missing meshopt_decoder.js");
  assert.ok(existsSync(new URL("public/vendor/model-viewer/meshopt.LICENSE", root)));
  assert.match(notices, /meshoptimizer meshopt decoder 1\.2/);
  const hook = read("public/study-spaceship.html");
  const decIdx = hook.indexOf("meshoptDecoderLocation");
  const mvIdx = hook.indexOf("vendor/model-viewer/model-viewer.min.js");
  assert.ok(decIdx !== -1 && mvIdx !== -1 && decIdx < mvIdx, "meshoptDecoderLocation must be set before model-viewer loads");
  assert.match(hook, /meshoptDecoderLocation:\s*["']vendor\/model-viewer\/meshopt_decoder\.js["']/);
});

test("fleet.json has 19 listed craft, real assets, and verified fact rows", () => {
  assert.equal(fleet.schemaVersion, 1);
  assert.ok(Array.isArray(fleet.craft));
  assert.equal(fleet.craft.length, 19, fleet.craft.length);
  const ids = fleet.craft.map((c) => c.id);
  for (const extra of ["iss", "saturn-v", "space-shuttle"]) {
    assert.ok(ids.includes(extra), `missing extra ${extra}`);
  }
  const unique = new Set();
  for (const craft of fleet.craft) {
    assert.match(craft.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(unique.has(craft.id), false, `duplicate id ${craft.id}`);
    unique.add(craft.id);
    assert.ok(craft.name);
    assert.equal(craft.listed, true);
    assert.ok(craft.still.startsWith("stills/") && craft.still.endsWith(".webp"));
    assert.ok(craft.glb.startsWith("models/") && craft.glb.endsWith(".glb"));
    assert.ok(craft.usdz.startsWith("models/") && craft.usdz.endsWith(".usdz"));
    assert.equal(craft.credit, "3D model courtesy NASA");
    assert.match(craft.sourceUrl, /^https:\/\/science\.nasa\.gov\/3d-resources\//);
    assert.ok(Array.isArray(craft.facts) && craft.facts.length >= 1);
    for (const row of craft.facts) {
      assert.ok(row.label);
      assert.ok(row.value);
      assert.doesNotMatch(row.value, /PLACEHOLDER/);
      assert.equal(row.verified, true);
    }
    assert.equal(craft.placeholder, false);
    assert.ok(existsSync(new URL("public/spaceships/" + craft.still, root)), `missing still ${craft.still}`);
    assert.ok(existsSync(new URL("public/spaceships/" + craft.glb, root)), `missing glb ${craft.glb}`);
    assert.ok(existsSync(new URL("public/spaceships/" + craft.usdz, root)), `missing usdz ${craft.usdz}`);
    if (craft.id === "iss" || craft.id === "chandra") {
      assert.equal(craft.cameraOrbit, "45deg 70deg auto");
    }
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
  for (const field of ["id", "name", "still", "glb", "usdz", "credit", "sourceUrl", "facts", "placeholder", "tags", "listed", "subtitle", "sourceLabel", "cameraOrbit", "sources", "recheckBeforePublish"]) {
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
  assert.match(js, /camera-orbit/);
  assert.match(js, /cameraOrbit/);
  assert.match(read("public/study-spaceship.html"), /View in your space/);
  assert.match(js, /3D model courtesy NASA|craft\.credit/);
});

test("Tesla fact-check wording and sources are applied, and all rows are verified", () => {
  const expect = {
    "voyager|Status": "Both are still in contact from interstellar space. Since Nov. 14, 2026, Voyager 1 has sent only a basic radio signal and no data while engineers work on a computer problem.",
    "perseverance|Status": "Operating (as of Nov 2026). Science is paused while engineers fix a radio problem.",
    "galileo|Mass": "2,223 kg for the orbiter at launch, with fuel. The probe added another 339 kg.",
    "viking-lander|Mass": "572 kg without fuel (657 kg fueled at launch)",
    "perseverance|Fun fact": "Perseverance carries two microphones. In 2021 it made the first audio recording on Mars using a microphone, capturing a Martian breeze.",
    "juno|Fun fact": "At Jupiter, Juno's huge solar arrays make only about 500 watts, enough for about five old-style 100-watt light bulbs. Near Earth, the same arrays would make about 14,000 watts.",
    "tess|Real size": "about 3.9 m across its solar panels",
    "juno|Status": "Operating in an extended mission (last confirmed mid-2026)",
    "cassini-huygens|Fun fact": "Cassini found evidence of a global ocean of liquid water under the icy crust of Saturn's moon Enceladus.",
    "iss|Mass": "about 420,000 kg (925,000 pounds)",
    "voyager|Mass": "about 722 kg each at launch"
  };
  const found = {};
  let verified = 0;
  for (const craft of fleet.craft) {
    for (const row of craft.facts) {
      assert.equal(row.verified, true, `${craft.id} ${row.label}`);
      verified += 1;
      const key = craft.id + "|" + row.label;
      if (expect[key]) {
        found[key] = row;
        assert.equal(row.value, expect[key]);
        assert.ok(Array.isArray(row.sources) && row.sources.length >= 1, key);
        assert.ok(row.sources.every((u) => /^https?:\/\//.test(u)), key);
      }
    }
  }
  assert.equal(Object.keys(found).length, 11);
  assert.equal(verified, 151);
  assert.equal(found["voyager|Status"].recheckBeforePublish, true);
  assert.equal(found["perseverance|Status"].recheckBeforePublish, true);
  assert.match(docs, /recheckBeforePublish/);
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

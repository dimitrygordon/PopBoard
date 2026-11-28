// Beyond 3D VR narration: one clip per page, mapped by the manifest, recordings drop in by filename.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { PAGES, DECK } from "../public/fourth-dimension/vr/vr4d-book.js";
import { wordsFromChars } from "../tools/fourth-dimension/narration-words.mjs";

const root = new URL("../", import.meta.url);
const audioDir = "public/fourth-dimension/audio/vr4d/";
const read = (p) => readFileSync(new URL(p, root), "utf8");

test("manifest lists every page and each page maps to s<N>.mp3 and s<N>.json", () => {
  const manifest = JSON.parse(read("public/fourth-dimension/audio/manifest.json"));
  assert.equal(DECK, "vr4d");
  assert.deepEqual(manifest[DECK], PAGES.map((p) => p.n));
  for (const n of manifest[DECK]) {
    assert.ok(statSync(new URL(`${audioDir}s${n}.mp3`, root)).size > 2000, `s${n}.mp3`);
    const json = JSON.parse(read(`${audioDir}s${n}.json`));
    assert.equal(json.words.map((w) => w.w).join(" "), PAGES.find((p) => p.n === n).text);
  }
});

test("clips are mono MP3 at 96 kbps or less and the set stays small", () => {
  let total = 0;
  for (const p of PAGES) {
    const buf = readFileSync(new URL(`${audioDir}s${p.n}.mp3`, root));
    total += buf.length;
    let i = 0;
    if (buf.slice(0, 3).toString() === "ID3") i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
    while (i < buf.length - 4 && !(buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0)) i++;
    const kbps = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160][buf[i + 2] >> 4]; // MPEG-2 layer III table
    assert.equal(buf[i + 3] >> 6, 3, `s${p.n} is mono`);
    assert.ok(kbps && kbps <= 96, `s${p.n} bitrate ${kbps}`);
  }
  assert.ok(total < 3 * 1024 * 1024, `total ${total}`);
});

test("word times are ordered and inside the clip", () => {
  for (const p of PAGES) {
    const { words, duration } = JSON.parse(read(`${audioDir}s${p.n}.json`));
    let last = -1;
    for (const w of words) {
      assert.ok(w.start >= last && w.end > w.start && w.end <= duration + 0.1, `s${p.n} ${w.w}`);
      last = w.start;
    }
  }
});

test("wordsFromChars pairs timestamps with the caption's own words", () => {
  const text = "Hi, big 3D world.";
  const chars = [...text];
  const times = chars.map((_, i) => [i * 0.1, i * 0.1 + 0.1]);
  const words = wordsFromChars(text, chars, times, 2);
  assert.deepEqual(words.map((w) => w.w), ["Hi,", "big", "3D", "world."]);
  assert.equal(words[1].start, 0.4);
  assert.equal(words[3].end, 2);
  assert.ok(words.every((w, i) => i === 0 || w.start >= words[i - 1].start));
});

test("README documents the Leo voice, the grok renderer, and the drop-in rule", () => {
  const readme = read(`${audioDir}README.md`);
  assert.match(readme, /Leo/);
  assert.match(readme, /render-vr-narration-grok\.mjs/);
  assert.match(readme, /Replace the files by the same filename/);
  const script = read("tools/fourth-dimension/render-vr-narration-grok.mjs");
  assert.match(script, /DEFAULT_VOICE = \"leo\"/);
});

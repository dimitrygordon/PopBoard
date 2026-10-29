// Printing / Save as PDF must show the static logo, not the animated rig.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8");
const printBlocks = (css) => css.match(/@media print\s*\{[\s\S]*?\n\}/g) || [];

test("login-alive.css hides the animated rig and shows the static logo in print", () => {
  const blocks = printBlocks(read("login-alive.css")).join("\n");
  assert.match(blocks, /\.la-rig[^{]*\{[^}]*display:\s*none/);
  assert.match(blocks, /img\.la-src[^{]*\{[^}]*opacity:\s*1/);
});

test("style.css stops the logo wiggle animation in print", () => {
  const blocks = printBlocks(read("style.css")).join("\n");
  assert.match(blocks, /#logo-img[^{]*\{[^}]*animation:\s*none/);
});

test("the static logo the print rule falls back to exists", () => {
  assert.ok(readFileSync(new URL("../public/popboard-logo.png", import.meta.url)).length > 0);
  assert.match(read("index.html"), /id="login-logo-img"[^>]*|src="\/popboard-logo\.png"/);
});

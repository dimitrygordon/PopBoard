// Squircle corners (public/shared/corners). Every page links the rule, every radius sits on the scale,
// and the Safari mask is the right shape.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === "vendor" ? [] : walk(p)) : [p]; });
const pages = walk(PUB).filter((p) => p.endsWith(".html") && /<\/head>/i.test(readFileSync(p, "utf8")) && !/[\\/]geometry[\\/]|study-geometry/.test(p));

test("every page links corners.css and corners.js", () => {
  assert.ok(pages.length > 50);
  for (const p of pages) {
    const s = readFileSync(p, "utf8");
    assert.match(s, /href="\/shared\/corners\/corners\.css[^"]*"/, p);
    assert.match(s, /src="\/shared\/corners\/corners\.js[^"]*"/, p);
  }
});

test("no card-sized radius is left off the squircle scale (tools/corners/migrate.py --check)", () => {
  execFileSync("python3", [join(ROOT, "tools/corners/migrate.py"), "--check"], { stdio: "pipe" });
});

test("corners.css: native squircle behind @supports, plain radius when unsupported, tokens 6..39", () => {
  const css = readFileSync(join(PUB, "shared/corners/corners.css"), "utf8");
  assert.match(css, /@supports \(corner-shape: squircle\) \{\s*:root \{ --sq-k: 1\.4; \}/);
  assert.match(css, /:root \{\s*--sq-k: 1;/);
  for (let n = 6; n < 40; n++) assert.ok(css.includes(`--r-${n}: calc(${n}px * var(--sq-k));`), n);
  assert.match(css, /\[style\*="border-radius"\] \{ corner-shape: round !important;/);
});

function loadCorners({ native = false, search = "", boxShadow = "none" } = {}) {
  const attrs = new Map(), classes = new Set(), props = new Map();
  const el = { nodeType: 1, nodeName: "DIV", namespaceURI: "x", children: [], style: { setProperty: (k, v) => props.set(k, v), removeProperty: (k) => props.delete(k) },
    setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) };
  const html = { namespaceURI: "x", classList: { add: (c) => classes.add(c) } };
  const doc = { documentElement: html, body: el, readyState: "complete", createTreeWalker: () => ({ nextNode: () => null }), addEventListener() {} };
  const cs = { getPropertyValue: () => "1", display: "block", maskImage: "none", backdropFilter: "none", boxShadow,
    borderTopLeftRadius: "16px", borderTopRightRadius: "16px", borderBottomRightRadius: "0px", borderBottomLeftRadius: "4px" };
  const win = { CSS: { supports: (p) => (p === "corner-shape" ? native : true) }, location: { search }, document: doc, getComputedStyle: () => cs,
    MutationObserver: class { observe() {} }, addEventListener() {}, setTimeout, clearTimeout };
  win.window = win;
  vm.runInNewContext(readFileSync(join(PUB, "shared/corners/corners.js"), "utf8"), win);
  return { attrs, classes, props };
}

test("corners.js does nothing where corner-shape is native", () => {
  const r = loadCorners({ native: true });
  assert.equal(r.classes.size, 0); assert.equal(r.attrs.size, 0);
});

test("corners.js masks a marked box in Safari: squircle slivers only on real corners, mask reaches past the box", () => {
  const r = loadCorners();
  assert.ok(r.classes.has("sq-fb"));
  assert.ok(r.attrs.has("data-sq-m"));
  const v = r.props.get("--sq-mbi");
  assert.match(v, / fill \/ 64px 64px 52px 64px \/ 48px stretch$/);
  const svg = decodeURIComponent(v.match(/data:image\/svg\+xml,([^"]+)/)[1]);
  assert.equal((svg.match(/Z/g) || []).length, 3, "outer frame + two 16px corners; the 0 and 4px corners stay square/plain");
  assert.ok(svg.includes('fill-rule="evenodd"'));
});

test("the Safari mask reaches past a big soft shadow so it is not cut off", () => {
  const r = loadCorners({ boxShadow: "rgba(0, 0, 0, 0.3) 0px -10px 60px 0px, rgb(0, 0, 0) 2px 2px 0px 0px, rgba(0, 0, 0, 0.2) 0px 0px 0px 400px inset" });
  assert.match(r.props.get("--sq-mbi"), / \/ 74px stretch$/); // 10 + 60 + 4; the inset layer does not count
});

test("?sq=off leaves the page alone", () => {
  const r = loadCorners({ search: "?sq=off" });
  assert.equal(r.classes.size, 0);
});

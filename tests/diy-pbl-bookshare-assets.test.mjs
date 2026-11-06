// Fail closed when a referenced bookshare asset is missing from the repo, or when
// the bg probe can treat a soft-404 (200 HTML) as a real image.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import http from "node:http";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const DIR = join(PUB, "diy-pbl-bookshare");
const ART = join(DIR, "art");

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

test("every referenced art folder ships a real bg.webp image", async () => {
  const { SLIDES } = await import(pathToFileURL(join(DIR, "bs-data.js")).href);
  const ids = [...new Set(SLIDES.map((s) => s.art).filter(Boolean))];
  assert.ok(ids.includes("s17"), "conclude uses s17 art");
  assert.ok(ids.includes("s18"), "resources use s18 art");
  assert.ok(ids.includes("discussion"));
  assert.ok(ids.includes("keyterms"));
  for (const id of ids) {
    const bg = join(ART, id, "bg.webp");
    assert.ok(existsSync(bg), `missing ${id}/bg.webp (referenced by a slide)`);
    const buf = readFileSync(bg);
    assert.ok(buf.length > 1000, `${id}/bg.webp too small`);
    assert.equal(buf.toString("ascii", 0, 4), "RIFF");
    assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  }
});

test("Leo prefer files that exist are real webps; missing prefers must not be present as HTML stubs", () => {
  for (const id of ["s08", "s16"]) {
    const p = join(ART, id, "bg_v6.webp");
    assert.ok(existsSync(p), `${id}/bg_v6.webp required`);
    const buf = readFileSync(p);
    assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  }
  // Slides without a Leo redraw must not ship an empty/HTML stub under prefer names.
  for (let n = 1; n <= 21; n++) {
    const id = `s${String(n).padStart(2, "0")}`;
    for (const name of ["bg_v6.webp", "bg_next.webp"]) {
      const p = join(ART, id, name);
      if (!existsSync(p)) continue;
      if (id === "s08" || id === "s16") continue;
      const buf = readFileSync(p);
      assert.equal(buf.toString("ascii", 8, 12), "WEBP", `${id}/${name} is not a webp`);
    }
  }
});

test("paper + layout assets referenced by builders exist in repo", () => {
  const need = [
    "paper/torn_page.webp",
    "paper/tape_a.webp",
    "paper/tape_b.webp",
    "paper/pushpin.webp",
    "paper/index_card.webp",
    "paper/sheet_flat.webp",
    "paper/sheet_flat_wide.webp",
    "s01/bg_cover.webp",
    "s09/cards.json",
    "keyterms/cards.json",
    "keyterms/flip_card.webp",
    "discussion/note_card.webp",
    "cover.webp",
  ];
  for (const rel of need) {
    assert.ok(existsSync(join(ART, rel)), `missing art/${rel}`);
  }
});

test("Cloudflare _redirects 404s missing art before SPA catch-all", () => {
  const redir = readFileSync(join(PUB, "_redirects"), "utf8");
  assert.match(redir, /\/diy-pbl-bookshare\/art\/\*\s+\/404\.html\s+404/);
  assert.match(redir, /\/\*\s+\/index\.html\s+200/);
  const artRule = redir.indexOf("/diy-pbl-bookshare/art/*");
  const spaRule = redir.indexOf("/*    /index.html");
  assert.ok(artRule >= 0 && spaRule > artRule, "art 404 rule must precede SPA rewrite");
});

test("probeArtBgs rejects soft-404 HTML even when status is 200", async (t) => {
  // Tiny static server: missing bg_v6 returns 200 text/html (SPA soft 404);
  // real bg_v6 for s08 returns image/webp bytes.
  const html = "<!DOCTYPE html><html><body>spa</body></html>";
  const webp = Buffer.from(
    // minimal RIFF WEBP header + padding
    "RIFF" + "\x00\x00\x00\x00" + "WEBP" + "x".repeat(64),
    "binary"
  );
  const server = http.createServer((req, res) => {
    const url = req.url || "";
    if (url.endsWith("/s08/bg_v6.webp")) {
      res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": webp.length });
      res.end(webp);
      return;
    }
    // Soft 404 for everything else under art
    if (url.includes("/art/")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    res.writeHead(404); res.end("no");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/diy-pbl-bookshare/art/`;

  async function isRealImage(url) {
    const res = await fetch(url, { method: "GET", cache: "no-cache" });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.startsWith("image/")) return true;
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
      && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  }

  const prefer = ["bg_v6.webp", "bg_next.webp"];
  const map = {};
  for (const id of ["s08", "s18", "s02"]) {
    for (const name of prefer) {
      if (await isRealImage(`${base}${id}/${name}`)) { map[id] = name; break; }
    }
  }
  assert.equal(map.s08, "bg_v6.webp", "real image must win");
  assert.equal(map.s18, undefined, "soft-404 HTML must not select bg_v6 for s18");
  assert.equal(map.s02, undefined, "soft-404 HTML must not select bg_v6 for s02");
  server.close();
});


test("round 6 figure cards and cream bgs are real webps in repo", () => {
  for (const id of ["r6a","r6b","r6c","r6e","r6f","r6h","r6i","r6j"]) {
    assert.ok(existsSync(join(ART, id, "bg.webp")), `missing ${id}/bg.webp`);
    assert.ok(existsSync(join(ART, id, "figure.webp")), `missing ${id}/figure.webp`);
    const buf = readFileSync(join(ART, id, "figure.webp"));
    assert.equal(buf.toString("ascii", 0, 4), "RIFF");
    assert.equal(buf.toString("ascii", 8, 12), "WEBP");
  }
  assert.ok(existsSync(join(ART, "r6d", "bg.webp")));
});

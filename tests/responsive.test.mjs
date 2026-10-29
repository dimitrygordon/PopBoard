// Responsive gate for every study page and ?mode= variant (new modules are picked up automatically).
// Fails on sideways overflow, elements past the screen edge, or text/controls covered by other boxes,
// at phone and tablet sizes (360 wide at minimum). Known findings waiting on module fixes live in
// responsive-baseline.json; anything new fails. Refresh it with: UPDATE_BASELINE=1 node --test responsive.test.mjs
//   RESPONSIVE_SIZES=360x740 RESPONSIVE_ONLY=study-waves node --test responsive.test.mjs   (quick run)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SIZES, MIN_TEXT_PX, MIN_TAP_PX, listPages, serve, chromePath, themeInit, pageChecks, makeBusy } from "./responsive-lib.mjs";

const GATE = ["overflow-x", "offscreen-x", "overlap"];
const sizes = (process.env.RESPONSIVE_SIZES || "360x740,390x844,430x932,844x390,768x1024,1024x768").split(",");
if (!sizes.includes("360x740")) sizes.unshift("360x740"); // the gate always covers 360 wide
const only = process.env.RESPONSIVE_ONLY ? process.env.RESPONSIVE_ONLY.split(",") : null;
const BASE_FILE = new URL("./responsive-baseline.json", import.meta.url);
const baseline = existsSync(BASE_FILE) ? JSON.parse(readFileSync(BASE_FILE, "utf8")) : {};
const keyOf = (pg, sz, i) => `${pg}|${sz}|${i.kind}|${(i.sel || "").replace(/\d+(\.\d+)?/g, "#")}|${(i.detail || "").replace(/"[^"]*"/g, "").replace(/\d+/g, "#")}`;

let puppeteer = null;
try { puppeteer = (await import("puppeteer-core")).default; } catch {}
const exe = chromePath();
const skip = !puppeteer || !exe ? "needs puppeteer-core and a Chrome/Chromium (set CHROME_PATH)" : false;

test("study pages fit phones and tablets: no overflow, nothing off screen, nothing covered", { skip, timeout: 30 * 60 * 1000 }, async () => {
  const { server, base } = await serve();
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
  const found = {};
  const jobs = listPages().filter((p) => !only || only.some((o) => p.name === o || p.name.startsWith(o + "--")));
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const pg = jobs[next++];
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(themeInit("dark"));
      for (const sz of sizes) {
        const S = SIZES[sz];
        await page.setViewport({ width: S.width, height: S.height, isMobile: S.width < 1000, hasTouch: true });
        await page.goto(base + pg.path, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
        for (const state of ["start", "busy"]) {
          if (state === "busy") await makeBusy(page);
          const issues = await page.evaluate(pageChecks, { minText: MIN_TEXT_PX, minTap: MIN_TAP_PX, touch: true }).catch((e) => [{ kind: "overlap", sel: "check", detail: String(e.message) }]);
          for (const i of issues) if (GATE.includes(i.kind)) { const k = keyOf(pg.name, sz, i); found[k] = found[k] || `${pg.path} @ ${sz} ${state}: ${i.kind} ${i.sel} ${i.detail}`; }
        }
      }
      await page.close();
    }
  };
  try { await Promise.all(Array.from({ length: +(process.env.CONC || 4) }, worker)); }
  finally { await browser.close(); server.close(); }
  if (process.env.UPDATE_BASELINE) { writeFileSync(BASE_FILE, JSON.stringify(Object.fromEntries(Object.keys(found).sort().map((k) => [k, found[k]])), null, 1) + "\n"); return; }
  const fresh = Object.keys(found).filter((k) => !(k in baseline)).map((k) => found[k]);
  const fixed = Object.keys(baseline).filter((k) => !(k in found) && sizes.includes(k.split("|")[1]));
  if (fixed.length) console.log(`${fixed.length} baseline finding(s) no longer happen; run UPDATE_BASELINE=1 to drop them.`);
  assert.deepEqual(fresh, [], `new responsive problems:\n${fresh.join("\n")}`);
});

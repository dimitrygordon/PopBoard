// Cold-read state screenshots: every page with narration off, start + end of the entry animation,
// then every button, toggle, drag, zoom and Next step. Files: pNN-stepK.png
//   MOBILE=1 for phone (pNN-mob-stepK.png), DARK=1 for dark theme (pNN-dark-stepK.png, pNN-mob-dark-stepK.png)
//   FL_URL=http://localhost:8799 SHOTS=/path/states node friction-lesson-states.mjs [pages...]
import puppeteer from "puppeteer-core";
const BASE = process.env.FL_URL || "http://localhost:8799", OUT = process.env.SHOTS || "/tmp/fl-states";
const only = process.argv.slice(2).map(Number).filter(Boolean);
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage(); const errors = [];
page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const MOB = process.env.MOBILE === "1", DARK = process.env.DARK === "1", PRE = (MOB ? "mob-" : "") + (DARK ? "dark-" : "");
await page.setViewport(MOB ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1600, height: 900 });
await page.evaluateOnNewDocument((DARK) => { localStorage.setItem("theme", DARK ? "dark" : "light"); localStorage.setItem("popboard.friction.narration", "0"); }, DARK);
await page.goto(`${BASE}/study-friction-lesson.html`, { waitUntil: "networkidle0" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0, k = 0; const shot = async () => page.screenshot({ path: `${OUT}/p${String(n).padStart(2, "0")}-${PRE}step${k++}.png` });
const click = async (sel, i = 0) => page.evaluate((s, i) => document.querySelectorAll("#flScene " + s)[i].click(), sel, i);
const center = async (sel, i = 0) => page.evaluate((s, i) => { const b = document.querySelectorAll("#flScene " + s)[i].getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, sel, i);
async function drag(from, to, mid) { await page.mouse.move(...from); await page.mouse.down(); for (let s = 1; s <= 10; s++) { await page.mouse.move(from[0] + (to[0] - from[0]) * s / 10, from[1] + (to[1] - from[1]) * s / 10); if (s === 5 && mid) await mid(); } await page.mouse.up(); }
const nexts = async () => { while (await page.evaluate(() => window.__fl.state.steps.length)) { await page.evaluate(() => window.__fl.go(1)); await wait(1300); await shot(); } };
for (n of only.length ? only : Array.from({ length: 26 }, (_, i) => i + 1)) {
  k = 0; await page.evaluate((n) => window.__fl.render(n - 1), n); await wait(120); await shot(); await wait(n === 17 ? 7500 : 6500); await shot();
  if (n === 6) {
    const m = await center(".mag"), s = await center(".sled");
    await drag(m, [s[0] + 40, s[1] - 20], shot); await wait(500); await shot(); await wait(2500); await shot();
    const w = await center(".tray .wt", 2); await drag(w, s, shot); await wait(1500); await shot();
    for (const i of [0, 1, 3]) { await click(".tray .wt", i); await wait(1500); await shot(); }
  } else if (n === 8) { for (const i of [1, 2, 0]) { await click(".sbtn.toggle", i); await wait(700); await shot(); await wait(2500); await shot(); } }
  else if (n === 9) { for (const i of [0, 1, 2]) { await click(".btnrow .sbtn", i); await wait(2800); await shot(); } }
  else if (n === 12) { for (const i of [2, 0, 1, 2]) { await click(".trial .sbtn", i); await wait(2500); await shot(); await wait(4000); await shot(); } }
  else if (n === 14) { for (const t of [0.5, 2.0, 2.9, 3.4, 4.8]) { await page.evaluate((t) => { const v = document.querySelector("#flScene video"); v.pause(); v.currentTime = t; }, t); await wait(600); await shot(); } await click(".sbtn.big-play"); await wait(1500); await shot(); }
  await nexts();
}
await browser.close(); console.log(errors.length ? errors.join("\n") : "no errors");

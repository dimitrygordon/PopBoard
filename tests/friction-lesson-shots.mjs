// Screenshots + console-error sweep for the Friction Lesson storyboard (all 33 pages, final frames).
//   FL_URL=http://localhost:8799 SHOTS=/path node friction-lesson-shots.mjs [pages...]
import puppeteer from "puppeteer-core";
const BASE = process.env.FL_URL || "http://localhost:8799";
const OUT = process.env.SHOTS || "/tmp/fl-shots";
const only = process.argv.slice(2).map(Number).filter(Boolean);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const errors = [];
const modes = (process.env.MODES || "desktop-light,desktop-dark,desktop-full,mobile-light,mobile-dark").split(",");
for (const mode of modes) {
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${mode}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${mode}: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`${mode}: failed ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`${mode}: ${r.status()} ${r.url()}`); });
  const mobile = mode.startsWith("mobile");
  await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1600, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluateOnNewDocument((d) => { localStorage.setItem("theme", d ? "dark" : "light"); }, mode.endsWith("dark"));
  await page.goto(`${BASE}/study-friction-lesson.html${mode.endsWith("full") ? "?full=1" : ""}`, { waitUntil: "networkidle0" });
  const pages = only.length ? only : Array.from({ length: 33 }, (_, i) => i + 1);
  for (const n of pages) {
    await page.evaluate((n) => window.__fl.render(n - 1), n);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    await new Promise((r) => setTimeout(r, n === 17 ? 900 : 250));
    if (n === 21 && process.env.STEP !== "0") { await page.evaluate(() => window.__fl.go(1)); await new Promise((r) => setTimeout(r, 200)); }
    const issues = await page.evaluate(() => {
      const fr = document.getElementById("flScene").getBoundingClientRect(), out = [];
      document.querySelectorAll("#flScene img").forEach((i) => { if (!i.naturalWidth) out.push("broken " + i.src); });
      return out;
    });
    issues.forEach((x) => errors.push(`${mode} p${n}: ${x}`));
    await page.screenshot({ path: `${OUT}/${mode}-p${String(n).padStart(2, "0")}.png`, fullPage: mobile });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors, no broken images");

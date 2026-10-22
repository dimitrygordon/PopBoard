// Headless smoke test for the Mechanics Playground prototype.
// Serves public/ the way Vercel clean URLs do (/study-mechanics -> study-mechanics.html).
//   node tests/mechanics-browser.mjs
import http from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const PORT = 8773;
const ROOT = new URL("../public/", import.meta.url).pathname;
const SHOTS = "/opt/cursor/artifacts";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

function resolvePath(urlPath) {
  let p = decodeURIComponent(urlPath);
  if (p.endsWith("/")) p += "index.html";
  const direct = join(ROOT, p);
  if (existsSync(direct)) return direct;
  const html = join(ROOT, p + ".html");
  if (existsSync(html)) return html;
  return direct;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const file = resolvePath(url.pathname);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("nf");
  }
});
await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));

const chrome = ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find((p) => existsSync(p));
if (!chrome) throw new Error("Google Chrome not found");
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const base = "http://127.0.0.1:" + PORT;
let failures = 0;
const check = (cond, msg) => {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (!cond) failures++;
};

function track(page) {
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") page.errors.push("console: " + msg.text());
  });
}

function hardErrors(page) {
  return (page.errors || []).filter((e) => !/Firebase|firebase|Firestore|Failed to load resource|404|net::|fonts\.googleapis|fonts\.gstatic/i.test(e));
}

const MODES = ["sandbox", "pulley", "incline", "springs", "pendulum", "rocket", "friction", "rube"];

async function openMode(mode) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  track(page);
  const path = mode === "pulley" ? "/study-mechanics?mode=pulley" : "/study-mechanics.html?mode=" + mode;
  await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => window.mechanics && window.mechanics.state && window.mechanics.state.bodies, { timeout: 10000 });
  await page.waitForFunction(() => window.mechanics.state.time > 0.2, { timeout: 8000 });
  return page;
}

for (const mode of MODES) {
  const page = await openMode(mode);
  const info = await page.evaluate(() => {
    const state = window.mechanics.state;
    const byId = (id) => state.bodies.find((body) => body.id === id);
    return {
      time: state.time,
      paused: state.paused,
      mode: state.mode,
      bodies: state.bodies.length,
      joints: state.joints.length,
      heavyY: byId("heavy") && byId("heavy").y,
      lightY: byId("light") && byId("light").y,
      heavyVy: byId("heavy") && byId("heavy").vy,
      blockVx: byId("block") && byId("block").vx,
      massVy: byId("mass") && byId("mass").vy,
      bobX: byId("bob") && byId("bob").x,
      rocketY: byId("rocket") && byId("rocket").y,
      ice: byId("blockice") && Math.hypot(byId("blockice").vx, byId("blockice").vy),
      rubber: byId("blockrubber") && Math.hypot(byId("blockrubber").vx, byId("blockrubber").vy),
      hook: typeof window.mechanics.addEventListener === "function"
    };
  });
  check(hardErrors(page).length === 0, mode + " has no console errors" + (hardErrors(page).length ? ": " + hardErrors(page).join(" | ") : ""));
  check(info.time > 0.2 && info.hook, mode + " advances (t=" + info.time.toFixed(2) + ")");
  check(info.bodies > 0, mode + " has bodies");
  if (mode === "pulley") {
    check(info.mode === "pulley" && info.heavyVy < -0.4 && info.heavyY < info.lightY, "pulley heavy mass is descending");
  }
  if (mode === "incline") check(info.blockVx < -0.2, "incline block slides downslope");
  if (mode === "springs") check(Math.abs(info.massVy) > 0.05, "spring mass is moving");
  if (mode === "pendulum") check(Math.abs(info.bobX) > 0.01, "pendulum bob has left the vertical");
  if (mode === "rocket") check(info.rocketY > 0.7, "rocket has lifted");
  if (mode === "friction") check(info.ice > info.rubber + 0.2, "ice is ahead of rubber");
  if (mode === "sandbox" || mode === "rube") check(info.joints >= 0, mode + " snapshot is readable");
  if (mode === "pulley" || mode === "friction" || mode === "rocket" || mode === "pendulum" || mode === "springs") {
    await page.waitForFunction(() => window.mechanics.state.time > 0.55, { timeout: 8000 });
    await mkdir(SHOTS, { recursive: true });
    const file = SHOTS + "/mechanics-" + mode + ".png";
    await page.screenshot({ path: file });
    console.log("SHOT " + file);
  }
  await page.close();
}

const back = await browser.newPage();
await back.setViewport({ width: 1100, height: 800 });
track(back);
await back.goto(base + "/study-mechanics.html?mode=pendulum&board=classBoard&pbreturn=teacher", { waitUntil: "domcontentloaded", timeout: 20000 });
await back.waitForSelector("[data-study-back]");
await Promise.all([
  back.waitForFunction(() => /study\.html|\/study\/?$/.test(location.pathname), { timeout: 15000 }),
  back.click("[data-study-back]")
]);
const backUrl = new URL(back.url());
check(/study\.html|\/study\/?$/.test(backUrl.pathname), "Back opens the study gallery");
check(backUrl.searchParams.get("board") === "classBoard", "Back keeps the board id");
check(backUrl.searchParams.get("pbreturn") === "teacher", "Back keeps the return role");
check(backUrl.searchParams.get("mode") === "pendulum", "Back keeps the module query");
await back.waitForFunction(() => {
  const el = document.getElementById("studyBackBtn");
  return el && el.href.includes("board=classBoard");
}, { timeout: 10000 });
const galleryBack = await back.$eval("#studyBackBtn", (el) => el.href);
check(galleryBack.includes("board=classBoard") && galleryBack.includes("pbreturn=teacher"), "gallery Back targets that board");
await back.waitForFunction(() => document.querySelectorAll(".module-card h3").length >= 16, { timeout: 10000 });
const guestGallery = await back.evaluate(() => {
  const names = Array.from(document.querySelectorAll(".module-card h3")).map((el) => el.textContent);
  return names;
});
check(guestGallery.some((name) => /mechanics playground/i.test(name)), "gallery lists Mechanics Playground");
check(hardErrors(back).length === 0, "return path has no unexpected errors" + (hardErrors(back).length ? ": " + hardErrors(back).join(" | ") : ""));

const tokens = await browser.newPage();
track(tokens);
await tokens.setViewport({ width: 900, height: 700 });
await tokens.goto(base + "/study-mechanics?mode=sandbox", { waitUntil: "domcontentloaded" });
await tokens.waitForFunction(() => window.mechanics && window.mechanics.state.time > 0, { timeout: 8000 });
const colors = await tokens.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const read = (name) => cs.getPropertyValue(name).trim();
  return {
    gravity: read("--mp-force-gravity"),
    normal: read("--mp-force-normal"),
    tension: read("--mp-force-tension"),
    friction: read("--mp-force-friction"),
    applied: read("--mp-force-applied"),
    velocity: read("--mp-velocity"),
    bg: read("--mp-bg")
  };
});
check(colors.gravity === "red" && colors.normal === "blue" && colors.tension === "gold", "force tokens are the named colors (" + JSON.stringify(colors) + ")");
check(colors.friction === "orange" && colors.applied === "green" && colors.velocity === "cyan", "friction, applied, and velocity tokens");
check(!!colors.bg, "background token is set");
const drawer = await tokens.$eval("#partTools", (el) => ({
  buttons: el.querySelectorAll("button").length,
  svgs: el.querySelectorAll("svg").length,
  letters: (el.innerText || "").replace(/\s+/g, "")
}));
check(drawer.buttons === 8 && drawer.svgs === 8 && drawer.letters === "", "parts drawer is icons (" + JSON.stringify(drawer) + ")");
await tokens.click("#partTools button");
const pressed = await tokens.$eval("#partTools button", (el) => el.getAttribute("aria-pressed"));
const said = await tokens.$eval("#statusLine", (el) => el.textContent);
check(pressed === "true" && /drag/i.test(said), "placing a part arms the drawer (" + said + ")");
await tokens.click("#schematicViewBtn");
await tokens.click("#craftViewBtn");
const layers = await tokens.evaluate(() => ({
  diagram: document.getElementById("schematicViewBtn").getAttribute("aria-pressed"),
  diorama: document.getElementById("craftViewBtn").getAttribute("aria-pressed")
}));
check(layers.diorama === "true" && layers.diagram === "false", "diorama layer is selected again");
check(hardErrors(tokens).length === 0, "icon drawer and layer swap stay quiet");

await browser.close();
server.close();
if (failures) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("mechanics browser smoke passed");

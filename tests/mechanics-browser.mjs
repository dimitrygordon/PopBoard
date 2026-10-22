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
const fit = await tokens.evaluate(() => {
  const rect = document.getElementById("mechanicsCanvas").getBoundingClientRect();
  return {
    w: rect.width,
    h: rect.height,
    vw: window.innerWidth,
    vh: window.innerHeight,
    columns: !!document.querySelector(".layout"),
    slider: !!document.querySelector("input[type=range]")
  };
});
check(fit.w >= fit.vw - 2 && fit.h >= fit.vh - 2 && !fit.columns && !fit.slider, "desktop canvas fills the viewport (" + JSON.stringify(fit) + ")");
await tokens.waitForFunction(() => {
  const root = document.getElementById("partDrawer");
  if (!root) return false;
  const need = ["#wheel", "#coils", "#block", "#bob", "#flame-1", "#flame-2", "#flame-3", "#magnet"];
  return root.querySelectorAll("svg").length === 6 && need.every((id) => root.querySelector(id));
}, { timeout: 8000 });
const drawer = await tokens.$eval("#partDrawer", (el) => {
  const wheel = el.querySelector("#wheel");
  const style = getComputedStyle(wheel);
  const tile = el.querySelector(".t-pulley");
  const idle = getComputedStyle(tile).getPropertyValue("--pa").trim();
  tile.classList.add("is-active");
  const hot = getComputedStyle(tile).getPropertyValue("--pa").trim();
  tile.classList.remove("is-active");
  const loop = getComputedStyle(document.documentElement).getPropertyValue("--mp-loop").trim();
  return {
    buttons: el.querySelectorAll("button").length,
    svgs: el.querySelectorAll("svg").length,
    letters: (el.innerText || "").replace(/\s+/g, ""),
    pivot: wheel.getAttribute("data-pivot"),
    fromPivot: wheel.dataset.mpOrigin,
    origin: style.transformOrigin,
    box: style.transformBox,
    motion: style.animationName,
    idle,
    hot,
    loop
  };
});
check(drawer.buttons === 6 && drawer.svgs === 6 && drawer.letters === "", "tile drawer inlines the art kit (" + JSON.stringify(drawer) + ")");
check(drawer.pivot === "100 70" && drawer.fromPivot === "50% 35%" && drawer.box === "view-box" && /100px/.test(drawer.origin), "wheel pivot is in viewBox coordinates (" + drawer.fromPivot + " -> " + drawer.origin + ")");
check(drawer.motion === "mp-rock" && drawer.loop === "5s" && drawer.idle === "35deg" && drawer.hot === "55deg", "tiles loop on --mp-loop and grow when active");
await tokens.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
const held = await tokens.$eval("#wheel", (el) => getComputedStyle(el).animationName);
check(held === "none", "reduced motion holds the tiles still (" + held + ")");
await tokens.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
const magnetsBefore = await tokens.evaluate(() => window.mechanics.state.bodies.filter((body) => Math.abs(body.magnet) > 0).length);
const magnetTile = await tokens.$(".t-magnet");
const magnetBox = await magnetTile.boundingBox();
const dropPoint = await tokens.$eval("#mechanicsCanvas", (el) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width * 0.62, y: rect.top + rect.height * 0.4 };
});
await tokens.mouse.move(magnetBox.x + magnetBox.width / 2, magnetBox.y + magnetBox.height / 2);
await tokens.mouse.down();
await tokens.mouse.move(dropPoint.x, dropPoint.y, { steps: 12 });
await tokens.mouse.up();
await tokens.waitForFunction((count) => window.mechanics.state.bodies.filter((body) => Math.abs(body.magnet) > 0).length > count, { timeout: 4000 }, magnetsBefore);
check(true, "dragging the magnet tile into the world places a magnet");
await tokens.click("#partDrawer button");
await tokens.waitForFunction(() => window.mechanics.state.mode === "pulley" && window.mechanics.state.bodies.some((body) => body.id === "heavy"), { timeout: 8000 });
check(true, "tapping the pulley tile loads that scene");
await tokens.evaluate(() => {
  const canvas = document.getElementById("mechanicsCanvas");
  const rect = canvas.getBoundingClientRect();
  const fire = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    clientX: x,
    clientY: y,
    buttons: type === "pointerup" ? 0 : 1,
    pointerType: "mouse"
  }));
  const x = rect.left + 12;
  const y = rect.top + rect.height * 0.45;
  fire("pointerdown", x, y);
  fire("pointermove", x + 48, y + 10);
  fire("pointerup", x + 48, y + 10);
});
await tokens.click("#diagramBtn");
const diagramOn = await tokens.$eval("#diagramBtn", (el) => el.getAttribute("aria-pressed"));
await tokens.click("#diagramBtn");
const diagramOff = await tokens.$eval("#diagramBtn", (el) => el.getAttribute("aria-pressed"));
check(diagramOn === "true" && diagramOff === "false", "diagram toggle returns to the diorama");
check(hardErrors(tokens).length === 0, "tile drawer, pan, and diagram stay quiet" + (hardErrors(tokens).length ? ": " + hardErrors(tokens).join(" | ") : ""));

const touch = await browser.newPage();
track(touch);
await touch.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await touch.goto(base + "/study-mechanics?mode=pendulum", { waitUntil: "domcontentloaded", timeout: 20000 });
await touch.waitForFunction(() => window.mechanics && window.mechanics.state.time > 0.2, { timeout: 8000 });
const phone = await touch.evaluate(() => {
  const rect = document.getElementById("mechanicsCanvas").getBoundingClientRect();
  const drawer = document.getElementById("partDrawer");
  return {
    w: rect.width,
    h: rect.height,
    vw: window.innerWidth,
    vh: window.innerHeight,
    back: !!document.querySelector("[data-study-back]"),
    diagram: !!document.getElementById("diagramBtn"),
    pause: !!document.getElementById("pauseBtn"),
    reset: !!document.getElementById("resetBtn"),
    tiles: drawer ? drawer.querySelectorAll("button").length : 0,
    columns: !!document.querySelector(".layout"),
    slider: !!document.querySelector("input[type=range]")
  };
});
check(phone.w >= phone.vw - 2 && phone.h >= phone.vh - 2, "touch canvas fills the viewport (" + JSON.stringify(phone) + ")");
check(phone.back && phone.diagram && phone.pause && phone.reset && phone.tiles === 6, "touch overlays are the drawer, diagram, back, and transport");
check(!phone.columns && !phone.slider, "touch layout has no columns or sliders");
await touch.waitForFunction(() => window.mechanics.state.time > 0.55, { timeout: 8000 });
const radial = await touch.evaluate(() => {
  const bob = window.mechanics.state.bodies.find((body) => body.id === "bob");
  const screen = window.mechanics.layer.screenFromWorld(bob.x, bob.y);
  const canvas = document.getElementById("mechanicsCanvas");
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + screen.x * (rect.width / canvas.width);
  const y = rect.top + screen.y * (rect.height / canvas.height);
  const fire = (type) => canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 7,
    clientX: x,
    clientY: y,
    buttons: type === "pointerup" ? 0 : 1,
    pointerType: "touch"
  }));
  fire("pointerdown");
  fire("pointerup");
  const menu = document.getElementById("radial");
  return { hidden: menu.hidden, text: (menu.innerText || "").replace(/\s+/g, " ").trim() };
});
check(!radial.hidden && /pin/i.test(radial.text) && /delete/i.test(radial.text), "tap opens the radial menu (" + radial.text + ")");
const touchShot = SHOTS + "/mechanics-touch.png";
await touch.screenshot({ path: touchShot });
await touch.click("#radialMaterial");
const material = await touch.evaluate(() => {
  const bob = window.mechanics.state.bodies.find((body) => body.id === "bob");
  return bob && bob.material;
});
check(material === "rubber", "radial material cycles the bob to felt (" + material + ")");
console.log("SHOT " + touchShot);
check(hardErrors(touch).length === 0, "touch viewport stays quiet" + (hardErrors(touch).length ? ": " + hardErrors(touch).join(" | ") : ""));
await touch.close();

await browser.close();
server.close();
if (failures) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("mechanics browser smoke passed");

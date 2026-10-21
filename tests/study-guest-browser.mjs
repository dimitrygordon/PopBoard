// Signed-out browser check for the Study lab.
// Serves public/ with the same clean URLs Vercel uses (/study -> study.html).
//   node tests/study-guest-browser.mjs
import http from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const PORT = 8771;
const ROOT = new URL("../public/", import.meta.url).pathname;
const SHOTS = "/opt/cursor/artifacts";
const LIVE = process.env.STUDY_BASE || "";
const shotPrefix = LIVE ? "live-" : "";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
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
    console.log("404 " + req.url);
    res.writeHead(404);
    res.end("nf");
  }
});
if (!LIVE) {
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
}

const chrome = ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find((p) => existsSync(p));
if (!chrome) throw new Error("Google Chrome not found");
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const base = LIVE ? LIVE.replace(/\/$/, "") : "http://127.0.0.1:" + PORT;
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

async function shot(page, name) {
  await mkdir(SHOTS, { recursive: true });
  const path = SHOTS + "/" + shotPrefix + name + ".png";
  await page.screenshot({ path, fullPage: false });
  console.log("SHOT " + path);
}

function waitForPopup(opener) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      browser.off("targetcreated", onTarget);
      reject(new Error("timed out waiting for a popup"));
    }, 15000);
    async function onTarget(target) {
      if (target.type() !== "page") return;
      const parent = target.opener();
      if (!parent || parent !== opener.target()) return;
      clearTimeout(timer);
      browser.off("targetcreated", onTarget);
      const page = await target.page();
      track(page);
      resolve(page);
    }
    browser.on("targetcreated", onTarget);
  });
}

async function openLogin(page, extra) {
  await page.goto(base + "/" + (extra || ""), { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("a.study-pill", { timeout: 15000 });
  await page.waitForFunction(() => window.studyPortal && typeof window.studyPortal.open === "function", { timeout: 15000 });
}

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
track(page);
await openLogin(page);

const pill = await page.$eval("a.study-pill", (el) => ({
  href: el.getAttribute("href"),
  label: el.getAttribute("aria-label"),
  text: el.textContent.replace(/\s+/g, " ").trim(),
  moonHidden: el.querySelector(".study-pill-moon")?.getAttribute("aria-hidden")
}));
check(pill.href === "/study", "pill href is /study");
check(pill.label === "Explore the Study Lab, no account needed", "pill accessible name");
check(pill.text.includes("Explore the Study Lab"), "pill visible text");
check(pill.moonHidden === "true", "moon is aria-hidden");

const box = await page.$eval("a.study-pill", (el) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const moon = getComputedStyle(el.querySelector(".study-pill-moon"));
  return {
    top: r.top, left: r.left, width: r.width, height: r.height,
    bottom: window.innerHeight - r.bottom,
    center: r.left + r.width / 2,
    vw: window.innerWidth,
    position: s.position,
    font: s.fontFamily,
    border: s.borderTopWidth + " " + s.borderTopColor,
    heightCss: s.height,
    moonName: moon.viewTransitionName || moon.webkitViewTransitionName || ""
  };
});
check(box.position === "fixed", "pill is fixed to the viewport");
check(Math.abs(box.height - 44) < 1.5, "pill is about 44px tall (" + box.heightCss + ")");
check(Math.abs(box.center - box.vw / 2) < 8, "pill is horizontally centered");
check(box.bottom < 40 && box.bottom > 8, "pill sits near the bottom (" + Math.round(box.bottom) + "px)");
check(/Fredoka/.test(box.font), "pill uses Fredoka (" + box.font + ")");
check(box.moonName === "study-moon" || box.moonName === "", "moon view-transition name when supported (" + box.moonName + ")");
const loginBottom = await page.$eval("#login", (el) => el.getBoundingClientRect().bottom);
check(box.top > loginBottom - 8, "pill is below the login card");
await shot(page, "study-login-pill");

const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844 });
track(mobile);
await openLogin(mobile);
const mobileBox = await mobile.$eval("a.study-pill", (el) => {
  const r = el.getBoundingClientRect();
  const card = document.getElementById("login").getBoundingClientRect();
  return {
    center: r.left + r.width / 2,
    vw: window.innerWidth,
    top: r.top,
    cardBottom: card.bottom,
    visible: r.width > 0 && r.bottom <= window.innerHeight + 1
  };
});
check(Math.abs(mobileBox.center - mobileBox.vw / 2) < 8, "pill is centered on a phone");
check(mobileBox.visible && mobileBox.top >= mobileBox.cardBottom - 8, "pill stays below the card on a phone");
await shot(mobile, "study-login-pill-mobile");
await mobile.close();

await page.evaluate(() => {
  window.studyPortal.onOpen = (pt) => {
    sessionStorage.setItem("popboard.hookProbe", JSON.stringify({
      pt: pt,
      x: getComputedStyle(document.documentElement).getPropertyValue("--portal-x").trim(),
      y: getComputedStyle(document.documentElement).getPropertyValue("--portal-y").trim()
    }));
    return new Promise((resolve) => setTimeout(resolve, 80));
  };
});
const openedAt = Date.now();
await Promise.all([
  page.waitForFunction(() => /\/study\/?$/.test(location.pathname), { timeout: 15000 }),
  page.click("a.study-pill")
]);
check(Date.now() - openedAt >= 60, "open waits for the onOpen promise");
await page.waitForSelector(".module-card h3", { timeout: 15000 });
await page.waitForFunction(() => window.studyPortal && typeof window.studyPortal.close === "function", { timeout: 15000 });
const probe = await page.evaluate(() => ({
  hook: sessionStorage.getItem("popboard.hookProbe"),
  origin: sessionStorage.getItem("popboard.portalOrigin"),
  cssX: getComputedStyle(document.documentElement).getPropertyValue("--portal-x").trim(),
  moon: !!document.querySelector(".study-portal-moon"),
  back: document.getElementById("studyBackBtn") && document.getElementById("studyBackBtn").getAttribute("href"),
  portal: !!(window.studyPortal && typeof window.studyPortal.close === "function" && "onClose" in window.studyPortal)
}));
const hook = JSON.parse(probe.hook || "null");
check(!!hook && hook.x.endsWith("px") && hook.y.endsWith("px"), "open stores --portal-x/y before navigating");
check(hook && hook.pt && typeof hook.pt.x === "number", "onOpen receives the tap point");
const origin = JSON.parse(probe.origin || "null");
check(origin && origin.x === hook.pt.x && origin.y === hook.pt.y, "sessionStorage keeps the tap point");
check(probe.cssX === hook.x, "study page restores --portal-x (" + probe.cssX + ")");
check(probe.moon, "study page has the matching moon");
check(probe.back === "./" || probe.back === "/", "guest Back href is the home page (" + probe.back + ")");
check(probe.portal, "study page exposes studyPortal.close");
const names = await page.$$eval(".module-card h3", (els) => els.map((el) => el.textContent.trim()));
check(names.length >= 16, "guest gallery lists the built-in modules (" + names.length + ")");
await shot(page, "study-gallery-guest");
check(page.errors.filter((e) => !/Firebase|firebase|Firestore|404/.test(e)).length === 0, "gallery has no unexpected page errors: " + page.errors.join(" | "));

const cards = await page.$$(".module-card");
let shotModule = false;
for (let i = 0; i < cards.length; i++) {
  const title = names[i] || ("card " + i);
  const fresh = await page.$$(".module-card");
  const popupPromise = waitForPopup(page);
  await fresh[i].click();
  let popup;
  try {
    popup = await popupPromise;
  } catch (err) {
    check(false, title + " opened a module page");
    continue;
  }
  try {
    await popup.waitForSelector("[data-study-back]", { timeout: 15000 });
    await popup.waitForFunction(() => (document.body.innerText || "").trim().length > 30, { timeout: 15000 });
    const info = await popup.evaluate(() => ({
      href: location.pathname + location.search,
      back: !!document.querySelector("[data-study-back]"),
      text: (document.body.innerText || "").slice(0, 80)
    }));
    check(info.back && !/\/$/.test(info.href) && info.href !== "/", title + " loaded signed out (" + info.href + ")");
    const hard = (popup.errors || []).filter((e) => !/Firebase|firebase|Firestore|Failed to load resource|404|net::/.test(e));
    check(hard.length === 0, title + " has no uncaught errors" + (hard.length ? ": " + hard.join(" | ") : ""));
    if (!shotModule && /pendulum/i.test(title + info.href)) {
      await shot(popup, "study-module-pendulum");
      shotModule = true;
    }
    await Promise.all([
      popup.waitForFunction(() => /study\.html|\/study\/?$/.test(location.pathname), { timeout: 15000 }),
      popup.click("[data-study-back]")
    ]);
    const backUrl = popup.url();
    check(/study\.html|\/study\/?$/.test(new URL(backUrl).pathname), title + " Back returns to the gallery");
  } catch (err) {
    check(false, title + " failed: " + err.message);
  } finally {
    await popup.close().catch(() => {});
  }
}
check(shotModule, "captured a module screenshot");

await page.evaluate(() => {
  window.studyPortal.onClose = () => {
    sessionStorage.setItem("popboard.closeProbe", "1");
    return new Promise((resolve) => setTimeout(resolve, 40));
  };
});
await Promise.all([
  page.waitForFunction(() => location.pathname === "/" || /index\.html$/.test(location.pathname), { timeout: 15000 }),
  page.click("#studyBackBtn")
]);
const home = await page.evaluate(() => ({
  path: location.pathname,
  login: document.getElementById("login") && !document.getElementById("login").classList.contains("hidden"),
  pill: !!document.querySelector("a.study-pill"),
  closed: sessionStorage.getItem("popboard.closeProbe"),
  signedOutForm: !!document.getElementById("usernameInput")
}));
check(home.path === "/" || /index\.html$/.test(home.path), "gallery Back with no board opens the home page");
check(home.login && home.signedOutForm, "home page is the signed-out login form");
check(home.pill, "the study pill is on the login page again");
check(home.closed === "1", "close runs the onClose hook");
await shot(page, "study-back-home");

const quiet = await browser.newPage();
await quiet.setViewport({ width: 1280, height: 800 });
track(quiet);
await quiet.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await openLogin(quiet);
await quiet.evaluate(() => {
  window.studyPortal.onOpen = () => {
    sessionStorage.setItem("popboard.reducedHook", "1");
    return new Promise(() => {});
  };
});
await Promise.all([
  quiet.waitForFunction(() => /\/study\/?$/.test(location.pathname), { timeout: 10000 }),
  quiet.click("a.study-pill")
]);
const reduced = await quiet.evaluate(() => sessionStorage.getItem("popboard.reducedHook"));
check(reduced !== "1", "reduced motion skips onOpen and navigates directly");
await quiet.close();

const plain = await browser.newPage();
await plain.setJavaScriptEnabled(false);
await plain.setViewport({ width: 1280, height: 800 });
await plain.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 15000 });
const plainHref = await plain.$eval("a.study-pill", (el) => el.getAttribute("href"));
check(plainHref === "/study", "pill is a real link with JavaScript off");
await Promise.all([
  plain.waitForNavigation({ timeout: 15000, waitUntil: "domcontentloaded" }),
  plain.click("a.study-pill")
]);
const plainTitle = await plain.title();
const plainHeading = await plain.$eval("h1", (el) => el.textContent.trim()).catch(() => "");
check(/Study/.test(plainTitle) && plainHeading === "Study", "JavaScript-off navigation opens the study gallery (" + plainTitle + ")");
await plain.close();

await browser.close();
if (!LIVE) server.close();
if (!shotModule) await writeFile(SHOTS + "/study-guest-notes.txt", "module screenshot missing\n").catch(() => {});
if (failures) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("signed-out study guest check passed");

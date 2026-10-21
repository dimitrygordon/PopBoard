// Browser check that Study's Back button returns to the open PopBoard.
// Runs against the local Firebase emulators (no production data).
//   cd tests && npx firebase emulators:exec --project hotseat-4f661 \
//     --only auth,firestore,storage --config ../firebase.json \
//     "node board-return-browser.mjs"
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";

const PORT = 8767;
const ROOT = new URL("../public/", import.meta.url).pathname;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2"
};
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("nf");
  }
}).listen(PORT);

const env = await initializeTestEnvironment({
  projectId: "hotseat-4f661",
  firestore: {
    rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    host: "127.0.0.1",
    port: 8080
  }
});
const admin = async (fn) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));

const chrome = process.env.CHROME || ["/usr/bin/google-chrome", "/usr/local/bin/google-chrome"].find((p) => existsSync(p));
if (!chrome) throw new Error("Google Chrome not found");
const browser = await puppeteer.launch({
  executablePath: chrome,
  args: ["--no-sandbox", "--headless=new"]
});

const URL0 = "http://127.0.0.1:" + PORT + "/?emulators=1";
let failures = 0;
const check = (cond, msg) => {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (!cond) failures++;
};

function track(page) {
  page.errors = [];
  page.alerts = [];
  page.on("dialog", async (d) => { page.alerts.push(d.message()); await d.accept(); });
  page.on("pageerror", (e) => page.errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") page.errors.push("console: " + msg.text());
  });
}

async function newPage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  track(page);
  return page;
}

async function type(page, sel, text) {
  await page.$eval(sel, (el) => { el.value = ""; });
  await page.type(sel, text);
}

async function panels(page) {
  return page.evaluate(() => {
    const on = (id) => {
      const el = document.getElementById(id);
      return !!(el && !el.classList.contains("hidden"));
    };
    return { login: on("login"), portal: on("boardsPortal"), app: on("app") };
  });
}

async function waitPanel(page, name) {
  try {
    await page.waitForFunction((which) => {
      const el = document.getElementById(which === "login" ? "login" : which === "portal" ? "boardsPortal" : "app");
      return !!(el && !el.classList.contains("hidden"));
    }, { timeout: 25000 }, name);
  } catch (err) {
    const info = await page.evaluate(() => {
      const on = (id) => {
        const el = document.getElementById(id);
        return !!(el && !el.classList.contains("hidden"));
      };
      return {
        href: location.href,
        login: on("login"),
        teacherLogin: on("teacherLogin"),
        portal: on("boardsPortal"),
        app: on("app"),
        restoring: document.documentElement.classList.contains("pb-restoring"),
        stored: sessionStorage.getItem("popboard.boardReturn")
      };
    }).catch((e) => String(e));
    console.error("waitPanel(" + name + ") failed", JSON.stringify(info), "errors:", page.errors, "alerts:", page.alerts);
    throw err;
  }
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

async function clickOpen(page, selector) {
  const popupPromise = waitForPopup(page);
  await page.click(selector);
  const popup = await popupPromise;
  await popup.waitForFunction(() => document.readyState !== "loading", { timeout: 25000 });
  return popup;
}

function paramsOf(url) {
  return new URL(url).searchParams;
}

async function storedState(page) {
  const raw = await page.evaluate(() => sessionStorage.getItem("popboard.boardReturn"));
  return raw ? JSON.parse(raw) : null;
}

try {
  const t = await newPage();
  await t.goto(URL0, { waitUntil: "domcontentloaded" });
  await waitPanel(t, "login");
  check((await panels(t)).login, "a fresh visit with no return target shows sign-in");

  await t.click("#teacherLoginBtn");
  await t.click("#showTeacherSignUpBtn");
  await type(t, "#teacherEmailInput", "return-teacher@example.com");
  await type(t, "#teacherNameInput", "Ms Return");
  await type(t, "#teacherNewPasswordInput", "teachpass1");
  await t.click("#teacherSignUpBtn");
  await t.waitForFunction(() => {
    const login = document.getElementById("teacherLogin");
    return login && !login.classList.contains("hidden");
  }, { timeout: 20000 });
  check(t.alerts.some((a) => /waiting for approval/i.test(a)), "new teacher waits for approval");

  let teacherUid = "";
  await admin(async (db) => {
    const snap = await getDocs(collection(db, "teachers"));
    const row = snap.docs.find((d) => d.data().email === "return-teacher@example.com");
    teacherUid = row.id;
    await updateDoc(doc(db, "teachers", teacherUid), { approved: true });
  });

  await type(t, "#teacherIdInput", "ms return");
  await type(t, "#teacherPasswordInput", "teachpass1");
  await t.click("#teacherSignInBtn");
  await waitPanel(t, "portal");
  check((await panels(t)).portal && !(await panels(t)).login, "approved teacher reaches the portal");

  await type(t, "#newBoardNameInput", "Return Physics");
  await t.click("#createBoardBtn");
  await t.waitForSelector(".board-card", { timeout: 15000 });
  let boardId = "";
  for (let attempt = 0; attempt < 10 && !boardId; attempt++) {
    await admin(async (db) => {
      const snap = await getDocs(collection(db, "boards"));
      const row = snap.docs.find((d) => d.data().name === "Return Physics");
      if (row) {
        boardId = row.id;
        check(row.data().ownerUid === teacherUid, "board is owned by the teacher");
      }
    });
    if (!boardId) await new Promise((r) => setTimeout(r, 300));
  }
  if (!boardId) throw new Error("Return Physics was not saved");

  await t.evaluate(() => {
    const btn = [...document.querySelectorAll(".board-card button")].find((b) => b.textContent.trim() === "Enter");
    btn.click();
  });
  await waitPanel(t, "app");
  check((await panels(t)).app && !(await panels(t)).portal, "teacher is inside the board");

  const study = await clickOpen(t, "#studyBtnApp");
  const studyParams = paramsOf(study.url());
  check(studyParams.get("board") === boardId, "teacher Study URL carries the board id");
  check(studyParams.get("pbreturn") === "teacher", "teacher Study URL records a teacher return");
  check(studyParams.get("teacher") === teacherUid, "teacher Study URL keeps teacher mode");
  check(studyParams.get("emulators") === "1", "emulator flag is forwarded to Study");
  await study.waitForSelector(".module-card h3", { timeout: 15000 });
  const backHref = await study.$eval("#studyBackBtn", (el) => el.href);
  const backParams = paramsOf(backHref);
  check(backParams.get("board") === boardId && backParams.get("pbreturn") === "teacher", "gallery Back points at that board");
  check(!backParams.get("mode") && !backParams.get("view"), "gallery Back does not carry module deep-link params");

  const pendPromise = waitForPopup(study);
  const pendHandle = await study.evaluateHandle(() => {
    return [...document.querySelectorAll(".module-card")].find((card) => {
      const h = card.querySelector("h3");
      return h && h.textContent === "Pendulum Physics Sandbox";
    });
  });
  await pendHandle.click();
  const pend = await pendPromise;
  await pend.waitForFunction(() => document.readyState !== "loading", { timeout: 25000 });
  const pendParams = paramsOf(pend.url());
  check(pendParams.get("board") === boardId && pendParams.get("pbreturn") === "teacher", "pendulum keeps the board return params");
  check(pendParams.get("teacher") === teacherUid && pendParams.get("emulators") === "1", "pendulum keeps teacher mode and emulators");

  await Promise.all([
    pend.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    pend.click("#studyBackBtn")
  ]);
  check(/\/study\.html/.test(pend.url()), "module Back returns to the study gallery");
  check(paramsOf(pend.url()).get("board") === boardId, "gallery still knows the board after module Back");
  const galleryBack = paramsOf(await pend.$eval("#studyBackBtn", (el) => el.href));
  check(galleryBack.get("board") === boardId && galleryBack.get("pbreturn") === "teacher", "gallery Back still targets the board");

  await Promise.all([
    pend.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    pend.click("#studyBackBtn")
  ]);
  await waitPanel(pend, "app");
  const teacherBack = await panels(pend);
  check(teacherBack.app && !teacherBack.login && !teacherBack.portal, "Back from the gallery opens the teacher board, not sign-in");
  const teacherStored = await storedState(pend);
  check(teacherStored && teacherStored.role === "teacher" && teacherStored.boardId === boardId, "the board is saved for a reload");
  check(paramsOf(pend.url()).get("board") == null && paramsOf(pend.url()).get("emulators") === "1", "the return params are removed and emulators stays");

  await pend.reload({ waitUntil: "domcontentloaded" });
  await waitPanel(pend, "app");
  const reloaded = await panels(pend);
  check(reloaded.app && !reloaded.login, "reloading the teacher board restores it instead of sign-in");
  check(await pend.$eval("#backToPortalBtn", (el) => !el.classList.contains("hidden")), "restored view is the teacher board");

  await pend.goto(URL0 + "&board=not-a-real-board&pbreturn=teacher", { waitUntil: "domcontentloaded" });
  await waitPanel(pend, "portal");
  const forged = await panels(pend);
  check(forged.portal && !forged.app && !forged.login, "a board the teacher does not own falls back to the portal");

  await pend.goto(URL0, { waitUntil: "domcontentloaded" });
  await waitPanel(pend, "portal");
  const fromPortal = await clickOpen(pend, "#studyBtn");
  check(paramsOf(fromPortal.url()).get("pbreturn") === "portal", "portal Study records a portal return");
  check(paramsOf(fromPortal.url()).get("board") == null, "portal Study has no board id");
  await Promise.all([
    fromPortal.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    fromPortal.click("#studyBackBtn")
  ]);
  await waitPanel(fromPortal, "portal");
  const portalBack = await panels(fromPortal);
  check(portalBack.portal && !portalBack.login && !portalBack.app, "Back from portal Study returns to the portal signed in");

  // Student quick-join, including a module round trip and a reload.
  const s = await newPage();
  await s.goto(URL0, { waitUntil: "domcontentloaded" });
  await waitPanel(s, "login");
  await type(s, "#usernameInput", "alice");
  await type(s, "#boardNameInput", "Return Physics");
  await s.click("#joinBtn");
  await waitPanel(s, "app");
  check((await panels(s)).app && s.alerts.length === 0, "student alice joins (" + s.alerts.join(" | ") + ")");
  await s.click("#postInput");
  await type(s, "#postInput", "restore-marker");
  await s.click("#postBtn");
  await s.waitForFunction(() => document.getElementById("posts").textContent.includes("restore-marker"), { timeout: 15000 });

  const sStudy = await clickOpen(s, "#studyBtnApp");
  await sStudy.waitForSelector(".module-card h3", { timeout: 15000 });
  const sParams = paramsOf(sStudy.url());
  check(sParams.get("board") === boardId && sParams.get("pbreturn") === "student" && !!sParams.get("student"), "student Study URL carries board and student");
  check(sParams.get("name") === "alice", "student Study URL carries the name");

  const machPromise = waitForPopup(sStudy);
  const machHandle = await sStudy.evaluateHandle(() => {
    return [...document.querySelectorAll(".module-card")].find((card) => {
      const h = card.querySelector("h3");
      return h && h.textContent === "Simple Machines Sandbox";
    });
  });
  await machHandle.click();
  const mach = await machPromise;
  await mach.waitForFunction(() => document.readyState !== "loading", { timeout: 25000 });
  check(paramsOf(mach.url()).get("board") === boardId && paramsOf(mach.url()).get("pbreturn") === "student", "machines keeps the student return params");
  await Promise.all([
    mach.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    mach.click("#studyBackBtn")
  ]);
  check(/\/study\.html/.test(mach.url()) && paramsOf(mach.url()).get("student"), "machines Back returns to the gallery with the student id");

  await Promise.all([
    mach.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    mach.click("#studyBackBtn")
  ]);
  await waitPanel(mach, "app");
  await mach.waitForFunction(() => document.getElementById("posts").textContent.includes("restore-marker"), { timeout: 20000 });
  const studentBack = await panels(mach);
  check(studentBack.app && !studentBack.login, "Back from the gallery opens alice's board");
  check(await mach.$eval("#backToPortalBtn", (el) => el.classList.contains("hidden")), "restored student view has no teacher portal button");
  const studentStored = await storedState(mach);
  check(studentStored && studentStored.role === "student" && studentStored.boardId === boardId, "student return state is stored");

  await mach.reload({ waitUntil: "domcontentloaded" });
  await waitPanel(mach, "app");
  await mach.waitForFunction(() => document.getElementById("posts").textContent.includes("restore-marker"), { timeout: 20000 });
  check(!(await panels(mach)).login, "reloading the student board restores it instead of sign-in");

  await mach.goto(URL0 + "&board=" + boardId + "&student=not-alice&pbreturn=student", { waitUntil: "domcontentloaded" });
  await waitPanel(mach, "login");
  check(!(await panels(mach)).app, "a different student id does not open the board");

  await mach.goto(URL0, { waitUntil: "domcontentloaded" });
  await waitPanel(mach, "app");
  check((await panels(mach)).app, "a clean reload still restores alice from sessionStorage");

  await mach.click("#logoutBtnApp");
  await waitPanel(mach, "login");
  check((await storedState(mach)) == null, "logout clears the stored board");
  await mach.reload({ waitUntil: "domcontentloaded" });
  await waitPanel(mach, "login");
  check((await panels(mach)).login && !(await panels(mach)).app, "after logout a reload shows sign-in");

  // Password-protected student: auth is an email account, not anonymous.
  const bob = await newPage();
  await bob.goto(URL0, { waitUntil: "domcontentloaded" });
  await waitPanel(bob, "login");
  await type(bob, "#usernameInput", "bob");
  await type(bob, "#boardNameInput", "Return Physics");
  await type(bob, "#studentPasswordInput", "bobpass1");
  await bob.click("#joinBtn");
  await waitPanel(bob, "app");
  check((await panels(bob)).app && bob.alerts.length === 0, "password student bob joins");
  const bobStudy = await clickOpen(bob, "#studyBtnApp");
  check(paramsOf(bobStudy.url()).get("pbreturn") === "student", "bob's Study link is a student return");
  await Promise.all([
    bobStudy.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    bobStudy.click("#studyBackBtn")
  ]);
  await waitPanel(bobStudy, "app");
  check(!(await panels(bobStudy)).login, "Back restores bob's board");
  await bobStudy.reload({ waitUntil: "domcontentloaded" });
  await waitPanel(bobStudy, "app");
  check((await panels(bobStudy)).app && !(await panels(bobStudy)).login, "reloading restores the password student");

  // Module deep link with no board still falls back to sign-in, and its own
  // query (mode) is preserved on the way back to the gallery.
  const deep = await newPage();
  await deep.goto("http://127.0.0.1:" + PORT + "/study-pendulum.html?mode=period&emulators=1", { waitUntil: "domcontentloaded" });
  await deep.waitForFunction(() => document.body.dataset.mode === "period", { timeout: 20000 });
  check(await deep.evaluate(() => document.body.dataset.mode) === "period", "pendulum deep link mode=period still opens that mode");
  await Promise.all([
    deep.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    deep.click("#studyBackBtn")
  ]);
  check(/\/study\.html/.test(deep.url()) && paramsOf(deep.url()).get("mode") === "period", "module Back keeps the mode deep link");
  const deepBack = paramsOf(await deep.$eval("#studyBackBtn", (el) => el.href));
  check(deepBack.get("board") == null && deepBack.get("emulators") === "1", "with no board, gallery Back falls back to /");
  await Promise.all([
    deep.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 25000 }),
    deep.click("#studyBackBtn")
  ]);
  await waitPanel(deep, "login");
  check((await panels(deep)).login && !(await panels(deep)).app, "Back with no board shows sign-in");

  const bare = await newPage();
  await bare.goto("http://127.0.0.1:" + PORT + "/study.html?emulators=1", { waitUntil: "domcontentloaded" });
  await bare.waitForSelector("#studyBackBtn");
  const bareHref = paramsOf(await bare.$eval("#studyBackBtn", (el) => el.href));
  check(bareHref.get("board") == null && bareHref.get("emulators") === "1", "Study opened with no board links Back to /");
} catch (err) {
  console.error("BROWSER TEST ERROR", err);
  failures++;
} finally {
  await browser.close();
  await env.cleanup();
  await new Promise((resolve) => server.close(resolve));
}

if (failures) {
  console.error(failures + " failure(s)");
  process.exit(1);
}
console.log("board-return browser checks passed");

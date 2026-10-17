// End-to-end smoke test of the real PopBoard pages against the local Firebase
// emulators (no real project, no login). Requires Google Chrome + puppeteer-core.
//   cd tests && npm install && npm i --no-save puppeteer-core
//   npx firebase emulators:exec --project hotseat-4f661 --only auth,firestore,storage \
//     --config ../firebase.json "node e2e-smoke.mjs"
// (serves ../public itself on http://localhost:8765)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import puppeteer from "puppeteer-core";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, getDocs, collection, updateDoc, setDoc } from "firebase/firestore";

const ROOT = new URL("../public/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json" };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(body);
  } catch { res.writeHead(404); res.end("nf"); }
}).listen(8765);

const env = await initializeTestEnvironment({
  projectId: "hotseat-4f661",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 }
});
const admin = async (fn) => env.withSecurityRulesDisabled(async (ctx) => fn(ctx.firestore()));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--headless=new"] });
const URL0 = "http://localhost:8765/?emulators=1";
let failures = 0;
const check = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) failures++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function newPage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.alerts = [];
  page.errors = [];
  page.on("dialog", async d => { page.alerts.push(d.message()); await d.accept(); });
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /permission|insufficient/i.test(m.text())) page.errors.push("console: " + m.text()); });
  await page.goto(URL0, { waitUntil: "networkidle0" });
  return page;
}
async function type(page, sel, text) { await page.$eval(sel, (el) => { el.value = ""; }); await page.type(sel, text); }
const visible = (page, id) => page.$eval("#" + id, el => !el.classList.contains("hidden"));

try {
  // ---- teacher signs up -> pending approval ----
  const t = await newPage();
  await t.click("#teacherLoginBtn");
  await type(t, "#teacherEmailInput", "teacher@example.com");
  await type(t, "#teacherPasswordInput", "teachpass1");
  await type(t, "#teacherNameInput", "Ms T");
  await t.click("#teacherSignUpBtn");
  await sleep(2500);
  check(t.alerts.some(a => /waiting for approval/i.test(a)), "new teacher is told they're waiting for approval");
  check(!(await visible(t, "boardsPortal")), "unapproved teacher doesn't get the portal");
  let tUid;
  await admin(async db => {
    const snap = await getDocs(collection(db, "teachers"));
    check(snap.size === 1 && snap.docs[0].data().approved === false && !("password" in snap.docs[0].data()), "teacher profile saved unapproved, with no password field");
    tUid = snap.docs[0].id;
    await updateDoc(doc(db, "teachers", tUid), { approved: true });
  });

  // ---- approved teacher signs in and creates a board ----
  t.alerts.length = 0;
  await t.click("#teacherSignInBtn");
  await sleep(2500);
  check(await visible(t, "boardsPortal"), "approved teacher reaches the boards portal");
  await type(t, "#newBoardNameInput", "Physics");
  await t.click("#createBoardBtn");
  await sleep(2000);
  let boardId;
  await admin(async db => {
    const snap = await getDocs(collection(db, "boards"));
    boardId = snap.docs[0] && snap.docs[0].id;
    check(snap.size === 1 && snap.docs[0].data().ownerUid === tUid, "board created with ownerUid = teacher's uid");
  });

  // ---- student quick-joins (anonymous) and posts ----
  const s1 = await newPage();
  await type(s1, "#usernameInput", "alice");
  await type(s1, "#boardNameInput", "Physics");
  await s1.click("#joinBtn");
  await sleep(3000);
  check(await visible(s1, "app"), "student 'alice' quick-joins without a password");
  check(s1.alerts.length === 0, "no error alerts on join (" + s1.alerts.join(" | ") + ")");
  await s1.click("#postInput");
  await type(s1, "#postInput", "hello <img src=x onerror=window.__xss=1>");
  await s1.click("#postBtn");
  await sleep(2500);
  const xss = await s1.evaluate(() => window.__xss === 1);
  const postText = await s1.$eval("#posts", el => el.textContent);
  check(!xss && postText.includes("<img src=x"), "HTML in a post is shown as text, not run");
  // anonymous post
  await s1.click("#postInput");
  await type(s1, "#postInput", "anon question");
  await s1.$eval("#anonymousToggle", el => { el.checked = true; });
  await s1.click("#postBtn");
  await sleep(2500);
  await admin(async db => {
    const posts = await getDocs(collection(db, "boards", boardId, "posts"));
    const anonPost = posts.docs.find(d => d.data().text === "anon question");
    check(anonPost && anonPost.data().author === "" && !("authorUid" in anonPost.data()), "anonymous post stores no author");
    const hidden = anonPost && await getDoc(doc(db, "boards", boardId, "postAuthors", anonPost.id));
    check(hidden && hidden.exists() && hidden.data().author === "alice", "hidden author recorded in postAuthors");
    const signed = posts.docs.find(d => d.data().text.startsWith("hello"));
    check(signed && signed.data().author === "alice" && !!signed.data().authorUid, "signed post records author + authorUid");
  });

  // ---- someone else can't take "alice" ----
  const s2 = await newPage();
  await type(s2, "#usernameInput", "alice");
  await type(s2, "#boardNameInput", "Physics");
  await s2.click("#joinBtn");
  await sleep(2500);
  check(s2.alerts.some(a => /already in use/i.test(a)) && !(await visible(s2, "app")), "a second device can't take an unprotected name that's in use");

  // ---- bob joins with a password (secured), then signs in from another device ----
  await type(s2, "#usernameInput", "bob");
  await type(s2, "#studentPasswordInput", "bobpass1");
  s2.alerts.length = 0;
  await s2.click("#joinBtn");
  await sleep(3500);
  check(await visible(s2, "app"), "'bob' joins with a password");
  await admin(async db => {
    const n = await getDoc(doc(db, "boards", boardId, "names", "bob"));
    check(n.exists() && n.data().secured === true && !!n.data().authSalt, "bob's name is marked protected");
  });
  const s3 = await newPage();
  await type(s3, "#usernameInput", "bob");
  await type(s3, "#boardNameInput", "Physics");
  await s3.click("#joinBtn");
  await sleep(2500);
  check(s3.alerts.some(a => /protected with a password/i.test(a)), "joining as protected 'bob' without a password is refused");
  s3.alerts.length = 0;
  await type(s3, "#studentPasswordInput", "wrongpass");
  await s3.click("#joinBtn");
  await sleep(2500);
  check(s3.alerts.some(a => /didn't pop/i.test(a)) && !(await visible(s3, "app")), "wrong password is refused");
  s3.alerts.length = 0;
  await type(s3, "#studentPasswordInput", "bobpass1");
  await s3.click("#joinBtn");
  await sleep(3500);
  check(await visible(s3, "app") && s3.alerts.length === 0, "bob signs in on another device with his password");

  // ---- upvote from bob on alice's post ----
  const upvoted = await s3.evaluate(async () => {
    const el = [...document.querySelectorAll("#posts .post")].find(p => p.textContent.includes("hello"));
    if (!el) return false;
    el.querySelector(".upvote").click();
    return true;
  });
  await sleep(2500);
  await admin(async db => {
    const posts = await getDocs(collection(db, "boards", boardId, "posts"));
    const p = posts.docs.find(d => d.data().text.startsWith("hello"));
    check(upvoted && p.data().upvotes === 1 && p.data().upvoters.includes("bob"), "bob's upvote is accepted by the rules");
  });

  // ---- teacher sees the anonymous author ----
  await t.evaluate((id) => { /* open the board */ }, boardId);
  const opened = await t.evaluate(() => { const c = document.querySelector(".board-card"); if (c) { c.click(); return true; } return false; });
  await sleep(4000);
  const teacherPosts = await t.$eval("#posts", el => el.textContent);
  check(opened && teacherPosts.includes("alice") && teacherPosts.includes("anon question"), "teacher view shows posts incl. anonymous one");
  const anonCardForTeacher = await t.evaluate(() => {
    const el = [...document.querySelectorAll("#posts .post")].find(p => p.textContent.includes("anon question"));
    return el ? el.querySelector("strong").textContent : null;
  });
  check(anonCardForTeacher && anonCardForTeacher.includes("alice"), "teacher sees who wrote the anonymous post (" + anonCardForTeacher + ")");
  const studentAnonView = await s3.evaluate(() => {
    const el = [...document.querySelectorAll("#posts .post")].find(p => p.textContent.includes("anon question"));
    return el ? el.querySelector("strong").textContent : null;
  });
  check(studentAnonView && !studentAnonView.includes("alice"), "other students see 'Anonymous' (" + (studentAnonView || "").trim() + ")");

  // ---- teacher pre-creates "carol"; a student claims that name ----
  await t.click("#studentsBtn");
  await sleep(3000);
  check(await visible(t, "studentsPortal"), "teacher opens the Students portal");
  await type(t, "#newStudentNameInput", "carol");
  await t.click("#addStudentBtn");
  await sleep(2500);
  const s4 = await newPage();
  await type(s4, "#usernameInput", "carol");
  await type(s4, "#boardNameInput", "Physics");
  await s4.click("#joinBtn");
  await sleep(3000);
  check(await visible(s4, "app") && s4.alerts.length === 0, "a student claims the teacher-created name 'carol'");
  await admin(async db => {
    const n = await getDoc(doc(db, "boards", boardId, "names", "carol"));
    check(n.exists() && !!n.data().uid, "carol's name is now linked to her sign-in");
  });
  // student raises hand (own record) -- allowed
  await s4.evaluate(() => document.getElementById("raiseHandBtn") && document.getElementById("raiseHandBtn").click());
  await sleep(2000);
  await admin(async db => {
    const snap = await getDocs(collection(db, "boards", boardId, "students"));
    const c = snap.docs.find(d => d.data().username === "carol");
    check(c && c.data().handRaised === true, "carol can raise her hand (update own record)");
  });
  // teacher opens a student's dashboard (runs the analytics reads)
  await sleep(1000);
  const openedDash = await t.evaluate(() => {
    const cards = [...document.querySelectorAll("#studentsList > *")];
    const alice = cards.find(c => c.textContent.includes("alice"));
    if (!alice) return false;
    const btn = [...alice.querySelectorAll("button")].find(b => /enter/i.test(b.textContent));
    (btn || alice).click();
    return true;
  });
  await sleep(4000);
  const dashText = await t.$eval("#dashboardContent", el => el.textContent).catch(() => "");
  check(openedDash && /alice/.test(dashText) && !/Password:/.test(dashText), "teacher sees alice's dashboard, with no password shown");

  // ---- admin: sign up, get admins/{uid} in the console, approve a teacher ----
  const pend = await newPage();
  await pend.click("#teacherLoginBtn");
  await type(pend, "#teacherEmailInput", "pending@example.com");
  await type(pend, "#teacherPasswordInput", "pendpass1");
  await type(pend, "#teacherNameInput", "Mr P");
  await pend.click("#teacherSignUpBtn");
  await sleep(2500);
  const a = await newPage();
  await a.click("#teacherLoginBtn");
  await type(a, "#teacherEmailInput", "admin@example.com");
  await type(a, "#teacherPasswordInput", "adminpass1");
  await type(a, "#teacherNameInput", "Dimitry");
  await a.click("#teacherSignUpBtn");
  await sleep(2500);
  let adminUid;
  await admin(async db => {
    const snap = await getDocs(collection(db, "teachers"));
    const d = snap.docs.find(x => x.data().email === "admin@example.com");
    adminUid = d && d.id;
    await setDoc(doc(db, "admins", adminUid), { role: "admin" }); // what you do in the console
  });
  a.alerts.length = 0;
  await a.click("#teacherSignInBtn");
  await sleep(3500);
  const adminText = await a.$eval("#boardsList", el => el.textContent).catch(() => "");
  check(/Master Admin/.test(adminText) && /Ms T/.test(adminText) && /Mr P/.test(adminText), "admin sees the Master Admin list with both teachers");
  const clickedApprove = await a.evaluate(() => {
    const btn = [...document.querySelectorAll("#boardsList button")].find(b => /Approve/.test(b.textContent));
    if (btn) { btn.click(); return true; } return false;
  });
  await sleep(2500);
  await admin(async db => {
    const snap = await getDocs(collection(db, "teachers"));
    const p2 = snap.docs.find(x => x.data().email === "pending@example.com");
    check(clickedApprove && p2 && p2.data().approved === true, "admin's Approve button approves the pending teacher");
  });

  for (const [name, p] of [["admin", a], ["carol", s4], ["teacher", t], ["alice", s1], ["s2/bob", s2], ["s3/bob", s3]]) {
    check(p.errors.length === 0, name + " page had no uncaught JS errors" + (p.errors.length ? ": " + p.errors.join(" | ") : ""));
  }
} catch (e) {
  console.error(e); failures++;
} finally {
  await browser.close(); server.close(); await env.cleanup();
}
console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);

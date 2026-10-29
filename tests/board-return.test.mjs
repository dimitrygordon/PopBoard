import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  BOARD_RETURN_STORAGE_KEY,
  normalizeId,
  buildReturnState,
  serializeReturnState,
  parseStoredReturn,
  returnStateFromSearch,
  chooseReturnTarget,
  boardAppHref,
  studyLibraryBackHref,
  studyOpenHref,
  moduleOpenHref,
  forwardStudyQuery,
  searchWithoutReturn,
  shouldUseEmulators
} from "../public/board-return.js";

function query(href) {
  var i = String(href).indexOf("?");
  return new URLSearchParams(i === -1 ? "" : href.slice(i + 1));
}

test("emulator flag only applies on localhost", () => {
  assert.equal(shouldUseEmulators("127.0.0.1", "?emulators=1"), true);
  assert.equal(shouldUseEmulators("localhost", "?emulators=1&board=b"), true);
  assert.equal(shouldUseEmulators("localhost", ""), false);
  assert.equal(shouldUseEmulators("popboard.us", "?emulators=1"), false);
  assert.equal(shouldUseEmulators("hotseat-4f661.web.app", "?emulators=1"), false);
});

test("storage key matches the pre-paint check in index.html", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(html, new RegExp(BOARD_RETURN_STORAGE_KEY));
  assert.equal(BOARD_RETURN_STORAGE_KEY, "popboard.boardReturn");
});

test("app.js and the study gallery import the shared module", () => {
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const study = readFileSync(new URL("../public/study.html", import.meta.url), "utf8");
  assert.match(app, /from "\.\/board-return\.js/);
  assert.match(app, /studyOpenHref/);
  assert.match(study, /from "\.\/board-return\.js/);
  assert.match(study, /studyLibraryBackHref/);
  assert.match(study, /moduleOpenHref/);
});

test("normalizeId rejects path and query characters", () => {
  assert.equal(normalizeId("abc_DEF-123"), "abc_DEF-123");
  assert.equal(normalizeId("  board1  "), "board1");
  assert.equal(normalizeId(""), "");
  assert.equal(normalizeId("../x"), "");
  assert.equal(normalizeId("a/b"), "");
  assert.equal(normalizeId("a b"), "");
  assert.equal(normalizeId("a?b"), "");
  assert.equal(normalizeId("."), "");
  assert.equal(normalizeId(null), "");
  assert.equal(normalizeId("x".repeat(129)), "");
});

test("buildReturnState requires a board except for the teacher portal", () => {
  assert.deepEqual(buildReturnState({ role: "portal" }), { v: 1, role: "portal" });
  assert.equal(buildReturnState({ role: "teacher" }), null);
  assert.equal(buildReturnState({ role: "student", boardId: "b1" }), null);
  assert.deepEqual(buildReturnState({ role: "teacher", boardId: "b1" }), {
    v: 1, role: "teacher", boardId: "b1"
  });
  assert.deepEqual(buildReturnState({ role: "display", boardId: "b1" }), {
    v: 1, role: "display", boardId: "b1"
  });
  assert.deepEqual(
    buildReturnState({ role: "student", boardId: "b1", studentId: "s1", name: "Ada Lovelace" }),
    { v: 1, role: "student", boardId: "b1", studentId: "s1", name: "Ada Lovelace" }
  );
  assert.equal(
    buildReturnState({ role: "student", boardId: "b1", studentId: "s1", name: "Ada Lovelace" }).name,
    "Ada Lovelace"
  );
  const dropped = buildReturnState({ role: "student", boardId: "b1", studentId: "s1", name: "a/b" });
  assert.equal(dropped.name, undefined);
  assert.equal(dropped.studentId, "s1");
  assert.equal(buildReturnState({ v: 2, role: "portal" }), null);
});

test("sessionStorage payload round-trips and rejects garbage", () => {
  const state = buildReturnState({ role: "student", boardId: "b1", studentId: "s1", name: "Ann" });
  assert.deepEqual(parseStoredReturn(serializeReturnState(state)), state);
  assert.equal(parseStoredReturn(""), null);
  assert.equal(parseStoredReturn("{"), null);
  assert.equal(parseStoredReturn("[]"), null);
  assert.equal(parseStoredReturn(JSON.stringify({ role: "student", boardId: "b1" })), null);
  assert.equal(serializeReturnState({ role: "nope" }), "");
});

test("teacher Study link records the board and Back returns to that board", () => {
  const open = studyOpenHref({
    role: "teacher",
    teacherUid: "teacherUid",
    boardId: "board1",
    emulators: true
  });
  const openQ = query(open);
  assert.equal(openQ.get("teacher"), "teacherUid");
  assert.equal(openQ.get("board"), "board1");
  assert.equal(openQ.get("pbreturn"), "teacher");
  assert.equal(openQ.get("emulators"), "1");
  assert.equal(openQ.get("student"), null);

  const back = studyLibraryBackHref(open.slice(open.indexOf("?")));
  const backQ = query(back);
  assert.equal(backQ.get("board"), "board1");
  assert.equal(backQ.get("pbreturn"), "teacher");
  assert.equal(backQ.get("emulators"), "1");
  assert.equal(backQ.get("teacher"), null);
  assert.equal(back.startsWith("./?"), true);
});

test("student Study link round-trips board, student, and name", () => {
  const open = studyOpenHref({
    role: "student",
    boardId: "board1",
    studentId: "stu1",
    name: "Ada Lovelace",
    emulators: true
  });
  const backQ = query(studyLibraryBackHref(open.slice(open.indexOf("?"))));
  assert.equal(backQ.get("board"), "board1");
  assert.equal(backQ.get("student"), "stu1");
  assert.equal(backQ.get("name"), "Ada Lovelace");
  assert.equal(backQ.get("pbreturn"), "student");
  assert.equal(backQ.get("emulators"), "1");
});

test("display mode is its own return role", () => {
  const open = studyOpenHref({ role: "display", boardId: "board1", teacherUid: "t1" });
  assert.equal(query(open).get("pbreturn"), "display");
  assert.equal(query(studyLibraryBackHref(open.slice(open.indexOf("?")))).get("pbreturn"), "display");
});

test("portal Study has no board and Back asks index to restore the portal", () => {
  const open = studyOpenHref({ role: "portal", teacherUid: "t1", emulators: true });
  const openQ = query(open);
  assert.equal(openQ.get("board"), null);
  assert.equal(openQ.get("pbreturn"), "portal");
  assert.equal(openQ.get("teacher"), "t1");
  const backQ = query(studyLibraryBackHref("?" + openQ.toString()));
  assert.equal(backQ.get("pbreturn"), "portal");
  assert.equal(backQ.get("board"), null);
  assert.equal(backQ.get("emulators"), "1");
});

test("Back falls back to / when no board is known, keeping the emulator flag", () => {
  assert.equal(studyLibraryBackHref(""), "./");
  assert.equal(studyLibraryBackHref("?teacher=t1"), "./");
  assert.equal(studyLibraryBackHref("?emulators=1"), "./?emulators=1");
  assert.equal(studyLibraryBackHref("?teacher=t1&emulators=1"), "./?emulators=1");
  assert.equal(boardAppHref(null, { emulators: false }), "./");
});

test("older student links without pbreturn still return to the board", () => {
  const state = returnStateFromSearch("?board=b1&student=s1&name=Ann");
  assert.equal(state.role, "student");
  assert.equal(state.boardId, "b1");
  assert.equal(state.studentId, "s1");
  const backQ = query(studyLibraryBackHref("?board=b1&student=s1&name=Ann&emulators=1"));
  assert.equal(backQ.get("pbreturn"), "student");
  assert.equal(backQ.get("board"), "b1");
});

test("a board id without a student is a teacher return", () => {
  const state = returnStateFromSearch("?board=b1");
  assert.deepEqual(state, { v: 1, role: "teacher", boardId: "b1" });
});

test("module deep-link params are not sent back to the PopBoard", () => {
  const search = "?board=b1&student=s1&name=Ann&pbreturn=student&view=3d&mode=period&T=5800&n=2&emulators=1&sky=clear";
  const backQ = query(studyLibraryBackHref(search));
  assert.equal(backQ.get("board"), "b1");
  assert.equal(backQ.get("student"), "s1");
  assert.equal(backQ.get("name"), "Ann");
  assert.equal(backQ.get("pbreturn"), "student");
  assert.equal(backQ.get("emulators"), "1");
  assert.equal(backQ.get("view"), null);
  assert.equal(backQ.get("mode"), null);
  assert.equal(backQ.get("T"), null);
  assert.equal(backQ.get("n"), null);
  assert.equal(backQ.get("sky"), null);

  const opened = moduleOpenHref("study-luminosity.html", search);
  const openedQ = query(opened);
  assert.equal(opened.startsWith("study-luminosity.html?"), true);
  assert.equal(openedQ.get("board"), "b1");
  assert.equal(openedQ.get("student"), "s1");
  assert.equal(openedQ.get("pbreturn"), "student");
  assert.equal(openedQ.get("emulators"), "1");
  assert.equal(openedQ.get("view"), null);
  assert.equal(openedQ.get("mode"), null);
  assert.equal(openedQ.get("T"), null);
  assert.equal(forwardStudyQuery("?mode=period&view=3d").toString(), "");
  assert.equal(moduleOpenHref("study-pendulum.html", "?mode=period"), "study-pendulum.html");
});

test("URL return target wins over sessionStorage, except a bare reload", () => {
  const stored = serializeReturnState({ role: "teacher", boardId: "storedBoard" });
  const chosen = chooseReturnTarget("?board=urlBoard&pbreturn=teacher&emulators=1", stored);
  assert.equal(chosen.source, "url");
  assert.equal(chosen.state.boardId, "urlBoard");

  const reload = chooseReturnTarget("?emulators=1", stored);
  assert.equal(reload.source, "storage");
  assert.equal(reload.state.boardId, "storedBoard");

  assert.equal(chooseReturnTarget("", ""), null);
  assert.equal(chooseReturnTarget("?sky=night", "not-json"), null);
});

test("an explicit but unusable return does not substitute storage", () => {
  const stored = serializeReturnState({ role: "teacher", boardId: "storedBoard" });
  assert.equal(chooseReturnTarget("?board=../secret", stored), null);
  assert.equal(chooseReturnTarget("?pbreturn=student", stored), null);
  assert.equal(chooseReturnTarget("?board=b1&pbreturn=student", stored), null);
});

test("portal does not override an explicit board", () => {
  const state = returnStateFromSearch("?board=b1&pbreturn=portal");
  assert.equal(state.role, "teacher");
  assert.equal(state.boardId, "b1");
});

test("every study module returns to the gallery and keeps its query string", () => {
  const dir = new URL("../public/", import.meta.url);
  const names = readdirSync(dir).filter((name) => /^study-.*\.html$/.test(name));
  assert.ok(names.includes("study-pendulum.html"));
  assert.ok(names.includes("study-machines.html"));
  assert.ok(names.includes("study-rbm.html"));
  for (const name of names) {
    const html = readFileSync(new URL(name, dir), "utf8");
    if (!html.includes("data-study-back")) continue;
    let source = html;
    const extra = html.match(/src="([^"]+-ui\.js)"/);
    if (extra) source += "\n" + readFileSync(new URL(extra[1], dir), "utf8");
    // Pages that pick a UI at load time (Relativity: sandbox or Lightspeed Ride; Orbits: playground or Solar System mode): every UI must return.
    const picked = [...html.matchAll(/import\("\.\/([^"]+-ui\.js)"\)/g)].map((m) => m[1]);
    for (const file of picked) assert.match(readFileSync(new URL(file, dir), "utf8"), /study\.html"\s*\+\s*location\.search/, `${name}: ${file}`);
    if (!picked.length) assert.match(source, /study\.html"\s*\+\s*location\.search/, name);
  }
});

test("searchWithoutReturn keeps emulator and unrelated deep links", () => {
  assert.equal(
    searchWithoutReturn("?emulators=1&sky=night&mode=clear&board=b1&student=s1&name=Ann&pbreturn=student"),
    "?emulators=1&sky=night&mode=clear"
  );
  assert.equal(searchWithoutReturn("?board=b1&pbreturn=teacher"), "");
  assert.equal(searchWithoutReturn("?emulators=1"), "?emulators=1");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  PDF_EXPORT_BUTTON_LABEL,
  PDF_EXPORT_CHOICES,
  PDF_PAGE,
  PDF_SCREENS,
  canShowPdfExport,
  currentScreenFromVisibility,
  pageContentBox,
  planPages,
  screensForChoice
} from "../public/pdf-export.js";

const teacher = {
  authUser: { uid: "t1", isAnonymous: false },
  isTeacher: true,
  isDisplayMode: false,
  isMasterAdmin: false,
  teacherApproved: true
};

test("PDF Export label and chooser options are exact", () => {
  assert.equal(PDF_EXPORT_BUTTON_LABEL, "PDF Export");
  assert.deepEqual(PDF_EXPORT_CHOICES.map((choice) => choice.label), [
    "This page",
    "PopBoard",
    "Students board",
    "Student account",
    "Seating map",
    "All of these"
  ]);
});

test("canShowPdfExport follows the teacher role gate", () => {
  assert.equal(canShowPdfExport(teacher), true);
  assert.equal(canShowPdfExport({
    authUser: { uid: "admin", isAnonymous: false },
    isTeacher: true,
    isDisplayMode: false,
    isMasterAdmin: true,
    teacherApproved: false
  }), true);

  assert.equal(canShowPdfExport(null), false);
  assert.equal(canShowPdfExport(undefined), false);
  assert.equal(canShowPdfExport({}), false);
  assert.equal(canShowPdfExport({ authUser: null, isTeacher: true, teacherApproved: true }), false);

  assert.equal(canShowPdfExport({
    authUser: { uid: "anon", isAnonymous: true },
    isTeacher: false,
    teacherApproved: false
  }), false);
  assert.equal(canShowPdfExport({
    authUser: { uid: "anon", isAnonymous: true },
    isTeacher: true,
    teacherApproved: true
  }), false);

  assert.equal(canShowPdfExport({
    authUser: { uid: "stu", isAnonymous: false },
    isTeacher: false,
    isDisplayMode: false,
    teacherApproved: false,
    isMasterAdmin: false
  }), false);

  assert.equal(canShowPdfExport({
    authUser: { uid: "pending", isAnonymous: false },
    isTeacher: false,
    teacherApproved: false
  }), false);
  assert.equal(canShowPdfExport({
    authUser: { uid: "pending", isAnonymous: false },
    isTeacher: true,
    teacherApproved: false,
    isMasterAdmin: false,
    isDisplayMode: false
  }), false);

  assert.equal(canShowPdfExport({ ...teacher, isDisplayMode: true }), false);
  assert.equal(canShowPdfExport({ ...teacher, isTeacher: false, isDisplayMode: true }), false);
});

test("screensForChoice maps the chooser onto the four screens", () => {
  assert.deepEqual(screensForChoice("this", "students"), ["students"]);
  assert.deepEqual(screensForChoice("this", "seating"), ["seating"]);
  assert.deepEqual(screensForChoice("this", ""), []);
  assert.deepEqual(screensForChoice("this", "boards"), []);
  assert.deepEqual(screensForChoice("popboard", "students"), ["popboard"]);
  assert.deepEqual(screensForChoice("student", "popboard"), ["student"]);
  assert.deepEqual(screensForChoice("all", "seating"), PDF_SCREENS.slice());
  assert.deepEqual(screensForChoice("nope", "popboard"), []);
});

test("currentScreenFromVisibility ignores the poll-response seat overlay", () => {
  assert.equal(currentScreenFromVisibility({ seating: true }), "seating");
  assert.equal(currentScreenFromVisibility({
    seating: true,
    seatingPollModal: true,
    popboard: true
  }), "popboard");
  assert.equal(currentScreenFromVisibility({ student: true, students: true }), "student");
  assert.equal(currentScreenFromVisibility({ students: true, popboard: true }), "students");
  assert.equal(currentScreenFromVisibility({ popboard: true }), "popboard");
  assert.equal(currentScreenFromVisibility({}), "");
  assert.equal(currentScreenFromVisibility(null), "");
});

test("page content box is letter size minus margins and a safety gap", () => {
  const box = pageContentBox();
  assert.equal(box.innerWidthPx, 7.5 * PDF_PAGE.cssPxPerIn);
  assert.equal(box.innerHeightPx, 10 * PDF_PAGE.cssPxPerIn - PDF_PAGE.safetyPx);
});

function assertPlanSafe(pages, blocks, limit, gap) {
  const ids = pages.flatMap((page) => page.items.map((item) => item.id));
  assert.deepEqual(ids, blocks.map((block) => String(block.id)));
  for (const page of pages) {
    let used = 0;
    page.items.forEach((item, index) => {
      const visual = item.height * item.scale;
      assert.ok(visual <= limit + 0.001, "block " + item.id + " exceeds the page");
      assert.ok(item.scale > 0 && item.scale <= 1);
      used += visual;
      if (index) used += gap;
    });
    assert.ok(used <= limit + 0.001);
    assert.ok(Math.abs(used - page.contentHeight) < 0.001);
  }
}

test("planPages keeps every block whole and inside a page", () => {
  const gap = 16;
  const limit = 400;
  const blocks = [
    { id: "post-a", height: 250 },
    { id: "post-b", height: 300 },
    { id: "post-c", height: 100 }
  ];
  const pages = planPages(blocks, limit, gap);
  assert.equal(pages.length, 3);
  assert.deepEqual(pages[0].items.map((item) => item.id), ["post-a"]);
  assert.deepEqual(pages[1].items.map((item) => item.id), ["post-b"]);
  assert.deepEqual(pages[2].items.map((item) => item.id), ["post-c"]);
  assert.equal(pages[0].items[0].scale, 1);
  assertPlanSafe(pages, blocks, limit, gap);
  assert.deepEqual(blocks.map((block) => block.height), [250, 300, 100]);
});

test("planPages packs blocks that fit and scales a block taller than a page", () => {
  const gap = PDF_PAGE.blockGapPx;
  const limit = pageContentBox().innerHeightPx;
  const packed = [
    { id: "a", height: 100 },
    { id: "b", height: 100 },
    { id: "c", height: 100 }
  ];
  const packedPages = planPages(packed, 216, gap);
  assert.equal(packedPages.length, 2);
  assert.deepEqual(packedPages[0].items.map((item) => item.id), ["a", "b"]);
  assert.deepEqual(packedPages[1].items.map((item) => item.id), ["c"]);

  const tall = planPages([{ id: "map", height: limit + 400 }, { id: "note", height: 40 }], limit, gap);
  assert.equal(tall.length, 2);
  assert.equal(tall[0].items.length, 1);
  assert.ok(tall[0].items[0].scale < 1);
  assert.ok(Math.abs(tall[0].items[0].height * tall[0].items[0].scale - limit) < 0.001);
  assert.equal(tall[1].items[0].id, "note");
  assert.equal(tall[1].items[0].scale, 1);
  assertPlanSafe(tall, [{ id: "map", height: limit + 400 }, { id: "note", height: 40 }], limit, gap);
});

test("planPages rejects a non-positive page and keeps short pages exact", () => {
  assert.deepEqual(planPages([{ id: "a", height: 10 }], 0, 16), []);
  assert.deepEqual(planPages([{ id: "a", height: 10 }], -5, 16), []);
  assert.deepEqual(planPages([], 200, 16), []);
  const exact = planPages([{ id: "a", height: 100 }, { id: "b", height: 100 }], 216, 16);
  assert.equal(exact.length, 1);
  assert.equal(exact[0].contentHeight, 216);
});

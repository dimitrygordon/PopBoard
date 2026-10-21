// Teacher-only PDF export for the PopBoard, Students board, Student account,
// and Seating map screens (all sections of index.html).
//
// Output is a real print layout, not a canvas screenshot. html2canvas /
// html2pdf rasterizes the page and drops or blanks backdrop-filter, canvas
// charts, and large images on iPhone and iPad Safari. window.print() keeps
// text as text and is the path Safari and Chromebook Chrome already use for
// "Save as PDF". CSS break-inside is not reliable for this layout (absolute
// seats, carousels, flex cards), so each card, post, image, seat map, and
// text block is measured and placed whole on a page. A block taller than one
// page is scaled down onto its own page instead of being sliced.
//
// The button is created only when canShowPdfExport() is true. Students and
// signed-out users never get the element. Hiding it with CSS is not the gate.

export var PDF_EXPORT_BUTTON_LABEL = "PDF Export";

export var PDF_EXPORT_CHOICES = [
  { id: "this", label: "This page" },
  { id: "popboard", label: "PopBoard" },
  { id: "students", label: "Students board" },
  { id: "student", label: "Student account" },
  { id: "seating", label: "Seating map" },
  { id: "all", label: "All of these" }
];

export var PDF_SCREENS = ["popboard", "students", "student", "seating"];

// US Letter. safetyPx is unused space inside the page so subpixel rounding
// and card shadows cannot land on the next page or get clipped.
export var PDF_PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  marginIn: 0.5,
  cssPxPerIn: 96,
  safetyPx: 24,
  blockGapPx: 16
};

var SCREEN_META = {
  popboard: { rootId: "app", title: "PopBoard", portal: false },
  students: { rootId: "studentsPortal", title: "Students board", portal: true },
  student: { rootId: "studentDashboard", title: "Student account", portal: true },
  seating: { rootId: "seatingMap", title: "Seating map", portal: true }
};

var EMPTY_NOTE = {
  popboard: "This PopBoard has nothing to export yet.",
  students: "No students to export yet.",
  student: "No student account is open. Open a student from the Students board, then export again.",
  seating: "No seating map to export yet."
};

// Outermost pieces that must stay on one page. Descendants (a photo inside
// a post, a seat inside the map) travel with their parent.
var ATOMIC_SELECTOR = [
  ".post",
  ".poll",
  ".reply",
  ".metric-card",
  ".board-card",
  ".teacher-panel",
  ".daily-dashboard-card",
  ".leaderboard-card",
  "#seatCanvas",
  ".seat-mode-bar",
  ".unassigned-students-pills",
  ".pdf-screen-title",
  ".pdf-empty-note",
  "#classSessionToggleContainer",
  "#leaderboardToggleContainer",
  ".class-confusion-timeline",
  ".study-session-row",
  ".archived-comments-header",
  ".archived-polls-header",
  "img",
  "h1",
  "h2",
  "h3",
  "p",
  "li",
  "blockquote",
  "pre",
  "table"
].join(",");

var STRIP_SELECTOR = [
  "header",
  ".pdf-export-footer",
  "#newPost",
  "#confusionIndicator",
  "#teacherHandRaiseBar",
  "#confusionPrompt",
  "#pollCreation",
  "#sortSection",
  ".create-board-section",
  ".board-card-actions",
  "#seatEditControls",
  ".seat-delete",
  ".poll-carousel-nav",
  ".poll-collapse-row",
  ".seat-map-modal-close",
  "#dailyDataToggleBtn",
  "#mergeStudentBtn",
  "#resetSignInBtn",
  "script",
  "style",
  "iframe"
].join(",");

export function pageContentBox(page) {
  var spec = page || PDF_PAGE;
  var innerHeightPx = (spec.heightIn - spec.marginIn * 2) * spec.cssPxPerIn - spec.safetyPx;
  var innerWidthPx = (spec.widthIn - spec.marginIn * 2) * spec.cssPxPerIn;
  return { innerHeightPx: innerHeightPx, innerWidthPx: innerWidthPx };
}

// Mirrors enterTeacherPortal() plus the isTeacher flag the rest of the app
// already uses. A teacher is a non-anonymous Firebase user with an approved
// teachers/{uid} profile, or an admins/{uid} doc. Display mode forces the
// student UI (isTeacher is cleared there) and does not get the button.
export function canShowPdfExport(session) {
  if (!session || !session.authUser || session.authUser.isAnonymous) return false;
  if (session.isDisplayMode === true) return false;
  if (session.isTeacher !== true) return false;
  if (session.teacherApproved === true || session.isMasterAdmin === true) return true;
  return false;
}

export function screensForChoice(choiceId, currentScreen) {
  if (choiceId === "all") return PDF_SCREENS.slice();
  if (choiceId === "this") {
    if (PDF_SCREENS.indexOf(currentScreen) === -1) return [];
    return [currentScreen];
  }
  if (PDF_SCREENS.indexOf(choiceId) === -1) return [];
  return [choiceId];
}

// Which of the four screens is on screen. The poll-response seat map is an
// overlay on the PopBoard, not the seating page.
export function currentScreenFromVisibility(flags) {
  flags = flags || {};
  if (flags.seating && !flags.seatingPollModal) return "seating";
  if (flags.student) return "student";
  if (flags.students) return "students";
  if (flags.popboard) return "popboard";
  return "";
}

// Pack unbreakable blocks onto pages. A block taller than the page is scaled
// to fit on a page of its own. Every input id appears on exactly one page,
// and no page's laid-out height (scaled block heights plus gaps) exceeds
// pageInnerHeight.
export function planPages(blocks, pageInnerHeight, gap) {
  var limit = Number(pageInnerHeight);
  var spacing = Number(gap);
  if (!isFinite(limit) || limit <= 0) return [];
  if (!isFinite(spacing) || spacing < 0) spacing = 0;
  var source = blocks || [];
  var items = [];
  for (var i = 0; i < source.length; i++) {
    var block = source[i] || {};
    var height = Number(block.height);
    if (!isFinite(height) || height < 0) height = 0;
    items.push({ id: block.id == null ? String(i) : String(block.id), height: height });
  }
  var pages = [];
  var current = [];
  var used = 0;

  function contentHeightOf(list) {
    var total = 0;
    for (var c = 0; c < list.length; c++) {
      total += list[c].height * list[c].scale;
      if (c) total += spacing;
    }
    return total;
  }

  function closePage() {
    if (!current.length) return;
    pages.push({ items: current, contentHeight: contentHeightOf(current) });
    current = [];
    used = 0;
  }

  for (var n = 0; n < items.length; n++) {
    var item = items[n];
    if (item.height > limit) {
      closePage();
      var fitted = { id: item.id, height: item.height, scale: limit / item.height };
      pages.push({ items: [fitted], contentHeight: item.height * fitted.scale });
      continue;
    }
    var next = current.length ? used + spacing + item.height : item.height;
    if (current.length && next > limit) closePage();
    current.push({ id: item.id, height: item.height, scale: 1 });
    used = current.length === 1 ? item.height : used + spacing + item.height;
  }
  closePage();
  return pages;
}

function makeTitle(text) {
  var h = document.createElement("h2");
  h.className = "pdf-screen-title";
  h.textContent = text;
  return h;
}

function makeNote(key) {
  var p = document.createElement("p");
  p.className = "pdf-empty-note";
  p.textContent = EMPTY_NOTE[key] || "";
  return p;
}

function cloneWithBitmaps(node) {
  var clone = node.cloneNode(true);
  var srcCanvas = node.querySelectorAll("canvas");
  var dstCanvas = clone.querySelectorAll("canvas");
  for (var i = 0; i < srcCanvas.length && i < dstCanvas.length; i++) {
    var w = srcCanvas[i].width;
    var h = srcCanvas[i].height;
    if (!w || !h) continue;
    dstCanvas[i].width = w;
    dstCanvas[i].height = h;
    try {
      dstCanvas[i].getContext("2d").drawImage(srcCanvas[i], 0, 0);
    } catch (e) { /* a tainted canvas is left blank rather than failing the export */ }
  }
  var srcImg = node.querySelectorAll("img");
  var dstImg = clone.querySelectorAll("img");
  for (var j = 0; j < srcImg.length && j < dstImg.length; j++) {
    var rect = srcImg[j].getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      dstImg[j].style.width = Math.round(rect.width) + "px";
      dstImg[j].style.height = Math.round(rect.height) + "px";
      dstImg[j].style.maxWidth = "100%";
      dstImg[j].style.objectFit = "contain";
    }
  }
  return clone;
}

function stripChrome(clone) {
  var doomed = clone.querySelectorAll(STRIP_SELECTOR);
  for (var i = 0; i < doomed.length; i++) {
    if (doomed[i].parentNode) doomed[i].parentNode.removeChild(doomed[i]);
  }
}

function collectAtomic(root) {
  var out = [];
  function walk(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.hidden || node.classList.contains("hidden")) return;
    if (node.matches(ATOMIC_SELECTOR)) {
      out.push(node);
      return;
    }
    var kids = node.children;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }
  var kids = root.children;
  for (var c = 0; c < kids.length; c++) walk(kids[c]);
  return out;
}

function captureScreenNodes(key, multi) {
  var meta = SCREEN_META[key];
  var root = document.getElementById(meta.rootId);
  if (!root) return [];
  var source = meta.portal ? (root.querySelector(":scope > .portal-container") || root) : root;
  var clone = cloneWithBitmaps(source);
  stripChrome(clone);
  if (multi && (key === "students" || key === "seating")) {
    var heading = clone.querySelector(":scope > h2");
    if (heading && heading.parentNode) heading.parentNode.removeChild(heading);
  }
  var nodes = collectAtomic(clone);
  if (multi || key === "popboard") nodes.unshift(makeTitle(meta.title));
  var onlyTitle = nodes.length === 1 && nodes[0].classList && nodes[0].classList.contains("pdf-screen-title");
  if (!nodes.length || onlyTitle) nodes.push(makeNote(key));
  return nodes;
}

function mountMeasureHost(nodes, widthPx) {
  var host = document.createElement("div");
  host.className = "pdf-measure-host";
  host.style.width = widthPx + "px";
  host.setAttribute("aria-hidden", "true");
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].setAttribute("data-pdf-block-id", "b" + i);
    host.appendChild(nodes[i]);
  }
  document.body.appendChild(host);
  return host;
}

function readMeasured(nodes) {
  var measured = [];
  for (var n = 0; n < nodes.length; n++) {
    var rect = nodes[n].getBoundingClientRect();
    measured.push({
      id: "b" + n,
      height: Math.ceil(rect.height) || 0,
      node: nodes[n]
    });
  }
  return measured;
}

async function buildPrintRoot(nodeGroups) {
  var box = pageContentBox();
  var flat = [];
  for (var g = 0; g < nodeGroups.length; g++) {
    for (var n = 0; n < nodeGroups[g].length; n++) flat.push(nodeGroups[g][n]);
  }
  var host = mountMeasureHost(flat, box.innerWidthPx);
  await settleImages(host);
  var measured = readMeasured(flat);
  var byId = {};
  for (var i = 0; i < measured.length; i++) byId[measured[i].id] = measured[i];
  var plan = planPages(measured, box.innerHeightPx, PDF_PAGE.blockGapPx);
  var root = document.createElement("div");
  root.id = "pdf-export-root";
  root.setAttribute("aria-label", "PDF preview");
  if (!plan.length) {
    var emptySheet = document.createElement("section");
    emptySheet.className = "pdf-sheet";
    emptySheet.appendChild(makeNote("popboard"));
    root.appendChild(emptySheet);
  }
  for (var p = 0; p < plan.length; p++) {
    var sheet = document.createElement("section");
    sheet.className = "pdf-sheet";
    sheet.setAttribute("data-pdf-page", String(p + 1));
    var inner = document.createElement("div");
    inner.className = "pdf-sheet-inner";
    var pageItems = plan[p].items;
    for (var k = 0; k < pageItems.length; k++) {
      var spec = pageItems[k];
      var block = document.createElement("div");
      block.className = "pdf-block";
      var fit = document.createElement("div");
      fit.className = "pdf-block-fit";
      if (spec.scale < 0.999) fit.style.zoom = String(spec.scale);
      fit.appendChild(byId[spec.id].node);
      block.appendChild(fit);
      inner.appendChild(block);
    }
    sheet.appendChild(inner);
    root.appendChild(sheet);
  }
  if (host.parentNode) host.parentNode.removeChild(host);
  return root;
}

function settleImages(root) {
  var imgs = root.querySelectorAll("img");
  var waits = [];
  for (var i = 0; i < imgs.length; i++) {
    if (imgs[i].complete) continue;
    waits.push(new Promise(function(resolve) {
      imgs[i].addEventListener("load", resolve, { once: true });
      imgs[i].addEventListener("error", resolve, { once: true });
    }));
  }
  if (!waits.length) return Promise.resolve();
  return Promise.race([
    Promise.all(waits),
    new Promise(function(resolve) { setTimeout(resolve, 2500); })
  ]);
}

export function installPdfExport(options) {
  if (typeof document === "undefined") return { refresh: function() {} };
  options = options || {};
  var getSession = typeof options.getSession === "function" ? options.getSession : function() { return null; };
  var ensureScreen = typeof options.ensureScreen === "function" ? options.ensureScreen : function() { return Promise.resolve(); };
  var busy = false;

  var screens = [
    { key: "popboard", id: "app" },
    { key: "students", id: "studentsPortal" },
    { key: "student", id: "studentDashboard" },
    { key: "seating", id: "seatingMap" }
  ];

  function isSurface(el, key) {
    if (!el || el.classList.contains("hidden")) return false;
    if (key === "seating" && el.classList.contains("seating-map-poll-modal")) return false;
    return true;
  }

  function findFooter(el) {
    return el.querySelector(":scope > .pdf-export-footer, :scope > .portal-container > .pdf-export-footer");
  }

  function removeFooter(el) {
    var footer = findFooter(el);
    if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
  }

  function refresh() {
    var allowed = canShowPdfExport(getSession());
    for (var i = 0; i < screens.length; i++) {
      var screen = screens[i];
      var el = document.getElementById(screen.id);
      if (!el) continue;
      if (!allowed || !isSurface(el, screen.key)) {
        removeFooter(el);
        continue;
      }
      if (findFooter(el)) continue;
      var container = el.querySelector(":scope > .portal-container") || el;
      var footer = document.createElement("div");
      footer.className = "pdf-export-footer";
      footer.setAttribute("data-pdf-screen", screen.key);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pdf-export-btn";
      button.textContent = PDF_EXPORT_BUTTON_LABEL;
      (function(screenKey) {
        button.addEventListener("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          openChooser(screenKey);
        });
      })(screen.key);
      footer.appendChild(button);
      container.appendChild(footer);
    }
  }

  function closeChooser() {
    var existing = document.getElementById("pdfExportChooser");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    document.removeEventListener("keydown", onChooserKey);
  }

  function onChooserKey(event) {
    if (event.key === "Escape") closeChooser();
  }

  function openChooser(screenKey) {
    if (!canShowPdfExport(getSession())) return;
    closeChooser();
    var overlay = document.createElement("div");
    overlay.id = "pdfExportChooser";
    overlay.className = "simple-picker-overlay pdf-chooser";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", PDF_EXPORT_BUTTON_LABEL);
    overlay.addEventListener("click", function(event) {
      if (event.target === overlay && !busy) closeChooser();
    });
    var card = document.createElement("div");
    card.className = "simple-picker-card pdf-chooser-card";
    var heading = document.createElement("h3");
    heading.id = "pdfExportChooserTitle";
    heading.textContent = PDF_EXPORT_BUTTON_LABEL;
    card.appendChild(heading);
    var list = document.createElement("div");
    list.className = "pdf-chooser-options";
    for (var i = 0; i < PDF_EXPORT_CHOICES.length; i++) {
      var choice = PDF_EXPORT_CHOICES[i];
      var row = document.createElement("button");
      row.type = "button";
      row.textContent = choice.label;
      (function(choiceId) {
        row.addEventListener("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          runExport(choiceId, screenKey, list);
        });
      })(choice.id);
      list.appendChild(row);
    }
    card.appendChild(list);
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "seat-map-modal-close";
    closeBtn.textContent = "✕";
    closeBtn.title = "Close";
    closeBtn.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) closeChooser();
    });
    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onChooserKey);
  }

  function cleanupPrint() {
    document.body.classList.remove("pdf-printing");
    var root = document.getElementById("pdf-export-root");
    if (root && root.parentNode) root.parentNode.removeChild(root);
    var bar = document.getElementById("pdfExportToolbar");
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function showPrint(root) {
    cleanupPrint();
    document.body.classList.add("pdf-printing");
    document.body.appendChild(root);
    var bar = document.createElement("div");
    bar.id = "pdfExportToolbar";
    bar.className = "pdf-export-toolbar";
    var save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save as PDF";
    save.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      // Fresh user gesture. iOS Safari ignores window.print() after the
      // await that built these pages, so this button is the reliable path.
      window.print();
    });
    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "Close";
    close.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      cleanupPrint();
    });
    bar.appendChild(save);
    bar.appendChild(close);
    document.body.appendChild(bar);
    window.scrollTo(0, 0);
    // Chrome still has transient activation for a few seconds after the
    // chooser tap, so the system dialog can open without a second tap.
    // The pages stay mounted either way: removing them inside afterprint
    // can make Safari snapshot a blank page.
    var activation = navigator.userActivation;
    if (!activation || activation.isActive) {
      try { window.print(); } catch (e) { /* the Save as PDF button remains */ }
    }
  }

  async function runExport(choiceId, screenKey, listEl) {
    if (busy || !canShowPdfExport(getSession())) return;
    var keys = screensForChoice(choiceId, screenKey);
    if (!keys.length) return;
    busy = true;
    if (listEl) {
      listEl.innerHTML = "";
      var pending = document.createElement("p");
      pending.className = "pdf-empty-note";
      pending.textContent = "Preparing the PDF…";
      listEl.appendChild(pending);
    }
    try {
      var groups = [];
      for (var i = 0; i < keys.length; i++) {
        await ensureScreen(keys[i]);
        groups.push(captureScreenNodes(keys[i], keys.length > 1));
      }
      var root = await buildPrintRoot(groups);
      closeChooser();
      showPrint(root);
    } catch (err) {
      console.error("PDF export failed", err);
      closeChooser();
      alert("Couldn't prepare the PDF. Check your connection and try again.");
    } finally {
      busy = false;
    }
  }

  var observer = new MutationObserver(refresh);
  for (var s = 0; s < screens.length; s++) {
    var el = document.getElementById(screens[s].id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  }
  refresh();
  return { refresh: refresh };
}

if (typeof window !== "undefined") {
  window.PopboardPdf = {
    canShowPdfExport: canShowPdfExport,
    planPages: planPages,
    screensForChoice: screensForChoice,
    currentScreenFromVisibility: currentScreenFromVisibility,
    pageContentBox: pageContentBox,
    install: installPdfExport,
    PDF_EXPORT_BUTTON_LABEL: PDF_EXPORT_BUTTON_LABEL,
    PDF_EXPORT_CHOICES: PDF_EXPORT_CHOICES
  };
}

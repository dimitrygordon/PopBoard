import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment, arrayUnion, arrayRemove, where, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyClkHjUnQ96VNRj1FxyY-ca-AcDWYoX_m8",
  authDomain: "hotseat-4f661.firebaseapp.com",
  projectId: "hotseat-4f661",
  storageBucket: "hotseat-4f661.firebasestorage.app",
  messagingSenderId: "1052089495081",
  appId: "1:1052089495081:web:15293be177ad3a6f577638"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let username = "";
let studentPassword = "";
let isTeacher = false;
let isDisplayMode = false;
let isMasterAdmin = false;
let teacherAccount = "";
let currentBoardId = "";
let currentStudentId = "";
let sortMode = "new";
let leaderboardVisible = true;
let classSessionActive = false;
let classSessionStartAt = null;
let classSessionEndAt = null;
let classTimelineRedrawInterval = null;
let studentEmoji = "";
let myUpvotedPostIds = new Set();
let myPollVotes = new Map();
let postImageFile = null;
let unsubPosts = null;
let unsubPolls = null;
let unsubLeaderboard = null;
let unsubBoardSettings = null;
let studentNickname = "";
let dailyDataVisible = false;
let prevLeaderboardRanks = {};
let studentCorrectStreak = 0;
let celebratedPollIds = new Set();
let unsubSeats = null;
let unsubOwnConfusion = null;
let confusionSparklineInterval = null;
let confusionPromptInterval = null;
let seatingStudentsCache = {};
let seatingSeatsCache = [];
let draggingSeatId = null;
let openSeatPopupId = null;
let pollSectionCollapsed = false;
let currentCarouselPollId = null;
let seatMapResponsePollId = null;
let seatMapResponsePollQuestion = "";
let seatMapResponsePollData = null;
let isLeaderboardCompressed = false;
var LEADERBOARD_TOP_N = 5;
var LEADERBOARD_COMPACT_N = 3;
var unsubDashSeats = null;
var dashSeatStudentsCache = {};
var dashSeatSeatsCache = [];
var hoveredSeatId = null;
var seatPopupOpenedByHover = false;

// ─── MINIMAL ICON SET ───────────────────────────────────────────────────────
// Hand-drawn 24x24 line icons, stroke="currentColor" so each one inherits its
// button's own text color (incl. the red delete button's forced white) and
// adapts to light/dark theme automatically -- no extra CSS vars needed.
var ICONS = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M2 12C4.5 7 8 5 12 5s7.5 2 10 7c-2.5 5-6 7-10 7s-7.5-2-10-7Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M3.5 7C5.8 5.3 8.6 4.3 12 4.3c4 0 7.5 2 10 6.7-1 1.9-2.2 3.4-3.6 4.5M9.5 9.6a3 3 0 0 0 4.2 4.2M6.2 17.3C4.3 16 2.9 14.1 2 12c.5-1 1.1-1.9 1.8-2.8"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 21v-5h5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  seat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M6 4v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4"/><path d="M6 13v6"/><path d="M18 13v6"/><path d="M9 13v4"/><path d="M15 13v4"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M2 9c2-1.5 5-2.2 10-2.2S20 7.5 22 9c-.3 4-2.3 7-5 7-2 0-2.6-1.7-5-1.7S7 16 5 16c-2.7 0-4.7-3-5-7Z"/><circle cx="7.5" cy="10.3" r="0.9" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.3" r="0.9" fill="currentColor" stroke="none"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5Z"/><path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5Z"/></svg>',
  maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M4 9V4h5"/><path d="M15 4h5v5"/><path d="M20 15v5h-5"/><path d="M9 20H4v-5"/></svg>',
  minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M20 15h-5v5"/><path d="M9 20v-5H4"/></svg>',
  eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon-svg"><path d="M3.5 16.5 12 8l5 5-5.5 5.5a2 2 0 0 1-2.8 0l-4.7-4.7a2 2 0 0 1 0-2.8Z"/><path d="M7 20h11"/></svg>'
};

function iconLabel(name, text) { return ICONS[name] + (text ? " " + text : ""); }
function eyeLabel(visible, shownText, hiddenText) { return iconLabel(visible ? "eye" : "eyeOff", visible ? shownText : hiddenText); }

const loginDiv = document.getElementById("login");
const teacherLoginDiv = document.getElementById("teacherLogin");
const boardsPortalDiv = document.getElementById("boardsPortal");
const studentsPortalDiv = document.getElementById("studentsPortal");
const studentDashboardDiv = document.getElementById("studentDashboard");
const appDiv = document.getElementById("app");
const usernameInput = document.getElementById("usernameInput");
const joinBtn = document.getElementById("joinBtn");
const teacherLoginBtn = document.getElementById("teacherLoginBtn");
const teacherNameInput = document.getElementById("teacherNameInput");
const teacherPasswordInput = document.getElementById("teacherPasswordInput");
const teacherSignInBtn = document.getElementById("teacherSignInBtn");
const backToMainLoginBtn = document.getElementById("backToMainLoginBtn");
const newBoardNameInput = document.getElementById("newBoardNameInput");
const createBoardBtn = document.getElementById("createBoardBtn");
const boardsList = document.getElementById("boardsList");
const studyBtn = document.getElementById("studyBtn");
const logoutBtnPortal = document.getElementById("logoutBtnPortal");
const logoutBtnApp = document.getElementById("logoutBtnApp");
const logoutBtnStudents = document.getElementById("logoutBtnStudents");
const logoutBtnDashboard = document.getElementById("logoutBtnDashboard");
const backToPortalBtn = document.getElementById("backToPortalBtn");
const studentsBtn = document.getElementById("studentsBtn");
const backToBoardFromStudents = document.getElementById("backToBoardFromStudents");
const backToStudentsFromDashboard = document.getElementById("backToStudentsFromDashboard");
const seatsBtn = document.getElementById("seatsBtn");
const seatingMapDiv = document.getElementById("seatingMap");
const seatCanvas = document.getElementById("seatCanvas");
const addSeatBtn = document.getElementById("addSeatBtn");
const backToBoardFromSeats = document.getElementById("backToBoardFromSeats");
const logoutBtnSeats = document.getElementById("logoutBtnSeats");
const themeToggleSeats = document.getElementById("themeToggleSeats");
const confusionIndicator = document.getElementById("confusionIndicator");
const confusionGreenBtn = document.getElementById("confusionGreenBtn");
const confusionOrangeBtn = document.getElementById("confusionOrangeBtn");
const confusionRedBtn = document.getElementById("confusionRedBtn");
const confusionSparkline = document.getElementById("confusionSparkline");
const confusionPrompt = document.getElementById("confusionPrompt");
const confusionPromptText = document.getElementById("confusionPromptText");
const confusionPromptYesBtn = document.getElementById("confusionPromptYesBtn");
const confusionPromptNoBtn = document.getElementById("confusionPromptNoBtn");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const postsDiv = document.getElementById("posts");
const sortSelect = document.getElementById("sortSelect");
const teacherBtn = document.getElementById("teacherBtn");
const pollSection = document.getElementById("pollSection");
const pollCreation = document.getElementById("pollCreation");
const postImageInput = document.getElementById("postImageInput");
const postImageBtn = document.getElementById("postImageBtn");
const postImagePreview = document.getElementById("postImagePreview");
const studentsList = document.getElementById("studentsList");
const dashboardContent = document.getElementById("dashboardContent");
const leaderboardSection = document.getElementById("leaderboardSection");
const leaderboardToggleContainer = document.getElementById("leaderboardToggleContainer");
const leaderboardVisibilityBtn = document.getElementById("leaderboardVisibilityBtn");
const classSessionToggleContainer = document.getElementById("classSessionToggleContainer");
const classSessionToggleBtn = document.getElementById("classSessionToggleBtn");
const classSessionTimestampStart = document.getElementById("classSessionTimestampStart");
const classSessionTimestampEnd = document.getElementById("classSessionTimestampEnd");
const identityPopup = document.getElementById("identityPopup");
const emojiCircle = document.getElementById("emojiCircle");
const emojiDisplay = document.getElementById("emojiDisplay");
const emojiInput = document.getElementById("emojiInput");
const dailyDashboard = document.getElementById("dailyDashboard");
const dailySeatMapCanvasEl = document.getElementById("dailySeatMapCanvas");
const classConfusionTimelineEl = document.getElementById("classConfusionTimeline");
const themeToggle = document.getElementById("themeToggle");
const themeTogglePortal = document.getElementById("themeTogglePortal");
const themeToggleStudents = document.getElementById("themeToggleStudents");
const themeToggleDashboard = document.getElementById("themeToggleDashboard");
const htmlElement = document.documentElement;
const boardNameInput = document.getElementById("boardNameInput");
const studentPasswordInput = document.getElementById("studentPasswordInput");

// ── One-time icon injection for buttons/labels whose markup is otherwise
// static (no JS ever sets their text), so every icon has one source of
// truth (the ICONS object) instead of hand-written SVG duplicated into HTML.
if (postImageBtn) { postImageBtn.innerHTML = iconLabel("camera", "Add Image"); }
if (seatsBtn) { seatsBtn.innerHTML = iconLabel("seat", "Seats"); }
if (studyBtn) { studyBtn.innerHTML = iconLabel("book", "Study"); }
(function() {
  var anonLabel = document.querySelector('label[for="anonymousToggle"]');
  if (anonLabel) { anonLabel.innerHTML = iconLabel("mask", "Anonymous"); }
})();

// ── Audio Engine ────────────────────────────────────────────────────────────
var audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  if (audioCtx.state === "suspended") { audioCtx.resume(); }
  return audioCtx;
}

function playPop() {
  try {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch(e) {}
}

function playChime() {
  try {
    var ctx = getAudioCtx();
    var frequencies = [523, 659, 784, 1047];
    frequencies.forEach(function(freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.6);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.6);
    });
  } catch(e) {}
}

function playWhoosh() {
  try {
    var ctx = getAudioCtx();
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(320, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.35);
    osc2.frequency.setValueAtTime(240, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.35);
  } catch(e) {}
}

function playThunderbolt() {
  try {
    var ctx = getAudioCtx();
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(180, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
    osc2.frequency.setValueAtTime(120, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.25);
  } catch(e) {}
}

function triggerLightningConfetti() {
  var count = 60;
  for (var i = 0; i < count; i++) {
    (function(index) {
      setTimeout(function() {
        var p = document.createElement("span");
        p.textContent = "⚡";
        var startX = Math.random() * window.innerWidth;
        var size = 14 + Math.random() * 18;
        var duration = 2000 + Math.random() * 1500;
        var drift = (Math.random() - 0.5) * 200;
        p.style.position = "fixed";
        p.style.left = startX + "px";
        p.style.top = "-50px";
        p.style.fontSize = size + "px";
        p.style.pointerEvents = "none";
        p.style.zIndex = "99999";
        p.style.opacity = "1";
        document.body.appendChild(p);
        var start = null;
        function animate(ts) {
          if (!start) { start = ts; }
          var elapsed = ts - start;
          var progress = elapsed / duration;
          if (progress >= 1) { p.remove(); return; }
          p.style.top = (-50 + (window.innerHeight + 100) * progress) + "px";
          p.style.left = (startX + drift * progress) + "px";
          p.style.transform = "rotate(" + (progress * 360) + "deg)";
          if (progress > 0.75) { p.style.opacity = String(1 - ((progress - 0.75) / 0.25)); }
          requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      }, index * 40);
    })(i);
  }
}

function animateUpvoteCount(el, from, to) {
  var steps = 8;
  var duration = 400;
  var stepTime = duration / steps;
  var current = 0;
  var interval = setInterval(function() {
    current++;
    var randomMid = from + Math.round((Math.random() - 0.5) * 3);
    el.textContent = current < steps ? randomMid : to;
    el.style.transform = current < steps ? "scale(1.3)" : "scale(1)";
    el.style.transition = "transform 0.1s ease";
    if (current >= steps) { clearInterval(interval); }
  }, stepTime);
}

function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  var text = theme === "dark" ? iconLabel("sun", "Light Mode") : iconLabel("moon", "Dark Mode");
  if (themeToggle) { themeToggle.innerHTML = text; }
  if (themeTogglePortal) { themeTogglePortal.innerHTML = text; }
  if (themeToggleStudents) { themeToggleStudents.innerHTML = text; }
  if (themeToggleDashboard) { themeToggleDashboard.innerHTML = text; }
  if (themeToggleSeats) { themeToggleSeats.innerHTML = text; }
  // Keep the mobile status bar in sync with the theme actually applied (which
  // can be a manual override), not just the OS's prefers-color-scheme.
  var themeColorMeta = document.getElementById("themeColorMeta");
  if (themeColorMeta) { themeColorMeta.setAttribute("content", theme === "dark" ? "#0a0a0a" : "#f5f5f7"); }
}

function loadTheme() {
  var saved = localStorage.getItem("theme");
  if (saved) { setTheme(saved); }
  else { setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
}

function toggleTheme() {
  var current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function(e) {
  if (!localStorage.getItem("theme")) { setTheme(e.matches ? "dark" : "light"); }
});

if (themeToggle) { themeToggle.addEventListener("click", toggleTheme); }
if (themeTogglePortal) { themeTogglePortal.addEventListener("click", toggleTheme); }
if (themeToggleStudents) { themeToggleStudents.addEventListener("click", toggleTheme); }
if (themeToggleDashboard) { themeToggleDashboard.addEventListener("click", toggleTheme); }
if (themeToggleSeats) { themeToggleSeats.addEventListener("click", toggleTheme); }

loadTheme();

document.addEventListener("touchstart", function() {
  getAudioCtx();
}, { once: true });

function teardownBoardListeners() {
  if (unsubPosts) { unsubPosts(); unsubPosts = null; }
  if (unsubPolls) { unsubPolls(); unsubPolls = null; }
  if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
  if (unsubBoardSettings) { unsubBoardSettings(); unsubBoardSettings = null; }
  if (unsubSeats) { unsubSeats(); unsubSeats = null; }
  if (unsubDashSeats) { unsubDashSeats(); unsubDashSeats = null; }
  if (unsubOwnConfusion) { unsubOwnConfusion(); unsubOwnConfusion = null; }
}

// ─── SITEWIDE MOTION: click "pop" + ripple to neighbors ─────────────────────
// Page-global, wired once (not per-board, not per-render) since it's plain
// event delegation on `document` -- survives every full innerHTML rebuild of
// posts/polls/seats without needing to be re-attached.

// Restart-safe: removing then re-adding the class forces the animation to
// play from scratch even if it's re-triggered before the previous run finished.
function restartAnimationClass(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the removal commits before re-adding
  el.classList.add(cls);
}
function applyMotionPop(el) { restartAnimationClass(el, "motion-pop"); }
function applyMotionWave(el) { restartAnimationClass(el, "motion-pop-wave"); }

// Finds the 1-2 elements that should "wave" (a smaller, delayed pop) when
// `el` is clicked, using whichever adjacency model actually matches the
// container's real layout: DOM order maps to visual order for the flex-row
// (confusion buttons, draw-poll color swatches) and vertical-stack (posts)
// containers, but NOT for seats (free-form x/y placement, so this uses real
// spatial distance instead) or polls (carousel siblings are never
// simultaneously visible, so there's no visible neighbor to wave to).
function findMotionNeighbors(el) {
  if (el.classList.contains("confusion-btn") || el.classList.contains("draw-color")) {
    return [el.previousElementSibling, el.nextElementSibling].filter(function(n) { return n; });
  }
  if (el.classList.contains("post")) {
    var postsContainer = document.getElementById("posts");
    if (!postsContainer || !postsContainer.contains(el)) { return []; }
    return [el.previousElementSibling, el.nextElementSibling]
      .filter(function(n) { return n && n.classList && n.classList.contains("post"); });
  }
  if (el.classList.contains("seat")) {
    var canvas = el.closest("#seatCanvas, #dailySeatMapCanvas");
    if (!canvas) { return []; }
    var cache = canvas.id === "dailySeatMapCanvas" ? dashSeatSeatsCache : seatingSeatsCache;
    var seatId = el.dataset.seatId;
    var seat = cache.filter(function(s) { return s.id === seatId; })[0];
    if (!seat) { return []; }
    var nearestIds = cache
      .filter(function(s) { return s.id !== seatId; })
      .map(function(s) { return { id: s.id, dist: Math.hypot((s.x || 0) - (seat.x || 0), (s.y || 0) - (seat.y || 0)) }; })
      .sort(function(a, b) { return a.dist - b.dist; })
      .slice(0, 2);
    return nearestIds
      .map(function(n) { return canvas.querySelector('.seat[data-seat-id="' + n.id + '"]'); })
      .filter(function(n) { return n; });
  }
  return []; // polls, and anything else: no visible neighbor to wave to
}

// Capture phase is required here, not bubble: many existing handlers (e.g.
// upvote, poll-vote, seat-delete) call e.stopPropagation() in their own
// bubble-phase click handler, which would silently stop a bubble-phase
// document listener from ever seeing the event. A capture-phase listener on
// document runs before the target's own handler, so it's unaffected.
document.addEventListener("click", function(e) {
  var el = e.target.closest("button, .post, .poll, .confusion-btn, .seat");
  if (!el) { return; }
  applyMotionPop(el);
  findMotionNeighbors(el).forEach(applyMotionWave);
}, true);

joinBtn.onclick = async function() {
  username = usernameInput.value.trim();
  var boardName = boardNameInput.value.trim();
  studentPassword = studentPasswordInput.value.trim();
  if (!username) { alert("Enter your name to join!"); return; }
  if (!boardName) { alert("Enter the PopBoard name to join!"); return; }
  if (username.toLowerCase() === "dimitry") { alert("This name is reserved."); return; }
  isTeacher = false;
  isDisplayMode = false;
  var q = query(collection(db, "boards"), where("name", "==", boardName));
  var snapshot = await getDocs(q);
  if (snapshot.empty) { alert("Oops! That PopBoard hasn't popped yet. Double-check the name and try again!"); return; }
  var boardData = snapshot.docs[0].data();
  currentBoardId = snapshot.docs[0].id;
  if (username === boardData.teacherAccount) { alert("Nice try, but that's the teacher's name! Choose another to join the popcorn party!"); return; }
  var studentsRef = collection(db, "boards", currentBoardId, "students");
  var studentQuery = query(studentsRef, where("username", "==", username));
  var studentSnapshot = await getDocs(studentQuery);
  if (!studentSnapshot.empty) {
    var existingStudent = studentSnapshot.docs[0];
    var existingPassword = existingStudent.data().password || "";
    if (existingPassword && existingPassword !== studentPassword) { alert("That password didn't pop! Double-check your kernel key!"); return; }
    currentStudentId = existingStudent.id;
    studentEmoji = existingStudent.data().emoji || "";
    studentNickname = existingStudent.data().nickname || "";
  } else {
    var newStudent = await addDoc(studentsRef, {
      username: username,
      password: studentPassword,
      joinedAt: serverTimestamp(),
      historicalComments: 0,
      historicalUpvotesGiven: 0,
      historicalUpvotesReceived: 0,
      historicalPollsCast: 0,
      monthlyStats: {},
      emoji: "",
      nickname: "",
      confusionState: null,
      confusionSetAt: null,
      confusionHistory: []
    });
    currentStudentId = newStudent.id;
    studentEmoji = "";
    studentNickname = "";
  }
  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  teacherBtn.classList.add("hidden");
  backToPortalBtn.classList.add("hidden");
  studentsBtn.classList.add("hidden");
  seatsBtn.classList.add("hidden");
  leaderboardToggleContainer.classList.add("hidden");
  classSessionToggleContainer.classList.add("hidden");
  dailyDashboard.classList.add("hidden");
  confusionIndicator.classList.remove("hidden");
  startBoard();
};

document.getElementById("teacherLoginBtn").onclick = function(e) {
  e.preventDefault();
  loginDiv.classList.add("hidden");
  teacherLoginDiv.classList.remove("hidden");
};

backToMainLoginBtn.onclick = function() {
  teacherLoginDiv.classList.add("hidden");
  loginDiv.classList.remove("hidden");
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
};

teacherSignInBtn.onclick = async function() {
  var name = teacherNameInput.value.trim();
  var password = teacherPasswordInput.value.trim();
  if (!name || !password) { alert("Enter name and password to enter the kernel command center!"); return; }
  if (name.toLowerCase() === "dimitry" && password === "301718Dag") {
    isMasterAdmin = true;
    isTeacher = true;
    teacherAccount = "Dimitry";
    username = "Dimitry";
    await setDoc(doc(db, "teachers", "Dimitry"), { name: "Dimitry", password: "301718Dag", createdAt: serverTimestamp() }, { merge: true });
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    studyBtn.classList.remove("hidden");
    loadBoardsPortal();
    return;
  }
  var teacherRef = doc(db, "teachers", name);
  var teacherDoc = await getDoc(teacherRef);
  if (teacherDoc.exists()) {
    if (teacherDoc.data().password === password) {
      teacherAccount = name;
      username = name;
      isTeacher = true;
      teacherLoginDiv.classList.add("hidden");
      boardsPortalDiv.classList.remove("hidden");
      loadBoardsPortal();
    } else {
      alert("That password didn't pop! Double-check your kernel key!");
    }
  } else {
    teacherAccount = name;
    username = name;
    isTeacher = true;
    await setDoc(teacherRef, { name: name, password: password, createdAt: serverTimestamp() });
    teacherLoginDiv.classList.add("hidden");
    boardsPortalDiv.classList.remove("hidden");
    loadBoardsPortal();
  }
};

studyBtn.onclick = function() { window.open("study.html", "_blank"); };

logoutBtnPortal.onclick = function() { resetAndLogout(); };
logoutBtnApp.onclick = function() { resetAndLogout(); };
logoutBtnStudents.onclick = function() { resetAndLogout(); };
logoutBtnDashboard.onclick = function() { resetAndLogout(); };
logoutBtnSeats.onclick = function() { resetAndLogout(); };

function resetAndLogout() {
  teardownBoardListeners();
  closeSeatPopup();
  username = "";
  studentPassword = "";
  isTeacher = false;
  isDisplayMode = false;
  isMasterAdmin = false;
  teacherAccount = "";
  studyBtn.classList.add("hidden");
  currentBoardId = "";
  currentStudentId = "";
  studentEmoji = "";
  myUpvotedPostIds.clear();
  myPollVotes.clear();
  var panels = [boardsPortalDiv, studentsPortalDiv, studentDashboardDiv, appDiv, teacherLoginDiv, seatingMapDiv];
  for (var i = 0; i < panels.length; i++) { panels[i].classList.add("hidden"); }
  confusionIndicator.classList.add("hidden");
  document.getElementById("newPost").classList.remove("hidden");
  loginDiv.classList.remove("hidden");
  usernameInput.value = "";
  if (document.getElementById("boardNameInput")) { document.getElementById("boardNameInput").value = ""; }
  if (document.getElementById("studentPasswordInput")) { document.getElementById("studentPasswordInput").value = ""; }
  teacherNameInput.value = "";
  teacherPasswordInput.value = "";
  pollSection.innerHTML = "";
  postsDiv.innerHTML = "";
  leaderboardSection.innerHTML = "";
  seatCanvas.innerHTML = "";
}

backToPortalBtn.onclick = function() {
  teardownBoardListeners();
  currentBoardId = "";
  // Only a teacher-identity session (real teacher view or Display mode) can
  // ever see/click this button, so it's always safe to restore the real
  // teacher identity here when leaving Display mode.
  isTeacher = true;
  isDisplayMode = false;
  currentStudentId = "";
  username = "";
  appDiv.classList.add("hidden");
  boardsPortalDiv.classList.remove("hidden");
  loadBoardsPortal();
};

studentsBtn.onclick = function() {
  appDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

backToBoardFromStudents.onclick = function() {
  studentsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
};

seatsBtn.onclick = function() {
  seatMapResponsePollId = null;
  seatMapResponsePollQuestion = "";
  seatMapResponsePollData = null;
  appDiv.classList.add("hidden");
  seatingMapDiv.classList.remove("hidden");
  loadSeatingMap();
};

function enterSeatMapResponseView(pollId, pollQuestion) {
  seatMapResponsePollId = pollId;
  seatMapResponsePollQuestion = pollQuestion || "";
  seatMapResponsePollData = null;
  appDiv.classList.add("hidden");
  seatingMapDiv.classList.remove("hidden");
  loadSeatingMap();
}

backToBoardFromSeats.onclick = function() {
  if (unsubSeats) { unsubSeats(); unsubSeats = null; }
  seatMapResponsePollId = null;
  seatMapResponsePollQuestion = "";
  seatMapResponsePollData = null;
  closeSeatPopup();
  seatingMapDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
};

addSeatBtn.onclick = async function() {
  if (!currentBoardId) { return; }
  var jitterX = 30 + Math.random() * 40;
  var jitterY = 30 + Math.random() * 40;
  await addDoc(collection(db, "boards", currentBoardId, "seats"), {
    x: jitterX, y: jitterY, studentId: null, createdAt: serverTimestamp()
  });
};

backToStudentsFromDashboard.onclick = function() {
  studentDashboardDiv.classList.add("hidden");
  studentsPortalDiv.classList.remove("hidden");
  loadStudentsPortal();
};

async function loadBoardsPortal() {
  boardsList.innerHTML = "";
  if (isMasterAdmin) {
    backToPortalBtn.classList.add("hidden");
    var teachersSnapshot = await getDocs(collection(db, "teachers"));
    var boardsSnapshot = await getDocs(collection(db, "boards"));
    var teacherBoards = {};
    teachersSnapshot.forEach(function(d) {
      if (d.id !== "Dimitry") { teacherBoards[d.id] = []; }
    });
    boardsSnapshot.forEach(function(d) {
      var b = d.data();
      var t = b.teacherAccount || "Unknown";
      if (!teacherBoards[t]) { teacherBoards[t] = []; }
      teacherBoards[t].push({ id: d.id, name: b.name, createdAt: b.createdAt, teacherAccount: b.teacherAccount });
    });
    var masterSection = document.createElement("div");
    masterSection.className = "master-admin-section";
    masterSection.innerHTML = "<h2>Master Admin</h2>";
    for (var teacher in teacherBoards) {
      var tc = document.createElement("div");
      tc.className = "teacher-card";
      tc.innerHTML = "<h4>Teacher: " + teacher + "</h4>";
      var bd = document.createElement("div");
      bd.className = "teacher-boards";
      teacherBoards[teacher].forEach(function(board) { bd.appendChild(createBoardCard(board, true)); });
      var dtBtn = document.createElement("button");
      dtBtn.innerHTML = iconLabel("trash", "Delete Teacher");
      dtBtn.className = "delete-poll teacher-control";
      dtBtn.style.marginTop = "12px";
      (function(t2, boards2) {
        dtBtn.onclick = async function() {
          if (!confirm("Delete teacher " + t2 + " and all boards?")) { return; }
          for (var bi = 0; bi < boards2.length; bi++) { await deleteBoard(boards2[bi].id); }
          await deleteDoc(doc(db, "teachers", t2));
          loadBoardsPortal();
        };
      })(teacher, teacherBoards[teacher]);
      tc.appendChild(bd);
      tc.appendChild(dtBtn);
      masterSection.appendChild(tc);
    }
    boardsList.appendChild(masterSection);
  } else {
    backToPortalBtn.classList.add("hidden");
    var q = query(collection(db, "boards"), where("teacherAccount", "==", teacherAccount));
    onSnapshot(q, function(snapshot) {
      boardsList.innerHTML = "";
      if (snapshot.empty) {
        boardsList.innerHTML = "<p style='text-align:center;margin-top:40px;'>No boards yet.</p>";
        return;
      }
      snapshot.forEach(function(d) {
        boardsList.appendChild(createBoardCard({ id: d.id, name: d.data().name, createdAt: d.data().createdAt }, false));
      });
    });
  }
}

function createBoardCard(board, isMasterView) {
  var card = document.createElement("div");
  card.className = "board-card";
  var info = document.createElement("div");
  info.className = "board-card-info";
  info.innerHTML = "<h3>" + board.name + "</h3><p>Created " + (board.createdAt ? new Date(board.createdAt.seconds * 1000).toLocaleDateString() : "recently") + "</p>";
  var actions = document.createElement("div");
  actions.className = "board-card-actions";
  var enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter";
  (function(bid) {
    enterBtn.onclick = function(e) { e.stopPropagation(); enterBoard(bid); };
  })(board.id);
  actions.appendChild(enterBtn);
  var displayBtn = document.createElement("button");
  displayBtn.innerHTML = iconLabel("tv", "Display");
  displayBtn.title = "Open a read-only classroom display view (no voting, no posting)";
  (function(bid) {
    displayBtn.onclick = function(e) { e.stopPropagation(); enterDisplayMode(bid); };
  })(board.id);
  actions.appendChild(displayBtn);
  var resetBtn = document.createElement("button");
  resetBtn.innerHTML = iconLabel("refresh", "Reset");
  resetBtn.className = "teacher-control";
  (function(bid, bname) {
    resetBtn.onclick = async function(e) {
      e.stopPropagation();
      if (!confirm("Reset " + bname + "?")) { return; }
      await resetBoard(bid);
    };
  })(board.id, board.name);
  actions.appendChild(resetBtn);
  var deleteBtn = document.createElement("button");
  deleteBtn.innerHTML = iconLabel("trash", "Delete");
  deleteBtn.className = "delete-poll teacher-control";
  (function(bid, bname) {
    deleteBtn.onclick = async function(e) {
      e.stopPropagation();
      if (!confirm("Delete " + bname + "?")) { return; }
      await deleteBoard(bid);
      if (isMasterView) { loadBoardsPortal(); }
    };
  })(board.id, board.name);
  actions.appendChild(deleteBtn);
  card.appendChild(info);
  card.appendChild(actions);
  (function(bid) { card.onclick = function() { enterBoard(bid); }; })(board.id);
  return card;
}

async function resetBoard(boardId) {
  var cols = ["posts", "replies", "polls", "leaderboard"];
  for (var i = 0; i < cols.length; i++) {
    var snap = await getDocs(collection(db, "boards", boardId, cols[i]));
    for (var j = 0; j < snap.docs.length; j++) { await deleteDoc(snap.docs[j].ref); }
  }
}

async function deleteBoard(boardId) {
  var cols = ["posts", "replies", "polls", "leaderboard"];
  for (var i = 0; i < cols.length; i++) {
    var snap = await getDocs(collection(db, "boards", boardId, cols[i]));
    for (var j = 0; j < snap.docs.length; j++) { await deleteDoc(snap.docs[j].ref); }
  }
  var studentsSnap = await getDocs(collection(db, "boards", boardId, "students"));
  for (var k = 0; k < studentsSnap.docs.length; k++) { await deleteDoc(studentsSnap.docs[k].ref); }
  await deleteDoc(doc(db, "boards", boardId));
}

function enterBoard(boardId) {
  teardownBoardListeners();
  currentBoardId = boardId;
  isDisplayMode = false;
  boardsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  teacherBtn.classList.remove("hidden");
  backToPortalBtn.classList.remove("hidden");
  studentsBtn.classList.remove("hidden");
  seatsBtn.classList.remove("hidden");
  leaderboardToggleContainer.classList.remove("hidden");
  classSessionToggleContainer.classList.remove("hidden");
  dailyDashboard.classList.remove("hidden");
  confusionIndicator.classList.add("hidden");
  document.getElementById("newPost").classList.remove("hidden");
  startBoard();
}

// A read-only "classroom TV" entry point for teachers -- looks like the
// student view (no emoji/nickname picker) but can't vote, post, or reply.
// Deliberately renders through the existing !isTeacher branches everywhere
// (isTeacher is set false here) so it inherits student-facing UI for free;
// isDisplayMode only needs to gate the handful of spots that are actually
// interactive.
function enterDisplayMode(boardId) {
  teardownBoardListeners();
  currentBoardId = boardId;
  isTeacher = false;
  isDisplayMode = true;
  currentStudentId = "";
  username = "";
  studentEmoji = "";
  studentNickname = "";
  boardsPortalDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  teacherBtn.classList.add("hidden");
  backToPortalBtn.classList.remove("hidden");
  studentsBtn.classList.add("hidden");
  seatsBtn.classList.add("hidden");
  leaderboardToggleContainer.classList.add("hidden");
  classSessionToggleContainer.classList.add("hidden");
  dailyDashboard.classList.add("hidden");
  confusionIndicator.classList.add("hidden");
  document.getElementById("newPost").classList.add("hidden");
  startBoard();
}

async function startBoard() {
  pollSection.innerHTML = "";
  postsDiv.innerHTML = "";
  leaderboardSection.innerHTML = "";
  listenBoardSettings();
  initLeaderboard();
  if (!isDisplayMode) { initStickyCommentBar(); }
  loadPosts();
  await loadPolls();
  if (isTeacher) { updateDailyDashboard(); loadDashboardSeatMap(); }
  if (!isTeacher && !isDisplayMode) { setupEmojiPicker(); initConfusionIndicator(); }
}

createBoardBtn.onclick = async function() {
  var boardName = newBoardNameInput.value.trim();
  if (!boardName) { alert("Enter a board name."); return; }
  var q = query(collection(db, "boards"), where("name", "==", boardName));
  var snapshot = await getDocs(q);
  if (!snapshot.empty) { alert("PopBoard name is already taken. Pick a fresh kernel!"); return; }
  await addDoc(collection(db, "boards"), { name: boardName, teacherAccount: teacherAccount, createdAt: serverTimestamp() });
  newBoardNameInput.value = "";
};

function listenBoardSettings() {
  if (unsubBoardSettings) { unsubBoardSettings(); unsubBoardSettings = null; }
  if (!currentBoardId) { return; }
  unsubBoardSettings = onSnapshot(doc(db, "boards", currentBoardId), function(d) {
    if (!d.exists()) { return; }
    var data = d.data();
    leaderboardVisible = data.leaderboardVisible !== false;
    applyLeaderboardVisibility();
    classSessionActive = data.classSessionActive === true;
    classSessionStartAt = data.classSessionStartAt || null;
    classSessionEndAt = data.classSessionEndAt || null;
    applyClassSessionUI();
  });
}

function applyLeaderboardVisibility() {
  if (isTeacher) {
    leaderboardSection.style.display = "";
    leaderboardVisibilityBtn.innerHTML = eyeLabel(leaderboardVisible, "Leaderboard Shown", "Leaderboard Hidden");
    return;
  }
  leaderboardSection.style.display = leaderboardVisible ? "" : "none";
}

// "MM/DD/YY HH:MM", zero-padded -- no date library anywhere in this codebase.
function formatSessionTimestamp(ms) {
  var d = new Date(ms);
  var pad = function(n) { return String(n).padStart(2, "0"); };
  return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + pad(d.getFullYear() % 100) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// Reflects classSessionActive/-StartAt/-EndAt (read via listenBoardSettings)
// onto the pill + its start/end timestamp labels, and re-triggers the two
// session-windowed views so pausing immediately freezes them at [start,end].
function applyClassSessionUI() {
  if (!classSessionToggleBtn) { return; }
  classSessionToggleBtn.textContent = classSessionActive ? "🔴 Class Live" : "🔘 Class Paused";
  classSessionToggleBtn.classList.toggle("is-live", classSessionActive);
  classSessionToggleBtn.classList.toggle("is-paused", !classSessionActive);
  classSessionTimestampStart.textContent = classSessionStartAt ? formatSessionTimestamp(classSessionStartAt) : "";
  classSessionTimestampEnd.textContent = classSessionEndAt ? formatSessionTimestamp(classSessionEndAt) : "";
  if (isTeacher) { updateDailyDashboard(); renderClassConfusionTimelineRows(); }
}

classSessionToggleBtn.onclick = async function() {
  if (!currentBoardId) { return; }
  var now = Date.now();
  if (classSessionActive) {
    await updateDoc(doc(db, "boards", currentBoardId), { classSessionActive: false, classSessionEndAt: now });
  } else {
    // Starting a new session IS "reset all daily metrics" -- moving the
    // window's start forward is enough; no data is ever deleted.
    await updateDoc(doc(db, "boards", currentBoardId), { classSessionActive: true, classSessionStartAt: now, classSessionEndAt: null });
  }
};

leaderboardVisibilityBtn.onclick = async function() {
  if (!currentBoardId) { return; }
  leaderboardVisible = !leaderboardVisible;
  await updateDoc(doc(db, "boards", currentBoardId), { leaderboardVisible: leaderboardVisible });
};

function initLeaderboard() {
  if (unsubLeaderboard) { unsubLeaderboard(); unsubLeaderboard = null; }
  if (!currentBoardId) { return; }
  getDoc(doc(db, "boards", currentBoardId)).then(function(d) {
    leaderboardVisible = d.exists() ? (d.data().leaderboardVisible !== false) : true;
    applyLeaderboardVisibility();
  });
  unsubLeaderboard = onSnapshot(collection(db, "boards", currentBoardId, "leaderboard"), async function(snapshot) {
    var scores = [];
    for (var i = 0; i < snapshot.docs.length; i++) {
      var d = snapshot.docs[i];
      var data = d.data();
      var emoji = data.emoji || "";
      var nickname = data.nickname || "";
      if (!emoji || !nickname) {
        var studentQuery = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", d.id));
        var studentSnap = await getDocs(studentQuery);
        if (!studentSnap.empty) {
          var sData = studentSnap.docs[0].data();
          if (!emoji) { emoji = sData.emoji || ""; }
          if (!nickname) { nickname = sData.nickname || ""; }
        }
      }
      scores.push({ name: d.id, displayName: nickname || d.id, score: data.score || 0, emoji: emoji });
    }
    scores.sort(function(a, b) { return b.score - a.score; });

    // Rank change indicators
    if (!isTeacher) {
      scores.forEach(function(entry, newRank) {
        var oldRank = prevLeaderboardRanks[entry.name];
        if (oldRank !== undefined && oldRank > newRank) {
          var improvement = oldRank - newRank;
          setTimeout(function() {
            var rows = leaderboardSection.querySelectorAll(".lb-row");
            rows.forEach(function(row) {
              if (row.dataset.lbName === entry.name) {
                var badge = document.createElement("span");
                badge.textContent = "↑" + improvement;
                badge.style.cssText = "position:absolute;right:-36px;top:50%;transform:translateY(-50%);color:#34c759;font-size:0.75rem;font-weight:700;opacity:1;transition:opacity 0.5s ease,top 0.5s ease;pointer-events:none;";
                row.style.position = "relative";
                row.appendChild(badge);
                setTimeout(function() { badge.style.opacity = "0"; badge.style.top = "0%"; }, 1500);
                setTimeout(function() { badge.remove(); }, 2000);
              }
            });
          }, 600);
        }
        prevLeaderboardRanks[entry.name] = newRank;
      });
    }

    var myRank = -1;
    if (!isTeacher) {
      for (var ri = 0; ri < scores.length; ri++) {
        if (scores[ri].name === username) { myRank = ri + 1; break; }
      }
      var rankLabel = document.getElementById("myRankLabel");
      if (!rankLabel) {
        rankLabel = document.createElement("span");
        rankLabel.id = "myRankLabel";
        rankLabel.style.cssText = "font-size:0.85rem;opacity:0.6;white-space:nowrap;";
        var group = document.querySelector(".leaderboard-identity-group");
        if (group) { group.appendChild(rankLabel); }
      }
      if (myRank > 0) {
        var medal = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "";
        rankLabel.textContent = medal ? medal + " #" + myRank : "#" + myRank;
      } else {
        rankLabel.textContent = "";
      }
    }

    // Students ranked below the shown top N still get to see their own
    // placement — but only on their own screen, and only once, never
    // duplicating a row they're already shown in above.
    var topRows = scores.slice(0, LEADERBOARD_TOP_N);
    var personalRow = null;
    if (!isTeacher && myRank > LEADERBOARD_TOP_N) {
      var me = scores[myRank - 1];
      personalRow = { name: me.name, displayName: me.displayName, score: me.score, emoji: me.emoji, rank: myRank };
    } else if (!isTeacher && !isDisplayMode && currentStudentId && myRank === -1) {
      // Never scored yet (no leaderboard doc exists for them at all) --
      // synthesize a 0-point personal row so there's always something to
      // click to edit identity, even before their first point.
      personalRow = { name: username, displayName: studentNickname || username, score: 0, emoji: studentEmoji, rank: null };
    }
    renderLeaderboardUI(topRows, personalRow);
  });
}

function showFirstBadge() {
  var existing = document.getElementById("firstBadge");
  if (existing) { existing.remove(); }
  var badge = document.createElement("div");
  badge.id = "firstBadge";
  badge.textContent = "⚡ Fastest!";
  badge.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%) scale(0.5);background:linear-gradient(135deg,#f7d700,#ff9500);color:white;font-size:1.3rem;font-weight:800;padding:12px 28px;border-radius:999px;z-index:99999;opacity:0;pointer-events:none;box-shadow:0 8px 32px rgba(255,180,0,0.5);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;";
  document.body.appendChild(badge);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      badge.style.transform = "translateX(-50%) scale(1)";
      badge.style.opacity = "1";
    });
  });
  setTimeout(function() {
    badge.style.transform = "translateX(-50%) scale(0.8)";
    badge.style.opacity = "0";
    setTimeout(function() { badge.remove(); }, 400);
  }, 2500);
}

function renderLeaderboardUI(topRows, personalRow) {
  leaderboardSection.innerHTML = "";
  if (!isTeacher && !leaderboardVisible) { return; }
  var card = document.createElement("div");
  card.className = "leaderboard-card";
  card.innerHTML = "<h3>🏆 Leaderboard</h3>";
  if (topRows.length === 0 && !personalRow) {
    var empty = document.createElement("p");
    empty.textContent = "No scores yet. Answer polls to earn points!";
    card.appendChild(empty);
    leaderboardSection.appendChild(card);
    initStickyLeaderboard();
    return;
  }

  var maxScore = 0.1;
  for (var i = 0; i < topRows.length; i++) { if (topRows[i].score > maxScore) { maxScore = topRows[i].score; } }
  if (personalRow && personalRow.score > maxScore) { maxScore = personalRow.score; }
  var medals = ["🥇", "🥈", "🥉"];
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var place456Color = isDark ? "#1a1a1a" : "#ffffff";

  var ROW_HEIGHT = 48; // px — must match approximate lb-row height including margin
  var DIVIDER_HEIGHT = 24;

  // Container for animated rows — position:relative lets children animate with translateY
  var rowContainer = document.createElement("div");
  rowContainer.style.cssText = "position:relative;";
  var totalHeight = topRows.length * ROW_HEIGHT + (personalRow ? DIVIDER_HEIGHT + ROW_HEIGHT : 0);
  rowContainer.style.height = totalHeight + "px";

  // Hides a bar's score label if it would spill past the bar's own bounds
  // (narrow bars have a 4% min-width floor, but arbitrarily long score text).
  function hideScoreIfOverflowing(fillEl, scoreEl) {
    setTimeout(function() {
      var available = fillEl.getBoundingClientRect().width - 10; // minus padding-right
      var needed = scoreEl.getBoundingClientRect().width;
      scoreEl.style.visibility = needed > available ? "hidden" : "";
    }, 720);
  }

  function buildRow(entry, topPx, colorIndex, isPersonal) {
    var row = document.createElement("div");
    row.className = "lb-row" + (isPersonal ? " lb-personal-row" : "");
    row.dataset.lbName = entry.name;

    // Position each row absolutely so we can animate it
    row.style.cssText = "position:absolute;width:100%;top:" + topPx + "px;transition:top 0.5s cubic-bezier(0.4,0,0.2,1);";

    var nameDiv = document.createElement("div");
    nameDiv.className = "lb-name";
    var nameSpan = document.createElement("span");
    nameSpan.textContent = entry.displayName || entry.name;
    nameDiv.appendChild(nameSpan);
    if (entry.emoji) {
      var eSpan = document.createElement("span");
      eSpan.className = "lb-emoji emoji-animate";
      eSpan.textContent = entry.emoji;
      nameDiv.insertBefore(eSpan, nameSpan);
    }

    var track = document.createElement("div");
    track.className = "lb-bar-track";
    var fill = document.createElement("div");
    fill.className = "lb-bar-fill";
    var targetWidth = Math.max(4, (entry.score / maxScore) * 100);
    // Start at 0 width, then animate to target after paint
    fill.style.width = "0%";
    if (!isPersonal && colorIndex === 0) { startSheenAnimation(fill, "gold"); }
    else if (!isPersonal && colorIndex === 1) { startSheenAnimation(fill, "silver"); }
    else if (!isPersonal && colorIndex === 2) { startSheenAnimation(fill, "bronze"); }
    else { fill.style.background = place456Color; }
    fill.style.transition = "width 0.7s cubic-bezier(0.4,0,0.2,1)";
    var scoreSpan = document.createElement("span");
    scoreSpan.className = "lb-score";
    scoreSpan.style.color = (!isPersonal && colorIndex < 3) ? "#1d1d1f" : (isDark ? "white" : "#1d1d1f");
    scoreSpan.textContent = parseFloat(entry.score.toFixed(1)) + " pt";
    fill.appendChild(scoreSpan);
    track.appendChild(fill);

    var medalSpan = document.createElement("span");
    medalSpan.className = "lb-medal";
    if (isPersonal) {
      medalSpan.textContent = entry.rank == null ? "New" : "#" + entry.rank;
    } else if (colorIndex < 3) {
      medalSpan.textContent = medals[colorIndex];
    } else {
      medalSpan.textContent = "";
      medalSpan.style.width = "1.5rem";
      medalSpan.style.display = "inline-block";
    }

    row.appendChild(nameDiv);
    row.appendChild(track);
    row.appendChild(medalSpan);
    rowContainer.appendChild(row);

    // Animate bar width on next frame so CSS transition fires
    (function(fillEl, scoreEl, width) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          fillEl.style.width = width + "%";
          fillEl.style.transform = "scaleY(1.05)";
          setTimeout(function() {
            fillEl.style.transform = "scaleY(1)";
            fillEl.style.transition += ", transform 0.2s ease";
          }, 700);
          hideScoreIfOverflowing(fillEl, scoreEl);
        });
      });
    })(fill, scoreSpan, targetWidth);
  }

  for (var i = 0; i < topRows.length; i++) {
    buildRow(topRows[i], i * ROW_HEIGHT, i, false);
  }

  if (personalRow) {
    var dividerTop = topRows.length * ROW_HEIGHT;
    var divider = document.createElement("div");
    divider.className = "lb-divider";
    divider.textContent = "⋮";
    divider.style.cssText = "position:absolute;width:100%;top:" + dividerTop + "px;height:" + DIVIDER_HEIGHT + "px;text-align:center;color:var(--text-secondary);line-height:" + DIVIDER_HEIGHT + "px;font-size:0.9rem;transition:top 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.4s ease;";
    rowContainer.appendChild(divider);
    buildRow(personalRow, dividerTop + DIVIDER_HEIGHT, -1, true);
  }

  card.appendChild(rowContainer);
  leaderboardSection.appendChild(card);
  initStickyLeaderboard();
}

function mcHistoryActionPhrase(resp) {
  resp = resp || "";
  if (resp.indexOf("Changed vote: ") === 0) {
    var toSep = resp.indexOf(" to ");
    var newText = toSep === -1 ? "" : resp.slice(toSep + 4);
    return "changed vote " + newText;
  } else if (resp.indexOf("Voted: ") === 0) {
    return "voted " + resp.slice(7);
  } else if (resp.indexOf("Removed vote: ") === 0) {
    return "removed vote " + resp.slice(14);
  }
  return resp;
}

function computeFinalMCState(poll, studentEntries, isMulti) {
  var options = poll.options || [];
  if (isMulti) {
    var set = new Set();
    studentEntries.forEach(function(e) {
      var resp = e.response || "";
      if (resp.indexOf("Voted: ") === 0) {
        var idx = options.indexOf(resp.slice(7));
        if (idx !== -1) { set.add(idx); }
      } else if (resp.indexOf("Removed vote: ") === 0) {
        var idx = options.indexOf(resp.slice(14));
        if (idx !== -1) { set.delete(idx); }
      }
    });
    return set;
  }
  var lastIdx = null;
  studentEntries.forEach(function(e) {
    var resp = e.response || "";
    if (resp.indexOf("Changed vote: ") === 0) {
      var toSep = resp.indexOf(" to ");
      var optText = toSep === -1 ? "" : resp.slice(toSep + 4);
      var idx = options.indexOf(optText);
      if (idx !== -1) { lastIdx = idx; }
    } else if (resp.indexOf("Voted: ") === 0) {
      var idx = options.indexOf(resp.slice(7));
      if (idx !== -1) { lastIdx = idx; }
    } else if (resp.indexOf("Removed vote: ") === 0) {
      lastIdx = null;
    }
  });
  return lastIdx;
}

function groupHistoryByStudent(history) {
  var sorted = (history || []).slice().sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
  var order = [];
  var map = {};
  sorted.forEach(function(e) {
    if (!e.username) { return; }
    if (!map[e.username]) { map[e.username] = []; order.push(e.username); }
    map[e.username].push(e);
  });
  return order.map(function(name) { return { username: name, entries: map[name] }; });
}

async function awardLeaderboardPoints(pollId, correctIndices) {
  var pollSnap = await getDoc(doc(db, "boards", currentBoardId, "polls", pollId));
  if (!pollSnap.exists()) { return; }
  var poll = pollSnap.data();
  var options = poll.options || [];
  var voterData = {};
  var history = poll.history || [];
  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (!entry.username) { continue; }
    var n = entry.username;
    var optText = entry.response || "";
    if (optText.indexOf("Changed vote: ") === 0) {
      var toSep = optText.indexOf(" to ");
      optText = toSep === -1 ? "" : optText.slice(toSep + 4);
    }
    else if (optText.indexOf("Voted: ") === 0) { optText = optText.slice(7); }
    else if (optText.indexOf("Removed vote: ") === 0) { optText = optText.slice(14); }
    var idx = options.indexOf(optText);
    if (idx === -1) { continue; }
    if (!voterData[n]) {
      voterData[n] = { lastIndex: idx, firstTs: entry.timestamp || Date.now() };
    } else {
      voterData[n].lastIndex = idx;
      if (entry.timestamp && entry.timestamp < voterData[n].firstTs) { voterData[n].firstTs = entry.timestamp; }
    }
  }
  var correctStudents = [];
  for (var voterName in voterData) {
    if (correctIndices.indexOf(voterData[voterName].lastIndex) !== -1) {
      correctStudents.push({ name: voterName, ts: voterData[voterName].firstTs });
    }
  }
  if (correctStudents.length === 0) { return; }
  var minTs = correctStudents[0].ts;
  var maxTs = correctStudents[0].ts;
  for (var i = 0; i < correctStudents.length; i++) {
    if (correctStudents[i].ts < minTs) { minTs = correctStudents[i].ts; }
    if (correctStudents[i].ts > maxTs) { maxTs = correctStudents[i].ts; }
  }
  var range = maxTs - minTs || 1;
  var sorted = correctStudents.slice().sort(function(a, b) { return a.ts - b.ts; });
  for (var i = 0; i < correctStudents.length; i++) {
    var student = correctStudents[i];
    var norm = (student.ts - minTs) / range;
    var points = parseFloat((1.0 - norm * 0.3).toFixed(3)); // fastest 1.0, slowest 0.7
    var rank = -1;
    for (var ri = 0; ri < sorted.length; ri++) { if (sorted[ri].name === student.name) { rank = ri; break; } }

    // ── Save score to leaderboard doc (resets with board) ──────────────────
    var lbRef = doc(db, "boards", currentBoardId, "leaderboard", student.name);
    var lbSnap = await getDoc(lbRef);
    var prevLb = lbSnap.exists() ? lbSnap.data() : { score: 0 };
    await setDoc(lbRef, {
      score: parseFloat(((prevLb.score || 0) + points).toFixed(3))
    }, { merge: true });

    // ── Save medal counts to student doc (persists across resets) ──────────
    var studentQuery = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", student.name));
    var studentSnap = await getDocs(studentQuery);
    if (studentSnap.empty) { continue; }
    var studentRef = studentSnap.docs[0].ref;
    var studentData = studentSnap.docs[0].data();
    var medalUpdates = {};
    if (rank === 0) { medalUpdates.goldMedals = (studentData.goldMedals || 0) + 1; }
    else if (rank === 1) { medalUpdates.silverMedals = (studentData.silverMedals || 0) + 1; }
    else if (rank === 2) { medalUpdates.bronzeMedals = (studentData.bronzeMedals || 0) + 1; }
    if (Object.keys(medalUpdates).length > 0) { await updateDoc(studentRef, medalUpdates); }
  }
}

function setupEmojiPicker() {
  renderEmojiCircle();
  renderNicknameInput();

  emojiCircle.onclick = function() {
    emojiInput.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:72px;height:72px;font-size:2rem;text-align:center;z-index:9999;border-radius:50%;opacity:1;pointer-events:all;border:2px solid #0071e3;outline:none;";
    emojiInput.value = "";
    emojiInput.focus();
  };
  emojiInput.oninput = function() {
    var val = emojiInput.value;
    var matches = val.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu);
    if (matches && matches.length > 0) {
      studentEmoji = matches[0];
      emojiInput.style.cssText = "width:0;height:0;opacity:0;position:absolute;pointer-events:none;";
      saveStudentEmoji();
      renderEmojiCircle();
      pulseEmojiRing();
    } else if (val.length > 0) {
      emojiInput.value = "";
    }
  };
  emojiInput.onblur = function() {
    emojiInput.style.cssText = "width:0;height:0;opacity:0;position:absolute;pointer-events:none;";
  };
}

// Floating "edit my identity" popup, opened by clicking your own row in the
// leaderboard (works identically in expanded and collapsed mode, since it's
// an overlay anchored to the row's current position, not an inline change
// within the row). A dedicated trio rather than reusing positionSeatPopup/
// closeSeatPopup -- those hardcode seat-hover-only globals and a seat-id
// anchor lookup that don't apply here.
var identityPopupOutsideClickHandler = null;

function closeIdentityPopup() {
  identityPopup.classList.add("hidden");
  if (identityPopupOutsideClickHandler) {
    document.removeEventListener("mousedown", identityPopupOutsideClickHandler);
    identityPopupOutsideClickHandler = null;
  }
}

function positionIdentityPopup(popup, anchorEl) {
  var rect = anchorEl.getBoundingClientRect();
  popup.classList.remove("hidden");
  var popupRect = popup.getBoundingClientRect();
  var left = rect.left + rect.width / 2 - popupRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - popupRect.width - 8));
  var top = rect.bottom + 8;
  if (top + popupRect.height > window.innerHeight - 8) { top = rect.top - popupRect.height - 8; }
  popup.style.left = left + "px";
  popup.style.top = Math.max(8, top) + "px";
  popup.style.setProperty("--identity-popup-origin", "top center");
}

function openIdentityPopup(anchorEl) {
  closeIdentityPopup(); // tear down any previous listener first -- repeat clicks on the same row would otherwise leak one mousedown listener per click
  positionIdentityPopup(identityPopup, anchorEl);
  identityPopupOutsideClickHandler = function(e) {
    if (!identityPopup.contains(e.target) && !anchorEl.contains(e.target)) { closeIdentityPopup(); }
  };
  document.addEventListener("mousedown", identityPopupOutsideClickHandler);
}

leaderboardSection.addEventListener("click", function(e) {
  var row = e.target.closest(".lb-row");
  if (!row || isTeacher || isDisplayMode || row.dataset.lbName !== username) { return; }
  openIdentityPopup(row);
});

function renderEmojiCircle() {
  emojiDisplay.innerHTML = "";
  if (studentEmoji) {
    var span = document.createElement("span");
    span.className = "emoji-animate";
    span.style.fontSize = "1.6rem";
    span.textContent = studentEmoji;
    emojiDisplay.appendChild(span);
  } else {
    emojiDisplay.textContent = "Choose Emoji";
  }
}

function renderNicknameInput() {
  var container = document.getElementById("nicknameInputContainer");
  if (!container) { return; }
  container.innerHTML = "";
  var input = document.createElement("input");
  input.type = "text";
  input.maxLength = 20;
  input.placeholder = "Leaderboard name";
  input.value = studentNickname || "";
  input.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% - 32px);background:transparent;border:none;outline:none;font-size:1rem;color:inherit;text-align:center;letter-spacing:0.02em;";
  input.onblur = async function() {
    var newVal = input.value.trim();
    if (newVal !== studentNickname) {
      studentNickname = newVal;
      await saveStudentNickname();
    }
  };
  input.onkeydown = function(e) { if (e.key === "Enter") { input.blur(); } };
  container.style.position = "relative";
  container.appendChild(input);
}

async function saveStudentNickname() {
  if (!currentStudentId || !currentBoardId) { return; }
  await updateDoc(doc(db, "boards", currentBoardId, "students", currentStudentId), { nickname: studentNickname });
  var lbRef = doc(db, "boards", currentBoardId, "leaderboard", username);
  var lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await updateDoc(lbRef, { nickname: studentNickname });
  }
}

async function saveStudentEmoji() {
  if (!currentStudentId || !currentBoardId) { return; }
  await updateDoc(doc(db, "boards", currentBoardId, "students", currentStudentId), { emoji: studentEmoji });
  var lbRef = doc(db, "boards", currentBoardId, "leaderboard", username);
  var lbSnap = await getDoc(lbRef);
  if (lbSnap.exists()) {
    await updateDoc(lbRef, { emoji: studentEmoji });
  }
  // Do NOT recreate the leaderboard doc if it doesn't exist —
  // it should only be created when points are awarded
}

async function loadStudentsPortal() {
  studentsList.innerHTML = "";
  var studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var pollsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var totalPolls = pollsSnapshot.size;
  if (studentsSnapshot.empty) {
    studentsList.innerHTML = "<p style='text-align:center;margin-top:40px;'>No students yet.</p>";
    return;
  }
  var toggleBtn = document.getElementById("dailyDataToggleBtn");
  if (toggleBtn) {
    toggleBtn.innerHTML = eyeLabel(dailyDataVisible, "Daily Data Shown", "Daily Data Hidden");
    toggleBtn.onclick = async function() {
      dailyDataVisible = !dailyDataVisible;
      toggleBtn.innerHTML = eyeLabel(dailyDataVisible, "Daily Data Shown", "Daily Data Hidden");
      await loadStudentsPortal();
    };
  }
  var allStudentDocs = studentsSnapshot.docs;
  studentsList.appendChild(await buildClassAggregateCard(allStudentDocs, totalPolls, pollsSnapshot));
  for (var i = 0; i < allStudentDocs.length; i++) {
    var studentDoc = allStudentDocs[i];
    var student = studentDoc.data();
    var studentId = studentDoc.id;
    var card = document.createElement("div");
    card.className = "board-card";
    var info = document.createElement("div");
    info.className = "board-card-info";
    if (dailyDataVisible) {
      var stats = await calculateStudentStats(studentId, totalPolls, pollsSnapshot);
      var pollPct = totalPolls > 0 ? Math.round((stats.pollsVoted / totalPolls) * 100) : 0;
      var engagementData = await computeMonthlyEngagement(studentId, student);
      var currentMonthKey = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0");
      var currentEngagement = 0;
      for (var ei = 0; ei < engagementData.length; ei++) {
        if (engagementData[ei].key === currentMonthKey) { currentEngagement = Math.round(engagementData[ei].value); break; }
      }
      info.innerHTML = "<h3>" + student.username + "</h3><p class='student-stats'>📊 Engagement: " + currentEngagement + "% | Polls: " + stats.pollsVoted + " (" + pollPct + "%) | Comments: " + stats.comments + " | Upvotes Given: " + stats.upvotesGiven + " | Upvotes Received: " + stats.upvotesReceived + " | 🥷🏼 Anonymous: " + stats.anonymousPercentage + "%</p>";
    } else {
      info.innerHTML = "<h3>" + student.username + "</h3>";
    }
    var actions = document.createElement("div");
    actions.className = "board-card-actions";
    var enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    (function(sid) { enterBtn.onclick = function(e) { e.stopPropagation(); viewStudentDashboard(sid); }; })(studentId);
    var deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = iconLabel("trash", "Delete");
    deleteBtn.className = "delete-poll teacher-control";
    (function(sid, sname) {
      deleteBtn.onclick = async function(e) {
        e.stopPropagation();
        if (!confirm("Delete student " + sname + "?")) { return; }
        await deleteDoc(doc(db, "boards", currentBoardId, "students", sid));
        loadStudentsPortal();
      };
    })(studentId, student.username);
    actions.appendChild(enterBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(info);
    card.appendChild(actions);
    (function(sid) { card.onclick = function() { viewStudentDashboard(sid); }; })(studentId);
    studentsList.appendChild(card);
  }
}

async function buildClassAggregateCard(allStudentDocs, totalPolls, pollsSnapshot) {
  var card = document.createElement("div");
  card.className = "board-card class-aggregate-card";
  var info = document.createElement("div");
  info.className = "board-card-info";
  info.innerHTML = "<h3>📊 Class Aggregate</h3><p>Average across all students</p>";
  var actions = document.createElement("div");
  actions.className = "board-card-actions";
  var enterBtn = document.createElement("button");
  enterBtn.textContent = "Enter";
  enterBtn.onclick = async function(e) { e.stopPropagation(); await viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot); };
  actions.appendChild(enterBtn);
  card.appendChild(info);
  card.appendChild(actions);
  card.onclick = async function() { await viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot); };
  return card;
}

async function viewStudentDashboard(studentId) {
  currentStudentId = studentId;
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.remove("hidden");
  var studentDoc = await getDoc(doc(db, "boards", currentBoardId, "students", studentId));
  var student = studentDoc.data();
  var lbData = { gold: studentDoc.data().goldMedals || 0, silver: studentDoc.data().silverMedals || 0, bronze: studentDoc.data().bronzeMedals || 0 };
  var monthlyEngagement = await computeMonthlyEngagement(studentId, student);
  var monthlyPollsCastPct = await computeMonthlyPollsCastPct(studentId, student);
  var monthlyAnonPct = await computeMonthlyAnonPct(studentId, student);
  var monthlyPollAccuracy = await computeMonthlyPollAccuracy(studentId, student);
  dashboardContent.innerHTML = "<div class='dashboard-header'><h2>" + student.username + "</h2><p>" + (student.password ? "Password: " + student.password : "No password set") + "</p><button id='mergeStudentBtn' class='teacher-control' style='margin-top:16px;'>Merge Student</button></div><div class='metrics-grid' id='metricsGrid'></div>";
  var grid = document.getElementById("metricsGrid");
  var lbCard = document.createElement("div");
  lbCard.className = "metric-card";
  lbCard.innerHTML = "<h3>🏆 Medals</h3><div style='font-size:1.4rem;padding:8px 0;'>🥇 " + (lbData.gold || 0) + " &nbsp; 🥈 " + (lbData.silver || 0) + " &nbsp; 🥉 " + (lbData.bronze || 0) + "</div>";
  grid.appendChild(lbCard);
  addPercentageMetricCard(grid, "📊 Engagement %", monthlyEngagement, "engagementChart");
  addPercentageMetricCard(grid, "🗳️ Polls Cast %", monthlyPollsCastPct, "pollsCastPctChart");
  addPercentageMetricCard(grid, "🥷🏼 Anonymous %", monthlyAnonPct, "anonPctChart");
  addPercentageMetricCard(grid, "🎯 Poll Accuracy %", monthlyPollAccuracy, "pollAccuracyChart");
  addHistoricMetricCard(grid, "Comments Made: " + (student.historicalComments || 0), student.monthlyStats || {}, "comments", "commentsChart");
  addHistoricMetricCard(grid, "Upvotes Given: " + (student.historicalUpvotesGiven || 0), student.monthlyStats || {}, "upvotesGiven", "upvotesGivenChart");
  addHistoricMetricCard(grid, "Upvotes Received: " + (student.historicalUpvotesReceived || 0), student.monthlyStats || {}, "upvotesReceived", "upvotesReceivedChart");
  document.getElementById("mergeStudentBtn").onclick = async function() { await showMergeDialog(studentId); };
}

function addHistoricMetricCard(grid, title, monthlyStats, metric, canvasId) {
  var card = document.createElement("div");
  card.className = "metric-card";
  card.innerHTML = "<h3>" + title + "</h3><canvas id='" + canvasId + "' width='400' height='200'></canvas>";
  grid.appendChild(card);
  drawChart(canvasId, monthlyStats, metric);
}

function addPercentageMetricCard(grid, title, monthlyData, canvasId) {
  var card = document.createElement("div");
  card.className = "metric-card";
  card.innerHTML = "<h3>" + title + "</h3><canvas id='" + canvasId + "' width='400' height='200'></canvas>";
  grid.appendChild(card);
  drawPercentageChart(canvasId, monthlyData);
}

async function viewClassAggregateDashboard(allStudentDocs, totalPolls, pollsSnapshot) {
  studentsPortalDiv.classList.add("hidden");
  studentDashboardDiv.classList.remove("hidden");
  var months = getLastTwelveMonthKeys();
  var n = allStudentDocs.length || 1;
  var totComments = 0;
  var totUpvGiven = 0;
  var totUpvReceived = 0;
  var avgMonthlyStats = {};
  for (var mi = 0; mi < months.length; mi++) {
    avgMonthlyStats[months[mi]] = { comments: 0, upvotesGiven: 0, upvotesReceived: 0, pollsCast: 0 };
  }
  for (var i = 0; i < allStudentDocs.length; i++) {
    var s = allStudentDocs[i].data();
    totComments += s.historicalComments || 0;
    totUpvGiven += s.historicalUpvotesGiven || 0;
    totUpvReceived += s.historicalUpvotesReceived || 0;
    for (var mi = 0; mi < months.length; mi++) {
      var m = months[mi];
      if (s.monthlyStats && s.monthlyStats[m]) {
        avgMonthlyStats[m].comments += (s.monthlyStats[m].comments || 0) / n;
        avgMonthlyStats[m].upvotesGiven += (s.monthlyStats[m].upvotesGiven || 0) / n;
        avgMonthlyStats[m].upvotesReceived += (s.monthlyStats[m].upvotesReceived || 0) / n;
        avgMonthlyStats[m].pollsCast += (s.monthlyStats[m].pollsCast || 0) / n;
      }
    }
  }
  var lbSnap = await getDocs(collection(db, "boards", currentBoardId, "leaderboard"));
  var lbScores = [];
  lbSnap.forEach(function(d) {
    var data = d.data();
    lbScores.push({ name: d.id, pts: (data.gold || 0) * 3 + (data.silver || 0) * 2 + (data.bronze || 0) });
  });
  lbScores.sort(function(a, b) { return b.pts - a.pts; });
  var top3 = lbScores.slice(0, 3);
  dashboardContent.innerHTML = "<div class='dashboard-header'><h2>📊 Class Aggregate</h2><p>Mean across all " + n + " students</p></div><div class='metrics-grid' id='metricsGridAgg'></div>";
  var grid = document.getElementById("metricsGridAgg");
  var medals = ["🥇", "🥈", "🥉"];
  var top3Html = top3.length > 0 ? top3.map(function(s, i) { return medals[i] + " " + s.name; }).join("<br>") : "No data yet";
  var lbCard = document.createElement("div");
  lbCard.className = "metric-card";
  lbCard.innerHTML = "<h3>🏆 Top Students</h3><div class='leaderboard-summary-box'>" + top3Html + "</div>";
  grid.appendChild(lbCard);
  addPercentageMetricCard(grid, "📊 Engagement %", await computeClassAggregatePercent(allStudentDocs, "engagement"), "aggEngagementChart");
  addPercentageMetricCard(grid, "🗳️ Polls Cast %", await computeClassAggregatePercent(allStudentDocs, "pollsCast"), "aggPollsChart");
  addPercentageMetricCard(grid, "🥷🏼 Anonymous %", await computeClassAggregatePercent(allStudentDocs, "anon"), "aggAnonChart");
  addPercentageMetricCard(grid, "🎯 Poll Accuracy %", await computeClassAggregatePercent(allStudentDocs, "accuracy"), "aggAccuracyChart");
  addHistoricMetricCard(grid, "Comments (avg): " + Math.round(totComments / n), avgMonthlyStats, "comments", "aggCommentsChart");
  addHistoricMetricCard(grid, "Upvotes Given (avg): " + Math.round(totUpvGiven / n), avgMonthlyStats, "upvotesGiven", "aggUpvGivenChart");
  addHistoricMetricCard(grid, "Upvotes Received (avg): " + Math.round(totUpvReceived / n), avgMonthlyStats, "upvotesReceived", "aggUpvRecChart");
}

async function computeClassAggregatePercent(allStudentDocs, type) {
  var months = getLastTwelveMonthKeys();
  var sumByMonth = {};
  for (var mi = 0; mi < months.length; mi++) { sumByMonth[months[mi]] = 0; }
  var count = 0;
  for (var i = 0; i < allStudentDocs.length; i++) {
    var s = allStudentDocs[i].data();
    var data;
    if (type === "engagement") { data = await computeMonthlyEngagement(allStudentDocs[i].id, s); }
    else if (type === "pollsCast") { data = await computeMonthlyPollsCastPct(allStudentDocs[i].id, s); }
    else if (type === "anon") { data = await computeMonthlyAnonPct(allStudentDocs[i].id, s); }
    else if (type === "accuracy") { data = await computeMonthlyPollAccuracy(allStudentDocs[i].id, s); }
    if (data) {
      for (var di = 0; di < data.length; di++) { sumByMonth[data[di].key] = (sumByMonth[data[di].key] || 0) + data[di].value; }
      count++;
    }
  }
  var nCount = count || 1;
  var result = [];
  for (var mi = 0; mi < months.length; mi++) {
    var key = months[mi];
    var d = new Date();
    d.setMonth(d.getMonth() - (11 - mi));
    result.push({ key: key, label: d.toLocaleString("en", { month: "short" }).toUpperCase(), value: sumByMonth[key] / nCount });
  }
  return result;
}

function getLastTwelveMonthKeys() {
  var keys = [];
  var now = new Date();
  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return keys;
}

async function computeMonthlyEngagement(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var joinedAt = student.joinedAt && student.joinedAt.toDate ? student.joinedAt.toDate() : new Date(0);
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var parts = monthKey.split("-");
    var yr = parseInt(parts[0]);
    var mo = parseInt(parts[1]);
    var monthEnd = new Date(yr, mo, 0, 23, 59, 59);
    if (monthEnd < joinedAt) { results.push({ key: monthKey, label: getMonthLabel(monthKey), value: 0 }); continue; }
    var totalOpp = 0;
    var participated = 0;
    var primaryCommentCount = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
      if (!hasInteraction) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      totalOpp++;
      var voted = poll.type === "mc" ? (poll.voters || []).indexOf(student.username) !== -1 : (poll.history || []).some(function(h) { return h.username === student.username; });
      if (voted) { participated++; }
    });
    postsSnap.forEach(function(pd) {
      var post = pd.data();
      var postTime = post.timestamp && post.timestamp.toDate ? post.timestamp.toDate() : null;
      if (!postTime || postTime < joinedAt) { return; }
      var pk = postTime.getFullYear() + "-" + String(postTime.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      if (post.author === student.username) { primaryCommentCount++; return; }
      totalOpp++;
      var upvoted = (post.upvoters || []).indexOf(student.username) !== -1;
      var replied = repliesSnap.docs.some(function(rd) { return rd.data().postId === pd.id && rd.data().author === student.username; });
      if (upvoted || replied) { participated++; }
    });
    var pct = totalOpp > 0 ? (participated / totalOpp) * 100 : 0;
    pct = Math.min(pct + Math.min(primaryCommentCount * 2, 50), 100);
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: pct });
  }
  return results;
}

async function computeMonthlyPollsCastPct(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var joinedAt = student.joinedAt && student.joinedAt.toDate ? student.joinedAt.toDate() : new Date(0);
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var parts = monthKey.split("-");
    var yr = parseInt(parts[0]);
    var mo = parseInt(parts[1]);
    var monthEnd = new Date(yr, mo, 0, 23, 59, 59);
    if (monthEnd < joinedAt) { results.push({ key: monthKey, label: getMonthLabel(monthKey), value: 0 }); continue; }
    var total = 0;
    var voted = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
      if (!hasInteraction) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      total++;
      var v = poll.type === "mc" ? (poll.voters || []).indexOf(student.username) !== -1 : (poll.history || []).some(function(h) { return h.username === student.username; });
      if (v) { voted++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: total > 0 ? (voted / total) * 100 : 0 });
  }
  return results;
}

async function computeMonthlyAnonPct(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var total = 0;
    var anon = 0;
    postsSnap.forEach(function(pd) {
      var p = pd.data();
      if (p.author !== student.username) { return; }
      var t = p.timestamp && p.timestamp.toDate ? p.timestamp.toDate() : null;
      if (!t) { return; }
      var pk = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      total++;
      if (p.anonymous) { anon++; }
    });
    repliesSnap.forEach(function(rd) {
      var r = rd.data();
      if (r.author !== student.username) { return; }
      var t = r.timestamp && r.timestamp.toDate ? r.timestamp.toDate() : null;
      if (!t) { return; }
      var pk = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
      if (pk !== monthKey) { return; }
      total++;
      if (r.anonymous) { anon++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: total > 0 ? (anon / total) * 100 : 0 });
  }
  return results;
}

async function computeMonthlyPollAccuracy(studentId, student) {
  var months = getLastTwelveMonthKeys();
  var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
  var now = new Date();
  var currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var results = [];
  for (var mi = 0; mi < months.length; mi++) {
    var monthKey = months[mi];
    var participated = 0;
    var correct = 0;
    pollsSnap.forEach(function(pd) {
      var poll = pd.data();
      if (poll.type !== "mc") { return; }
      if ((poll.voters || []).indexOf(student.username) === -1) { return; }
      var pollTime = poll.createdAt && poll.createdAt.toDate ? poll.createdAt.toDate() : null;
      var pk = pollTime ? (pollTime.getFullYear() + "-" + String(pollTime.getMonth() + 1).padStart(2, "0")) : currentMonthKey;
      if (pk !== monthKey) { return; }
      participated++;
      if (!poll.correctIndices || poll.correctIndices.length === 0) { return; }
      var voterEntries = (poll.history || []).filter(function(e) { return e.username === student.username; });
      if (!voterEntries.length) { return; }
      var last = voterEntries[voterEntries.length - 1];
      var optText = last.response || "";
      if (optText.indexOf("Changed vote: ") === 0) {
        var toSep = optText.indexOf(" to ");
        optText = toSep === -1 ? "" : optText.slice(toSep + 4);
      }
      else if (optText.indexOf("Voted: ") === 0) { optText = optText.slice(7); }
      else if (optText.indexOf("Removed vote: ") === 0) { optText = optText.slice(14); }
      if (poll.correctIndices.indexOf((poll.options || []).indexOf(optText)) !== -1) { correct++; }
    });
    results.push({ key: monthKey, label: getMonthLabel(monthKey), value: participated > 0 ? (correct / participated) * 100 : 0 });
  }
  return results;
}

function getMonthLabel(monthKey) {
  var parts = monthKey.split("-");
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleString("en", { month: "short" }).toUpperCase();
}

function drawChart(canvasId, monthlyStats, metric) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var months = getLastTwelveMonthKeys();
  var data = [];
  for (var i = 0; i < months.length; i++) {
    var key = months[i];
    data.push({ key: key, label: getMonthLabel(key), value: monthlyStats[key] && monthlyStats[key][metric] ? monthlyStats[key][metric] : 0 });
  }
  var maxValue = 1;
  for (var i = 0; i < data.length; i++) { if (data[i].value > maxValue) { maxValue = data[i].value; } }
  var padding = 40;
  var chartWidth = canvas.width - padding * 2;
  var chartHeight = canvas.height - padding * 2;
  var pointSpacing = chartWidth / (data.length - 1);
  ctx.strokeStyle = "#d4a373";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  for (var i = 0; i < data.length; i++) {
    var x = padding + i * pointSpacing;
    var y = padding + chartHeight - (data[i].value / maxValue) * chartHeight;
    if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
  }
  ctx.stroke();
  ctx.fillStyle = "#d4a373";
  for (var i = 0; i < data.length; i++) {
    var x = padding + i * pointSpacing;
    var y = padding + chartHeight - (data[i].value / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1d1d1f";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  for (var i = 0; i < data.length; i++) {
    if (i % 2 === 0 || i === data.length - 1) {
      ctx.fillText(data[i].label, padding + i * pointSpacing, canvas.height - 10);
    }
  }
}

function drawPercentageChart(canvasId, monthlyData) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!monthlyData || monthlyData.length === 0) { return; }
  var padding = 40;
  var chartWidth = canvas.width - padding * 2;
  var chartHeight = canvas.height - padding * 2;
  var pointSpacing = chartWidth / (monthlyData.length - 1);
  var rollingAvg = [];
  for (var i = 0; i < monthlyData.length; i++) {
    var sum = 0;
    for (var j = 0; j <= i; j++) { sum += monthlyData[j].value; }
    rollingAvg.push({ key: monthlyData[i].key, label: monthlyData[i].label, value: sum / (i + 1) });
  }
  drawColoredLine(ctx, monthlyData, padding, chartWidth, chartHeight, pointSpacing, 100, false);
  drawColoredLine(ctx, rollingAvg, padding, chartWidth, chartHeight, pointSpacing, 100, true);
  ctx.fillStyle = "#1d1d1f";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  for (var i = 0; i < monthlyData.length; i++) {
    if (i % 2 === 0 || i === monthlyData.length - 1) {
      ctx.fillText(monthlyData[i].label, padding + i * pointSpacing, canvas.height - 10);
    }
  }
}

function getEngagementColor(pct) {
  var p = Math.max(0, Math.min(100, pct));
  if (p <= 33.333) { var t = p / 33.333; return "rgb(" + Math.round(128 + t * 127) + ",0,0)"; }
  if (p <= 66.666) { var t = (p - 33.333) / 33.333; return "rgb(255," + Math.round(t * 204) + ",0)"; }
  var t = (p - 66.666) / 33.334;
  return "rgb(" + Math.round(255 * (1 - t)) + "," + Math.round(180 + t * 75) + ",0)";
}

function drawColoredLine(ctx, data, padding, chartWidth, chartHeight, pointSpacing, maxVal, dotted) {
  if (data.length < 2) { return; }
  ctx.save();
  ctx.lineWidth = dotted ? 2 : 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dotted) { ctx.setLineDash([6, 4]); } else { ctx.setLineDash([]); }
  for (var i = 1; i < data.length; i++) {
    var x0 = padding + (i - 1) * pointSpacing;
    var y0 = padding + chartHeight - (data[i - 1].value / maxVal) * chartHeight;
    var x1 = padding + i * pointSpacing;
    var y1 = padding + chartHeight - (data[i].value / maxVal) * chartHeight;
    ctx.strokeStyle = getEngagementColor((data[i - 1].value + data[i].value) / 2);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  if (!dotted) {
    for (var i = 0; i < data.length; i++) {
      var x = padding + i * pointSpacing;
      var y = padding + chartHeight - (data[i].value / maxVal) * chartHeight;
      ctx.fillStyle = getEngagementColor(data[i].value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

async function showMergeDialog(sid) {
  var snap = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var students = [];
  snap.forEach(function(d) { if (d.id !== sid) { students.push({ id: d.id, username: d.data().username }); } });
  if (!students.length) { alert("No other students to merge with."); return; }
  var promptText = "Select student to merge with:\n\n";
  for (var i = 0; i < students.length; i++) { promptText += (i + 1) + ". " + students[i].username + "\n"; }
  promptText += "\nEnter number:";
  var sel = prompt(promptText);
  var idx = parseInt(sel) - 1;
  if (isNaN(idx) || idx < 0 || idx >= students.length) { alert("Invalid selection."); return; }
  if (!confirm("Merge " + students[idx].username + " into current student?")) { return; }
  await mergeStudents(sid, students[idx].id);
}

async function mergeStudents(keepId, mergeId) {
  var keepRef = doc(db, "boards", currentBoardId, "students", keepId);
  var mergeRef = doc(db, "boards", currentBoardId, "students", mergeId);
  var keepData = (await getDoc(keepRef)).data();
  var mergeData = (await getDoc(mergeRef)).data();
  var mergedH = {
    historicalComments: (keepData.historicalComments || 0) + (mergeData.historicalComments || 0),
    historicalUpvotesGiven: (keepData.historicalUpvotesGiven || 0) + (mergeData.historicalUpvotesGiven || 0),
    historicalUpvotesReceived: (keepData.historicalUpvotesReceived || 0) + (mergeData.historicalUpvotesReceived || 0),
    historicalPollsCast: (keepData.historicalPollsCast || 0) + (mergeData.historicalPollsCast || 0)
  };
  var mergedM = Object.assign({}, keepData.monthlyStats || {});
  var mergeStats = mergeData.monthlyStats || {};
  for (var m in mergeStats) {
    if (!mergedM[m]) { mergedM[m] = mergeStats[m]; }
    else {
      mergedM[m] = {
        comments: (mergedM[m].comments || 0) + (mergeStats[m].comments || 0),
        upvotesGiven: (mergedM[m].upvotesGiven || 0) + (mergeStats[m].upvotesGiven || 0),
        upvotesReceived: (mergedM[m].upvotesReceived || 0) + (mergeStats[m].upvotesReceived || 0),
        pollsCast: (mergedM[m].pollsCast || 0) + (mergeStats[m].pollsCast || 0)
      };
    }
  }
  var updateData = { monthlyStats: mergedM };
  for (var key in mergedH) { updateData[key] = mergedH[key]; }
  await updateDoc(keepRef, updateData);
  await deleteDoc(mergeRef);
  alert("Students merged successfully.");
  viewStudentDashboard(keepId);
}

async function calculateStudentStats(studentId, totalPolls, pollsSnapshot) {
  var student = (await getDoc(doc(db, "boards", currentBoardId, "students", studentId))).data();
  var pollsVoted = 0;
  pollsSnapshot.forEach(function(pd) {
    var poll = pd.data();
    if (poll.type === "mc" && (poll.voters || []).indexOf(student.username) !== -1) { pollsVoted++; }
    else if ((poll.type === "free" || poll.type === "draw") && (poll.history || []).some(function(h) { return h.username === student.username; })) { pollsVoted++; }
  });
  var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
  var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
  var comments = 0;
  var anonComments = 0;
  var upvotesGiven = 0;
  var upvotesReceived = 0;
  postsSnap.forEach(function(pd) {
    var p = pd.data();
    if (p.author !== student.username) { return; }
    comments++;
    if (p.anonymous) { anonComments++; }
  });
  repliesSnap.forEach(function(rd) {
    var r = rd.data();
    if (r.author !== student.username) { return; }
    comments++;
    if (r.anonymous) { anonComments++; }
  });
  postsSnap.forEach(function(pd) {
    var p = pd.data();
    if ((p.upvoters || []).indexOf(student.username) !== -1) { upvotesGiven++; }
    if (p.author === student.username) { upvotesReceived += p.upvotes || 0; }
  });
  return {
    pollsVoted: pollsVoted,
    comments: comments,
    upvotesGiven: upvotesGiven,
    upvotesReceived: upvotesReceived,
    anonymousPercentage: comments > 0 ? Math.round((anonComments / comments) * 100) : 0
  };
}

async function incrementStudentStat(studentId, metric, amount) {
  if (amount === undefined) { amount = 1; }
  if (!studentId) { return; }
  var studentRef = doc(db, "boards", currentBoardId, "students", studentId);
  var studentDoc = await getDoc(studentRef);
  if (!studentDoc.exists()) { return; }
  var student = studentDoc.data();
  var monthlyStats = student.monthlyStats || {};
  var now = new Date();
  var monthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  if (!monthlyStats[monthKey]) { monthlyStats[monthKey] = { comments: 0, upvotesGiven: 0, upvotesReceived: 0, pollsCast: 0 }; }
  monthlyStats[monthKey][metric] = (monthlyStats[monthKey][metric] || 0) + amount;
  var updates = { monthlyStats: monthlyStats };
  var hKey = "historical" + metric.charAt(0).toUpperCase() + metric.slice(1);
  updates[hKey] = (student[hKey] || 0) + amount;
  await updateDoc(studentRef, updates);
}

async function uploadImage(file, folder) {
  var storageRef = ref(storage, folder + "/" + Date.now() + "-" + file.name);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

function showImagePreview(file, previewElement, removeCallback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    previewElement.innerHTML = "<img src='" + e.target.result + "' /><button class='remove-image'>x</button>";
    previewElement.querySelector(".remove-image").onclick = removeCallback;
  };
  reader.readAsDataURL(file);
}

function showImageLightbox(imageUrl) {
  var lb = document.createElement("div");
  lb.className = "image-lightbox";
  lb.innerHTML = "<img src='" + imageUrl + "' />";
  lb.onclick = function() { lb.remove(); };
  document.body.appendChild(lb);
}

// ─── CONFUSION STATE (shared by seating map + student indicator) ───────────

var CONFUSION_DURATION_MS = 5 * 60 * 1000; // green's simple cosmetic-only fade window
// Colorblind-friendly palette: spread across lightness (dark -> medium ->
// light) rather than relying on red/green hue discrimination, which is what
// actually helps deuteranopia/protanopia -- not just picking "different" hues.
var CONFUSION_COLORS = { red: "#8c1f4b", orange: "#c76a17", green: "#c3f5d6" };
// States that run the "are you still confused?" prompt/auto-fade cycle below.
var CONFUSION_FADE_STATES = { red: true, orange: true };
var CONFUSION_PROMPT_AT_MS = 5 * 60 * 1000;                             // red/orange: prompt fires here
var CONFUSION_GRACE_MS = 60 * 1000;                                     // red/orange: respond-or-fade window after the prompt
var CONFUSION_FADE_DURATION_MS = 2 * 60 * 1000;                         // red/orange: real fade duration
var CONFUSION_FADE_START_MS = CONFUSION_PROMPT_AT_MS + CONFUSION_GRACE_MS;    // 6 min: real fade begins
var CONFUSION_RESOLVE_AT_MS = CONFUSION_FADE_START_MS + CONFUSION_FADE_DURATION_MS; // 8 min: auto-resolves to None

// Fades `el`'s background from the full confusion color to the theme-neutral
// color over whatever time remains in the fade window. Using a CSS transition
// (rather than a setInterval countdown) means re-calling this on every
// snapshot update is safe and cheap: the remaining time is always recomputed
// from the absolute `setAtMs` timestamp, so the visual always lands in the
// correct spot in its fade regardless of when/how often we redraw.
// `fadeStartMs`/`fadeDurationMs` (both optional, defaulting to green's simple
// flat fade) let red/orange delay the fade's start without a separate
// function: before `fadeStartMs` has elapsed the color just stays solid.
function applyConfusionVisual(el, state, setAtMs, fadeStartMs, fadeDurationMs) {
  fadeStartMs = fadeStartMs || 0;
  fadeDurationMs = fadeDurationMs || CONFUSION_DURATION_MS;
  // Force-cancel any in-flight fade first: clearing the inline `transition`
  // override below doesn't disable transitions, it falls back to the
  // stylesheet's global `button { transition: all 0.2s ease; }` -- and since
  // the target backgroundColor value isn't actually changing in the
  // deactivate branch, no new transition would be detected, so without this
  // the *old* multi-minute fade just keeps running on its original schedule
  // instead of snapping off immediately.
  el.getAnimations().forEach(function(a) { a.cancel(); });
  var neutral = getComputedStyle(document.documentElement).getPropertyValue("--bg-secondary").trim() || "#ffffff";
  var elapsed = (state && setAtMs) ? Date.now() - setAtMs : null;
  var fadeElapsed = elapsed === null ? null : elapsed - fadeStartMs;
  var remaining = fadeElapsed === null ? 0 : (fadeElapsed < 0 ? fadeDurationMs : fadeDurationMs - fadeElapsed);
  if (!state || !CONFUSION_COLORS[state] || remaining <= 0) {
    el.style.transition = "";
    el.style.backgroundColor = neutral;
    return;
  }
  el.style.transition = "none";
  el.style.backgroundColor = CONFUSION_COLORS[state];
  void el.offsetWidth; // force reflow so the "full color, no transition" frame commits
  if (fadeElapsed < 0) { return; } // still fully solid -- the fade hasn't started yet
  el.style.transition = "background-color " + remaining + "ms linear";
  el.style.backgroundColor = neutral;
}

// Picks the correct fade schedule for `state` (red/orange get the delayed,
// prompt-driven schedule; everything else gets green's simple flat fade) so
// every teacher-facing seat-view call site stays consistent with the
// student's own indicator without repeating the fade-param logic everywhere.
function applyConfusionVisualForState(el, state, setAtMs) {
  if (CONFUSION_FADE_STATES[state]) { applyConfusionVisual(el, state, setAtMs, CONFUSION_FADE_START_MS, CONFUSION_FADE_DURATION_MS); }
  else { applyConfusionVisual(el, state, setAtMs); }
}

async function setMyConfusionState(state) {
  if (!currentStudentId || !currentBoardId) { return; }
  var studentRef = doc(db, "boards", currentBoardId, "students", currentStudentId);
  var now = Date.now();
  await updateDoc(studentRef, {
    confusionState: state,
    confusionSetAt: now,
    confusionHistory: arrayUnion({ state: state, setAt: now })
  });
  // Trim history to the most recent ~100 entries so the array doesn't grow
  // unbounded (bumped up from 40: the prompt/auto-fade cycle below can add
  // several entries per long confused stretch, on top of manual toggling).
  var snap = await getDoc(studentRef);
  var hist = (snap.data() || {}).confusionHistory || [];
  if (hist.length > 100) { await updateDoc(studentRef, { confusionHistory: hist.slice(hist.length - 100) }); }
}

// Pure function (no DOM, no Date.now() call) describing what stage of the
// prompt/auto-fade cycle a red/orange confusion state is currently in, given
// only the state and when it was set -- recomputed fresh each time rather
// than tracked by a running countdown, so a closed/reopened tab (or a missed
// interval tick) always lands in the correct stage instead of needing to
// replay a multi-minute animation.
function getConfusionFadeStage(state, setAtMs, now) {
  if (!CONFUSION_FADE_STATES[state] || !setAtMs) { return null; }
  var elapsed = now - setAtMs;
  if (elapsed < CONFUSION_PROMPT_AT_MS) { return "active"; }
  if (elapsed < CONFUSION_FADE_START_MS) { return "prompting"; }
  if (elapsed < CONFUSION_RESOLVE_AT_MS) { return "fading"; }
  return "resolved";
}

var CONFUSION_SPARKLINE_WINDOW_MS = 15 * 60 * 1000;

// Builds a time-proportional (not index-proportional, unlike the teacher-
// facing discrete "tick" timelines elsewhere) CSS linear-gradient string from
// history entries falling in [windowStart, windowEnd], carrying in whichever
// state was active at the window's left edge so the strip never shows a
// false gap. Pure function (no DOM, no Date.now() call) so the window-
// clamping/carry-in/color-mapping/fade-tail logic is unit-testable in
// isolation. Shared by the student's own sparkline AND the teacher's
// class-wide timeline, so both visualize red/orange fading identically:
// - a CLOSED red/orange interval that ends in None (manual toggle-off or the
//   automated fade) draws its final min(2min, duration) as a gradient to
//   `neutralColor` -- a short toggle-on/off renders as one fully-compressed
//   fade rather than solid color, matching the "compresses proportionally"
//   requirement.
// - a CLOSED red/orange interval that ends in a DIFFERENT explicit state
//   (switching straight to green/orange/red) is a flat instant cut, no fade,
//   matching every other state transition's existing snap behavior.
// - a still-OPEN red/orange interval independently re-derives the same
//   prompt/fade/resolve schedule `getConfusionFadeStage` uses, anchored to
//   its own setAt (not to windowEnd), so the chart stays accurate even if the
//   owning student's own client never got to perform the resolve-to-None
//   write (e.g. the tab was closed mid-fade and never reopened).
function buildConfusionGradient(history, windowStart, windowEnd, colors, neutralColor) {
  var windowMs = windowEnd - windowStart;
  function pct(t) { return Math.max(0, Math.min(100, ((t - windowStart) / windowMs) * 100)); }
  function pushFlat(stops, color, start, end) {
    if (end - start <= 0) { return; }
    stops.push(color + " " + pct(start) + "%", color + " " + pct(end) + "%");
  }
  function pushClosedFade(stops, color, start, end) {
    var duration = end - start;
    if (duration <= 0) { return; }
    var tail = Math.min(CONFUSION_FADE_DURATION_MS, duration);
    var tailStart = end - tail;
    if (tailStart > start) { stops.push(color + " " + pct(start) + "%", color + " " + pct(tailStart) + "%"); }
    stops.push(color + " " + pct(tailStart) + "%", neutralColor + " " + pct(end) + "%");
  }
  function pushOpenFade(stops, color, setAtMs) {
    var fadeStart = setAtMs + CONFUSION_FADE_START_MS;
    var resolveAt = setAtMs + CONFUSION_RESOLVE_AT_MS;
    if (windowEnd <= fadeStart) {
      stops.push(color + " " + pct(setAtMs) + "%", color + " " + pct(windowEnd) + "%");
      return;
    }
    stops.push(color + " " + pct(setAtMs) + "%", color + " " + pct(fadeStart) + "%");
    if (windowEnd <= resolveAt) {
      stops.push(color + " " + pct(fadeStart) + "%", neutralColor + " " + pct(windowEnd) + "%");
      return;
    }
    stops.push(color + " " + pct(fadeStart) + "%", neutralColor + " " + pct(resolveAt) + "%");
    stops.push(neutralColor + " " + pct(resolveAt) + "%", neutralColor + " " + pct(windowEnd) + "%");
  }

  var hist = (history || []).slice().sort(function(a, b) { return a.setAt - b.setAt; });
  var carryInState = null;
  var carryInSetAt = windowStart;
  var inWindow = [];
  for (var i = 0; i < hist.length; i++) {
    if (hist[i].setAt <= windowStart) { carryInState = hist[i].state; carryInSetAt = hist[i].setAt; }
    else { inWindow.push(hist[i]); }
  }

  var stops = [];
  var segStart = carryInSetAt; // true start time of the currently-running segment (may be before windowStart)
  var currentState = carryInState;
  inWindow.forEach(function(h) {
    var color = colors[currentState] || neutralColor;
    if (CONFUSION_FADE_STATES[currentState] && h.state == null) { pushClosedFade(stops, color, segStart, h.setAt); }
    else { pushFlat(stops, color, segStart, h.setAt); }
    segStart = h.setAt;
    currentState = h.state;
  });
  var finalColor = colors[currentState] || neutralColor;
  if (CONFUSION_FADE_STATES[currentState]) { pushOpenFade(stops, finalColor, segStart); }
  else { pushFlat(stops, finalColor, segStart, windowEnd); }

  if (stops.length === 0) { return neutralColor; }
  return "linear-gradient(to right, " + stops.join(", ") + ")";
}

// Thin wrapper preserving the original rolling-window call shape used by the
// student's own sparkline.
function buildConfusionSparklineGradient(history, now, windowMs, colors, neutralColor) {
  return buildConfusionGradient(history, now - windowMs, now, colors, neutralColor);
}

function renderConfusionSparkline(history) {
  if (!confusionSparkline) { return; }
  confusionSparkline.style.background = buildConfusionSparklineGradient(
    history, Date.now(), CONFUSION_SPARKLINE_WINDOW_MS, CONFUSION_COLORS, "var(--confusion-none-color)"
  );
}

function initConfusionIndicator() {
  if (unsubOwnConfusion) { unsubOwnConfusion(); unsubOwnConfusion = null; }
  if (confusionSparklineInterval) { clearInterval(confusionSparklineInterval); confusionSparklineInterval = null; }
  if (confusionPromptInterval) { clearInterval(confusionPromptInterval); confusionPromptInterval = null; }
  if (!currentStudentId || !currentBoardId) { return; }

  var myConfusionState = null;
  var myConfusionSetAt = null;
  var latestConfusionHistory = [];
  var autoResolvedFor = null; // "<state>@<setAtMs>" guard so the periodic re-check can't double-write the resolve

  confusionGreenBtn.onclick = function() { playPop(); setMyConfusionState("green"); };
  confusionOrangeBtn.onclick = function() { playPop(); setMyConfusionState(myConfusionState === "orange" ? null : "orange"); };
  confusionRedBtn.onclick = function() { playPop(); setMyConfusionState(myConfusionState === "red" ? null : "red"); };
  confusionPromptYesBtn.onclick = function() {
    confusionPrompt.classList.add("hidden");
    setMyConfusionState(myConfusionState); // re-set the same state with a fresh setAt -- fully resets the clock
  };
  confusionPromptNoBtn.onclick = function() {
    confusionPrompt.classList.add("hidden"); // dismiss only -- the fade is already on schedule regardless
  };

  function checkConfusionFadeStage() {
    var stage = getConfusionFadeStage(myConfusionState, myConfusionSetAt, Date.now());
    if (stage === "prompting") {
      confusionPromptText.textContent = myConfusionState === "red" ? "Are you still confused?" : "Still somewhat confused?";
      confusionPrompt.classList.remove("hidden");
    } else {
      confusionPrompt.classList.add("hidden");
    }
    if (stage === "resolved") {
      var key = myConfusionState + "@" + myConfusionSetAt;
      if (autoResolvedFor !== key) { autoResolvedFor = key; setMyConfusionState(null); }
    }
    applyConfusionVisual(confusionRedBtn, myConfusionState === "red" ? "red" : null, myConfusionSetAt, CONFUSION_FADE_START_MS, CONFUSION_FADE_DURATION_MS);
    applyConfusionVisual(confusionOrangeBtn, myConfusionState === "orange" ? "orange" : null, myConfusionSetAt, CONFUSION_FADE_START_MS, CONFUSION_FADE_DURATION_MS);
  }

  unsubOwnConfusion = onSnapshot(doc(db, "boards", currentBoardId, "students", currentStudentId), function(d) {
    if (!d.exists()) { return; }
    var data = d.data();
    myConfusionState = data.confusionState || null;
    myConfusionSetAt = data.confusionSetAt || null;
    confusionGreenBtn.classList.toggle("confusion-active", myConfusionState === "green");
    confusionOrangeBtn.classList.toggle("confusion-active", myConfusionState === "orange");
    confusionRedBtn.classList.toggle("confusion-active", myConfusionState === "red");
    applyConfusionVisual(confusionGreenBtn, myConfusionState === "green" ? "green" : null, myConfusionSetAt);
    checkConfusionFadeStage();
    latestConfusionHistory = data.confusionHistory || [];
    renderConfusionSparkline(latestConfusionHistory);
  });
  // The sparkline's right edge represents "now," and the prompt/fade stage
  // both keep advancing even without a new confusion-state write -- redraw
  // on a timer too, not just on each Firestore snapshot, so both stay live.
  confusionSparklineInterval = setInterval(function() { renderConfusionSparkline(latestConfusionHistory); }, 15000);
  confusionPromptInterval = setInterval(checkConfusionFadeStage, 15000);
}

// ─── SEATING MAP (teacher-only sandbox) ─────────────────────────────────────

var seatPopupOutsideClickHandler = null;

function closeSeatPopup() {
  var existing = document.querySelector(".seat-popup");
  if (existing) { existing.remove(); }
  openSeatPopupId = null;
  if (seatPopupOutsideClickHandler) {
    document.removeEventListener("click", seatPopupOutsideClickHandler);
    seatPopupOutsideClickHandler = null;
  }
}

function loadSeatingMap() {
  if (unsubSeats) { unsubSeats(); unsubSeats = null; }
  if (!currentBoardId) { return; }
  seatCanvas.innerHTML = "";
  closeSeatPopup();
  seatingStudentsCache = {};
  seatingSeatsCache = [];
  renderSeatMapModeBar();

  var unsubStudentsLocal = onSnapshot(collection(db, "boards", currentBoardId, "students"), function(snap) {
    var map = {};
    snap.forEach(function(d) { map[d.id] = Object.assign({ id: d.id }, d.data()); });
    seatingStudentsCache = map;
    if (!draggingSeatId) { renderSeats(); }
    refreshOpenSeatPopup();
  });
  var unsubSeatsLocal = onSnapshot(collection(db, "boards", currentBoardId, "seats"), function(snap) {
    var list = [];
    snap.forEach(function(d) { list.push(Object.assign({ id: d.id }, d.data())); });
    seatingSeatsCache = list;
    if (!draggingSeatId) { renderSeats(); }
    refreshOpenSeatPopup();
  });
  var unsubResponsePollLocal = null;
  if (seatMapResponsePollId) {
    unsubResponsePollLocal = onSnapshot(doc(db, "boards", currentBoardId, "polls", seatMapResponsePollId), function(ds) {
      seatMapResponsePollData = ds.exists() ? ds.data() : null;
      renderSeats();
      refreshOpenSeatPopup();
    });
  }
  unsubSeats = function() {
    unsubStudentsLocal();
    unsubSeatsLocal();
    if (unsubResponsePollLocal) { unsubResponsePollLocal(); }
  };
}

// Mode banner shown above the seat grid while reviewing a specific poll's
// responses, so the teacher can tell this isn't the live confusion view.
function renderSeatMapModeBar() {
  var existing = document.getElementById("seatModeBar");
  if (existing) { existing.remove(); }
  if (!seatMapResponsePollId) { return; }
  var bar = document.createElement("div");
  bar.id = "seatModeBar";
  bar.className = "seat-mode-bar";
  var label = document.createElement("span");
  var labelIcon = document.createElement("span");
  labelIcon.innerHTML = ICONS.seat; // trusted, static, hardcoded -- safe as innerHTML
  label.appendChild(labelIcon);
  // The poll question is teacher-authored text -- append as a text node, not
  // via innerHTML, so it stays exactly as inert as it was before this change.
  label.appendChild(document.createTextNode(" Viewing responses: " + (seatMapResponsePollQuestion || "this poll")));
  bar.appendChild(label);
  var backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "teacher-control";
  backBtn.textContent = "← Back to confusion view";
  backBtn.onclick = function() {
    seatMapResponsePollId = null;
    seatMapResponsePollQuestion = "";
    seatMapResponsePollData = null;
    loadSeatingMap();
  };
  bar.appendChild(backBtn);
  seatCanvas.parentNode.insertBefore(bar, seatCanvas);
}

function studentRespondedToPoll(poll, studentUsername) {
  if (!poll) { return false; }
  if (poll.type === "mc") { return (poll.voters || []).indexOf(studentUsername) !== -1; }
  return (poll.history || []).some(function(h) { return h.username === studentUsername; });
}

function renderSeats() {
  seatCanvas.innerHTML = "";
  seatingSeatsCache.forEach(function(seat) {
    var student = seat.studentId ? seatingStudentsCache[seat.studentId] : null;
    var editable = !seatMapResponsePollId;
    var el = document.createElement("div");
    el.className = "seat" + (student ? "" : " seat-unassigned") + (editable ? "" : " seat-view-only");
    el.style.left = (seat.x != null ? seat.x : 50) + "%";
    el.style.top = (seat.y != null ? seat.y : 50) + "%";
    el.dataset.seatId = seat.id;

    if (student) {
      var iconLine = document.createElement("span");
      iconLine.className = "seat-icon-line";
      iconLine.textContent = student.emoji ? student.emoji : (student.username ? student.username.charAt(0).toUpperCase() : "?");
      el.appendChild(iconLine);
      var nameLine = document.createElement("span");
      nameLine.className = "seat-name-line";
      nameLine.textContent = (student.username || "").split(" ")[0];
      el.appendChild(nameLine);
      el.title = student.username || "";
      if (seatMapResponsePollId) {
        var responded = studentRespondedToPoll(seatMapResponsePollData, student.username);
        el.style.transition = "";
        el.style.backgroundColor = responded ? CONFUSION_COLORS.green : CONFUSION_COLORS.red;
      } else {
        applyConfusionVisualForState(el, student.confusionState, student.confusionSetAt);
      }
    } else {
      el.textContent = "+";
      el.title = "Unassigned seat";
    }

    var delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "seat-delete";
    delBtn.textContent = "✕";
    delBtn.title = "Delete seat";
    (function(seatId) {
      delBtn.onclick = async function(e) {
        e.stopPropagation();
        if (!confirm("Delete this seat?")) { return; }
        await deleteDoc(doc(db, "boards", currentBoardId, "seats", seatId));
        if (openSeatPopupId === seatId) { closeSeatPopup(); }
      };
    })(seat.id);
    el.appendChild(delBtn);

    wireSeatDrag(el, seat, editable);
    seatCanvas.appendChild(el);
  });
}

// apple-design §9 rubber-banding: the further past the bound, the less the
// value follows. `value` and bounds are in the same unit (here, percent).
function rubberBandOvershoot(overshoot, dimension, constant) {
  if (constant === undefined) { constant = 0.55; }
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function clampWithRubberBand(value, min, max) {
  var range = max - min;
  if (value < min) { return min + rubberBandOvershoot(value - min, range); }
  if (value > max) { return max + rubberBandOvershoot(value - max, range); }
  return value;
}

function wireSeatDrag(el, seat, editable) {
  var dragging = false;
  var moved = false;
  var startClientX = 0, startClientY = 0;

  el.addEventListener("pointerdown", function(e) {
    if (e.target === el.querySelector(".seat-delete")) { return; }
    e.preventDefault();
    dragging = true;
    moved = false;
    draggingSeatId = seat.id;
    startClientX = e.clientX;
    startClientY = e.clientY;
    el.classList.add("seat-dragging");
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener("pointermove", function(e) {
    // Non-editable contexts (reviewing a poll's responses, or any view-only
    // rendering) never persist a drag -- skip the whole repositioning step so
    // `moved` can never flip true, and endDrag's existing click-vs-drag
    // branch below treats every interaction here as a click.
    if (!dragging || !editable) { return; }
    var dx = e.clientX - startClientX;
    var dy = e.clientY - startClientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { moved = true; }
    var rect = seatCanvas.getBoundingClientRect();
    var rawX = ((e.clientX - rect.left) / rect.width) * 100;
    var rawY = ((e.clientY - rect.top) / rect.height) * 100;
    // apple-design §9: resist progressively past the boundary instead of a
    // hard stop -- real things slow down before they stop, they don't freeze
    var pctX = clampWithRubberBand(rawX, 2, 98);
    var pctY = clampWithRubberBand(rawY, 2, 98);
    el.style.left = pctX + "%";
    el.style.top = pctY + "%";
    el.dataset.pendingX = pctX;
    el.dataset.pendingY = pctY;
  });

  function endDrag(e) {
    if (!dragging) { return; }
    dragging = false;
    el.classList.remove("seat-dragging");
    draggingSeatId = null;
    var finalX = el.dataset.pendingX !== undefined ? parseFloat(el.dataset.pendingX) : seat.x;
    var finalY = el.dataset.pendingY !== undefined ? parseFloat(el.dataset.pendingY) : seat.y;
    // Snap back inside the sandbox if the rubber-band let it overshoot.
    finalX = Math.max(2, Math.min(98, finalX));
    finalY = Math.max(2, Math.min(98, finalY));
    el.style.transition = "left 200ms cubic-bezier(0.23, 1, 0.32, 1), top 200ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.left = finalX + "%";
    el.style.top = finalY + "%";
    if (moved) {
      updateDoc(doc(db, "boards", currentBoardId, "seats", seat.id), { x: finalX, y: finalY }).then(function() {
        renderSeats();
      });
    } else {
      seatPopupOpenedByHover = false;
      openSeatPopup(seat.id);
    }
  }

  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
}

function refreshOpenSeatPopup() {
  if (openSeatPopupId) { openSeatPopup(openSeatPopupId); }
}

function positionSeatPopup(popup, seatId, canvasEl) {
  document.body.appendChild(popup);
  var seatEl = canvasEl.querySelector('[data-seat-id="' + seatId + '"]');
  if (seatEl) {
    var r = seatEl.getBoundingClientRect();
    var popupWidth = 240;
    var left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - popupWidth - 16);
    left = Math.max(16, left);
    popup.style.left = left + "px";
    popup.style.top = (window.scrollY + r.bottom + 10) + "px";
    // apple-design §7: scale the popup in from the seat that opened it,
    // not from its own center -- keeps the spatial link between trigger and content
    var seatCenterX = window.scrollX + r.left + r.width / 2;
    var originXPct = Math.max(10, Math.min(90, ((seatCenterX - left) / popupWidth) * 100));
    popup.style.setProperty("--seat-popup-origin", originXPct + "% 0%");
  }
  setTimeout(function() {
    seatPopupOutsideClickHandler = function(e) {
      if (!popup.contains(e.target) && !canvasEl.contains(e.target)) { closeSeatPopup(); }
    };
    document.addEventListener("click", seatPopupOutsideClickHandler);
  }, 0);
  // If this popup was opened by hovering, moving the mouse from the seat
  // onto the popup itself (to use its dropdown/delete button, or a draw
  // response's lightbox image) must not immediately close it.
  popup.addEventListener("mouseleave", function(e) {
    if (!seatPopupOpenedByHover || openSeatPopupId !== seatId) { return; }
    var seatEl2 = canvasEl.querySelector('[data-seat-id="' + seatId + '"]');
    if (seatEl2 && e.relatedTarget && seatEl2.contains(e.relatedTarget)) { return; }
    closeSeatPopup();
    hoveredSeatId = null;
  });
}

// Delegates hover on a stable canvas element (never destroyed, only its
// children are, on every Firestore snapshot) rather than wiring
// mouseenter/mouseleave per seat -- per-seat listeners would get silently
// orphaned the moment renderSeats() rebuilds the seat nodes under a
// stationary pointer.
function wireSeatHoverDelegation(canvasEl, openPopupFn) {
  if (!canvasEl || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }
  canvasEl.addEventListener("mouseover", function(e) {
    var seatEl = e.target.closest(".seat");
    if (!seatEl || seatEl.dataset.seatId === hoveredSeatId) { return; }
    hoveredSeatId = seatEl.dataset.seatId;
    seatPopupOpenedByHover = true;
    openPopupFn(hoveredSeatId);
  });
  canvasEl.addEventListener("mouseout", function(e) {
    var seatEl = e.target.closest(".seat");
    if (!seatEl) { return; }
    var goingTo = e.relatedTarget;
    var popupEl = document.querySelector(".seat-popup");
    if (goingTo && (seatEl.contains(goingTo) || (popupEl && popupEl.contains(goingTo)))) { return; }
    if (hoveredSeatId === seatEl.dataset.seatId) { hoveredSeatId = null; }
    if (seatPopupOpenedByHover && openSeatPopupId === seatEl.dataset.seatId) { closeSeatPopup(); }
  });
}

// Cursor-tracked "spotlight" on the major interactive cards: a single
// delegated, rAF-throttled pointermove listener (not one per card, and not
// re-wired on every post/poll/seat rebuild) writes --glow-x/--glow-y custom
// properties that each card's own ::before radial-gradient reads (see
// style.css). Skipped entirely on touch (no persistent hover/cursor to
// track, matching wireSeatHoverDelegation's own guard above) and under
// prefers-reduced-motion (this is a continuous per-frame JS loop, not a CSS
// transition, so the global reduced-motion CSS catch-all doesn't cover it).
function wireMotionGlow(selector) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
  var activeEl = null;
  var pendingEvent = null;
  var frameQueued = false;
  function processFrame() {
    frameQueued = false;
    var e = pendingEvent;
    if (!e) { return; }
    var el = e.target.closest(selector);
    if (el !== activeEl) {
      if (activeEl) { activeEl.classList.remove("motion-glow-active"); }
      activeEl = el;
      if (activeEl) { activeEl.classList.add("motion-glow-active"); }
    }
    if (activeEl) {
      var rect = activeEl.getBoundingClientRect();
      activeEl.style.setProperty("--glow-x", ((e.clientX - rect.left) / rect.width * 100) + "%");
      activeEl.style.setProperty("--glow-y", ((e.clientY - rect.top) / rect.height * 100) + "%");
    }
  }
  document.addEventListener("pointermove", function(e) {
    pendingEvent = e;
    if (!frameQueued) { frameQueued = true; requestAnimationFrame(processFrame); }
  });
  // pointerout bubbles (unlike pointerleave) and fires with relatedTarget
  // null when the pointer leaves the browser viewport entirely.
  document.addEventListener("pointerout", function(e) {
    if (!e.relatedTarget && activeEl) { activeEl.classList.remove("motion-glow-active"); activeEl = null; }
  });
}
wireMotionGlow(".post, .poll, .confusion-btn, .seat");

function getStudentMCResponseText(poll, studentUsername) {
  var options = poll.options || [];
  if (poll.requireAllCorrect) {
    var set = new Set();
    (poll.history || []).forEach(function(h) {
      if (h.username !== studentUsername) { return; }
      var resp = h.response || "";
      if (resp.indexOf("Voted: ") === 0) {
        var idx = options.indexOf(resp.slice(7));
        if (idx !== -1) { set.add(idx); }
      } else if (resp.indexOf("Removed vote: ") === 0) {
        var idx = options.indexOf(resp.slice(14));
        if (idx !== -1) { set.delete(idx); }
      }
    });
    var picked = Array.from(set).sort(function(a, b) { return a - b; }).map(function(idx) { return options[idx]; });
    return picked.length ? picked.join(", ") : "(no current selection)";
  }
  var lastIdx = null;
  (poll.history || []).forEach(function(h) {
    if (h.username !== studentUsername) { return; }
    var resp = h.response || "";
    if (resp.indexOf("Changed vote: ") === 0) {
      var toSep = resp.indexOf(" to ");
      var optText = toSep === -1 ? "" : resp.slice(toSep + 4);
      var idx = options.indexOf(optText);
      if (idx !== -1) { lastIdx = idx; }
    } else if (resp.indexOf("Voted: ") === 0) {
      var idx = options.indexOf(resp.slice(7));
      if (idx !== -1) { lastIdx = idx; }
    } else if (resp.indexOf("Removed vote: ") === 0) {
      lastIdx = null;
    }
  });
  return lastIdx !== null ? options[lastIdx] : "(no current selection)";
}

function renderSeatResponsePopup(seatId, student) {
  var popup = document.createElement("div");
  popup.className = "seat-popup";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "seat-popup-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = function() { closeSeatPopup(); };
  popup.appendChild(closeBtn);

  var title = document.createElement("h4");
  title.textContent = student ? (student.nickname || student.username) : "Unassigned seat";
  popup.appendChild(title);

  if (!student) {
    var empty = document.createElement("div");
    empty.className = "confusion-timeline-empty";
    empty.textContent = "No student assigned to this seat.";
    popup.appendChild(empty);
  } else {
    var poll = seatMapResponsePollData;
    var responded = studentRespondedToPoll(poll, student.username);
    var statusLine = document.createElement("div");
    statusLine.className = "seat-popup-meta";
    statusLine.textContent = responded ? "✅ Responded" : "❌ No response yet";
    popup.appendChild(statusLine);

    if (responded && poll) {
      var entries = (poll.history || []).filter(function(h) { return h.username === student.username; });
      if (poll.type === "mc") {
        var respDiv = document.createElement("div");
        respDiv.className = "seat-response-text";
        respDiv.textContent = getStudentMCResponseText(poll, student.username);
        popup.appendChild(respDiv);
      } else if (poll.type === "free") {
        var last = entries[entries.length - 1];
        var respDiv = document.createElement("div");
        respDiv.className = "seat-response-text";
        respDiv.textContent = last ? last.response : "";
        popup.appendChild(respDiv);
      } else if (poll.type === "draw") {
        var lastImg = entries.filter(function(e) { return e.imageUrl; }).slice(-1)[0];
        if (lastImg) {
          // Legacy (pre-pixel-grid-rework) submission -- still an uploaded image.
          var img = document.createElement("img");
          img.className = "seat-response-thumb";
          img.src = lastImg.imageUrl;
          (function(url) { img.onclick = function() { showImageLightbox(url); }; })(lastImg.imageUrl);
          popup.appendChild(img);
        } else {
          // New-format drawing lives in its own subcollection doc, so this
          // popup must stay synchronous (positionSeatPopup below is what
          // actually attaches it to the DOM and wires its hover/outside-click
          // close handlers -- an inline await here would delay the popup's
          // very existence on every hover transition across seats). Fetch
          // and append fire-and-forget once the popup is already live.
          (function(pid, uname, popupEl) {
            (async function() {
              var q = query(collection(db, "boards", currentBoardId, "polls", pid, "drawings"), where("username", "==", uname));
              var snap = await getDocs(q);
              if (snap.empty) { return; }
              var canvasEl = document.createElement("canvas");
              canvasEl.className = "seat-response-thumb";
              var pixels = snap.docs[snap.docs.length - 1].data().pixels;
              renderPixelGridToCanvas(canvasEl, pixels);
              (function(px) { canvasEl.onclick = function() { showPixelArtLightbox(px); }; })(pixels);
              popupEl.appendChild(canvasEl);
            })();
          })(seatMapResponsePollId, student.username, popup);
        }
      }
    }
  }

  positionSeatPopup(popup, seatId, seatCanvas);
}

function openSeatPopup(seatId) {
  closeSeatPopup();
  var seat = seatingSeatsCache.filter(function(s) { return s.id === seatId; })[0];
  if (!seat) { return; }
  openSeatPopupId = seatId;
  var student = seat.studentId ? seatingStudentsCache[seat.studentId] : null;

  if (seatMapResponsePollId) {
    renderSeatResponsePopup(seatId, student);
    return;
  }

  var unassignedStudents = Object.keys(seatingStudentsCache)
    .map(function(id) { return seatingStudentsCache[id]; })
    .filter(function(s) {
      var takenByOtherSeat = seatingSeatsCache.some(function(s2) { return s2.studentId === s.id && s2.id !== seatId; });
      return !takenByOtherSeat;
    });

  var popup = document.createElement("div");
  popup.className = "seat-popup";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "seat-popup-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = function() { closeSeatPopup(); };
  popup.appendChild(closeBtn);

  var title = document.createElement("h4");
  title.textContent = student ? (student.nickname || student.username) : "Unassigned seat";
  popup.appendChild(title);

  if (student) {
    var meta = document.createElement("div");
    meta.className = "seat-popup-meta";
    meta.textContent = "@" + student.username;
    popup.appendChild(meta);

    var hist = (student.confusionHistory || []).slice(-24);
    if (hist.length) {
      var timeline = document.createElement("div");
      timeline.className = "confusion-timeline";
      hist.forEach(function(h) {
        var tick = document.createElement("div");
        tick.className = "tick " + (h.state === "red" ? "red" : h.state === "orange" ? "orange" : "green");
        tick.title = new Date(h.setAt).toLocaleString();
        timeline.appendChild(tick);
      });
      popup.appendChild(timeline);
    } else {
      var empty = document.createElement("div");
      empty.className = "confusion-timeline-empty";
      empty.textContent = "No confusion reports yet this class.";
      popup.appendChild(empty);
    }
  }

  var select = document.createElement("select");
  var blankOpt = document.createElement("option");
  blankOpt.value = "";
  blankOpt.textContent = "— Unassigned —";
  select.appendChild(blankOpt);
  unassignedStudents.forEach(function(s) {
    var opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.nickname || s.username;
    if (student && s.id === student.id) { opt.selected = true; }
    select.appendChild(opt);
  });
  if (!student) { blankOpt.selected = true; }
  select.onchange = async function() {
    await updateDoc(doc(db, "boards", currentBoardId, "seats", seatId), { studentId: select.value || null });
  };
  popup.appendChild(select);

  var delSeatBtn = document.createElement("button");
  delSeatBtn.type = "button";
  delSeatBtn.className = "teacher-control";
  delSeatBtn.innerHTML = iconLabel("trash", "Delete Seat");
  delSeatBtn.onclick = async function() {
    if (!confirm("Delete this seat?")) { return; }
    await deleteDoc(doc(db, "boards", currentBoardId, "seats", seatId));
    closeSeatPopup();
  };
  popup.appendChild(delSeatBtn);

  positionSeatPopup(popup, seatId, seatCanvas);
}

wireSeatHoverDelegation(seatCanvas, openSeatPopup);

// ─── DAILY DASHBOARD: read-only mini seating widget ─────────────────────────
// Always confusion-mode (never poll-filtered) and never editable -- a
// deliberately separate, simpler set of functions rather than generalizing
// renderSeats()/openSeatPopup(), matching this codebase's existing pattern of
// sibling near-duplicate render functions (renderFreePoll/renderMCPoll/
// renderDrawPoll) over one more complex, more widely-shared one.

function loadDashboardSeatMap() {
  if (unsubDashSeats) { unsubDashSeats(); unsubDashSeats = null; }
  if (classTimelineRedrawInterval) { clearInterval(classTimelineRedrawInterval); classTimelineRedrawInterval = null; }
  if (!currentBoardId || !dailySeatMapCanvasEl) { return; }
  var unsubStudentsLocal = onSnapshot(collection(db, "boards", currentBoardId, "students"), function(snap) {
    var map = {};
    snap.forEach(function(d) { map[d.id] = Object.assign({ id: d.id }, d.data()); });
    dashSeatStudentsCache = map;
    renderDashboardSeatMap();
    renderClassConfusionTimelineRows();
  });
  var unsubSeatsLocal = onSnapshot(collection(db, "boards", currentBoardId, "seats"), function(snap) {
    var list = [];
    snap.forEach(function(d) { list.push(Object.assign({ id: d.id }, d.data())); });
    dashSeatSeatsCache = list;
    renderDashboardSeatMap();
  });
  unsubDashSeats = function() { unsubStudentsLocal(); unsubSeatsLocal(); };
  // Each row's "now" edge keeps advancing even without new student data --
  // redraw on a timer too, matching the student sparkline's 15s cadence.
  classTimelineRedrawInterval = setInterval(renderClassConfusionTimelineRows, 15000);
}

// One thin horizontal bar per student, time-proportional over the current
// class session window [classSessionStartAt, classSessionEndAt || now] --
// uses the exact same buildConfusionGradient() the student's own sparkline
// uses, so both visualize red/orange fading identically.
function renderClassConfusionTimelineRows() {
  if (!classConfusionTimelineEl) { return; }
  var windowStart = classSessionStartAt || 0;
  var windowEnd = classSessionEndAt || Date.now();
  var students = Object.keys(dashSeatStudentsCache).map(function(id) { return dashSeatStudentsCache[id]; });
  students.sort(function(a, b) { return (a.username || "").localeCompare(b.username || ""); });
  classConfusionTimelineEl.innerHTML = "";
  students.forEach(function(student) {
    var row = document.createElement("div");
    row.className = "class-confusion-timeline-row";
    row.title = student.nickname || student.username || "";
    row.style.background = buildConfusionGradient(student.confusionHistory, windowStart, windowEnd, CONFUSION_COLORS, "var(--confusion-none-color)");
    classConfusionTimelineEl.appendChild(row);
  });
}

function renderDashboardSeatMap() {
  if (!dailySeatMapCanvasEl) { return; }
  dailySeatMapCanvasEl.innerHTML = "";
  if (dashSeatSeatsCache.length === 0) {
    var empty = document.createElement("div");
    empty.className = "confusion-timeline-empty";
    empty.style.textAlign = "center";
    empty.style.padding = "40px 8px";
    empty.textContent = "No seats configured yet — set them up from Seats";
    dailySeatMapCanvasEl.appendChild(empty);
    return;
  }
  dashSeatSeatsCache.forEach(function(seat) {
    var student = seat.studentId ? dashSeatStudentsCache[seat.studentId] : null;
    var el = document.createElement("div");
    el.className = "seat seat-mini seat-view-only" + (student ? "" : " seat-unassigned");
    el.style.left = (seat.x != null ? seat.x : 50) + "%";
    el.style.top = (seat.y != null ? seat.y : 50) + "%";
    el.dataset.seatId = seat.id;
    if (student) {
      var iconLine = document.createElement("span");
      iconLine.className = "seat-icon-line";
      iconLine.textContent = student.emoji ? student.emoji : (student.username ? student.username.charAt(0).toUpperCase() : "?");
      el.appendChild(iconLine);
      el.title = student.username || "";
      applyConfusionVisualForState(el, student.confusionState, student.confusionSetAt);
    } else {
      el.textContent = "+";
      el.title = "Unassigned seat";
    }
    dailySeatMapCanvasEl.appendChild(el);
  });
}

function renderConfusionDetailPopup(seatId, student) {
  closeSeatPopup();
  openSeatPopupId = seatId;
  var popup = document.createElement("div");
  popup.className = "seat-popup";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "seat-popup-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = function() { closeSeatPopup(); };
  popup.appendChild(closeBtn);

  var title = document.createElement("h4");
  title.textContent = student ? (student.nickname || student.username) : "Unassigned seat";
  popup.appendChild(title);

  if (student) {
    var meta = document.createElement("div");
    meta.className = "seat-popup-meta";
    meta.textContent = "@" + student.username;
    popup.appendChild(meta);

    var hist = (student.confusionHistory || []).slice(-24);
    if (hist.length) {
      var timeline = document.createElement("div");
      timeline.className = "confusion-timeline";
      hist.forEach(function(h) {
        var tick = document.createElement("div");
        tick.className = "tick " + (h.state === "red" ? "red" : h.state === "orange" ? "orange" : "green");
        tick.title = new Date(h.setAt).toLocaleString();
        timeline.appendChild(tick);
      });
      popup.appendChild(timeline);
    } else {
      var empty = document.createElement("div");
      empty.className = "confusion-timeline-empty";
      empty.textContent = "No confusion reports yet this class.";
      popup.appendChild(empty);
    }
  }

  positionSeatPopup(popup, seatId, dailySeatMapCanvasEl);
}

function openDashboardSeatPopup(seatId) {
  var seat = dashSeatSeatsCache.filter(function(s) { return s.id === seatId; })[0];
  if (!seat) { return; }
  var student = seat.studentId ? dashSeatStudentsCache[seat.studentId] : null;
  renderConfusionDetailPopup(seatId, student);
}

if (dailySeatMapCanvasEl) {
  dailySeatMapCanvasEl.addEventListener("click", function(e) {
    var seatEl = e.target.closest(".seat");
    if (!seatEl) { return; }
    seatPopupOpenedByHover = false;
    openDashboardSeatPopup(seatEl.dataset.seatId);
  });
  wireSeatHoverDelegation(dailySeatMapCanvasEl, openDashboardSeatPopup);
}

postImageBtn.onclick = function() { postImageInput.click(); };
postImageInput.onchange = function(e) {
  var file = e.target.files[0];
  if (!file) { return; }
  if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
  postImageFile = file;
  showImagePreview(file, postImagePreview, function() { postImageFile = null; postImagePreview.innerHTML = ""; postImageInput.value = ""; });
};

postBtn.onclick = async function() {
  if (isDisplayMode) { return; }
  var text = postInput.value.trim();
  if (!text && !postImageFile) { alert("Please enter text or attach an image."); return; }
  var anonymous = document.getElementById("anonymousToggle") ? document.getElementById("anonymousToggle").checked : false;
  var imageUrl = null;
  if (postImageFile) { imageUrl = await uploadImage(postImageFile, "boards/" + currentBoardId + "/posts"); }
  playWhoosh();
  await addDoc(collection(db, "boards", currentBoardId, "posts"), {
    author: username, text: text, anonymous: anonymous, imageUrl: imageUrl,
    upvotes: 0, upvoters: [], upvoteHistory: [], timestamp: serverTimestamp()
  });
  if (currentStudentId) { await incrementStudentStat(currentStudentId, "comments"); }
  postInput.value = "";
  postImageFile = null;
  postImagePreview.innerHTML = "";
  postImageInput.value = "";
  if (document.getElementById("anonymousToggle")) { document.getElementById("anonymousToggle").checked = false; }
  document.getElementById("newPost").classList.remove("comment-expanded");
  document.getElementById("newPost").classList.add("comment-collapsed");
};

sortSelect.onchange = function() { sortMode = sortSelect.value; loadPosts(); };

function createPopcornConfetti(el) {
  for (var i = 0; i < 6; i++) {
    var p = document.createElement("span");
    p.textContent = "🍿";
    var rect = el.getBoundingClientRect();
    p.style.cssText = "position:fixed;left:" + rect.left + "px;top:" + rect.top + "px;font-size:16px;opacity:1;transition:all 0.8s ease-out;pointer-events:none;z-index:9999;";
    document.body.appendChild(p);
    var x = (Math.random() - 0.5) * 60;
    var y = -Math.random() * 60 - 20;
    (function(el2, xv, yv) {
      requestAnimationFrame(function() {
        el2.style.transform = "translate(" + xv + "px," + yv + "px) rotate(" + Math.round(Math.random() * 360) + "deg)";
        el2.style.opacity = 0;
      });
      setTimeout(function() { el2.remove(); }, 800);
    })(p, x, y);
  }
}

function triggerPopcornConfetti() {
  var count = 60;
  for (var i = 0; i < count; i++) {
    (function(index) {
      setTimeout(function() {
        var p = document.createElement("span");
        p.textContent = "🍿";
        var startX = Math.random() * window.innerWidth;
        var size = 14 + Math.random() * 18;
        var duration = 2000 + Math.random() * 1500;
        var drift = (Math.random() - 0.5) * 200;
        p.style.position = "fixed";
        p.style.left = startX + "px";
        p.style.top = "-50px";
        p.style.fontSize = size + "px";
        p.style.pointerEvents = "none";
        p.style.zIndex = "99999";
        p.style.opacity = "1";
        document.body.appendChild(p);

        var start = null;
        function animate(ts) {
          if (!start) { start = ts; }
          var elapsed = ts - start;
          var progress = elapsed / duration;
          if (progress >= 1) {
            p.remove();
            return;
          }
          p.style.top = (-50 + (window.innerHeight + 100) * progress) + "px";
          p.style.left = (startX + drift * progress) + "px";
          p.style.transform = "rotate(" + (progress * 360 * (Math.random() > 0.5 ? 1 : -1)) + "deg)";
          if (progress > 0.75) { p.style.opacity = String(1 - ((progress - 0.75) / 0.25)); }
          requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      }, index * 40);
    })(i);
  }
}

function pulseEmojiRing() {
  var circle = document.getElementById("emojiCircle");
  if (!circle) { return; }
  var ring = document.createElement("div");
  ring.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) scale(1);width:56px;height:56px;border-radius:50%;border:2px solid var(--accent);opacity:0.8;pointer-events:none;z-index:10;transition:transform 0.6s ease-out,opacity 0.6s ease-out;";
  circle.style.position = "relative";
  circle.appendChild(ring);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      ring.style.transform = "translate(-50%,-50%) scale(2.2)";
      ring.style.opacity = "0";
    });
  });
  setTimeout(function() { ring.remove(); }, 700);
}

function animateScoreCount(el, from, to) {
  var duration = 800;
  var start = null;
  function step(ts) {
    if (!start) { start = ts; }
    var progress = Math.min((ts - start) / duration, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    var current = from + (to - from) * eased;
    el.textContent = parseFloat(current.toFixed(1)) + " pt";
    if (progress < 1) { requestAnimationFrame(step); }
    else { el.textContent = parseFloat(to.toFixed(1)) + " pt"; }
  }
  requestAnimationFrame(step);
}

function showMedalCelebration(medal) {
  // Small delay so it appears after confetti starts
  setTimeout(function() {
    var el = document.createElement("div");
    el.textContent = medal;
    el.style.cssText = [
      "position:fixed",
      "top:50%",
      "left:50%",
      "transform:translate(-50%,-50%) scale(0) rotate(-20deg)",
      "font-size:12rem",
      "line-height:1",
      "z-index:99990",
      "pointer-events:none",
      "opacity:0",
      "filter:drop-shadow(0 8px 32px rgba(0,0,0,0.4))",
      "transition:transform 0.55s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s ease"
    ].join(";");
    document.body.appendChild(el);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.transform = "translate(-50%,-50%) scale(1) rotate(0deg)";
        el.style.opacity = "1";
      });
    });

    setTimeout(function() {
      el.style.transition = "transform 0.45s cubic-bezier(0.4,0,1,1),opacity 0.45s ease";
      el.style.transform = "translate(-50%,-50%) scale(0.2) rotate(15deg)";
      el.style.opacity = "0";
      setTimeout(function() { el.remove(); }, 500);
    }, 2000);
  }, 300);
}

function showStreakBadge(streak) {
  var existing = document.getElementById("streakBadge");
  if (existing) { existing.remove(); }
  var badge = document.createElement("div");
  badge.id = "streakBadge";
  badge.textContent = "🔥 " + streak + " Streak!";
  badge.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%) scale(0.5);background:linear-gradient(135deg,#ff6b00,#ff3b00);color:white;font-size:1.3rem;font-weight:800;padding:12px 28px;border-radius:999px;z-index:99999;opacity:0;pointer-events:none;box-shadow:0 8px 32px rgba(255,80,0,0.4);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;";
  document.body.appendChild(badge);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      badge.style.transform = "translateX(-50%) scale(1)";
      badge.style.opacity = "1";
    });
  });
  setTimeout(function() {
    badge.style.transform = "translateX(-50%) scale(0.8)";
    badge.style.opacity = "0";
    setTimeout(function() { badge.remove(); }, 400);
  }, 2500);
}

function startSheenAnimation(el, type) {
  var configs = {
    gold:   { base: "#f9a825", mid: "#ffd700", sheen: "#fff8c0", duration: 6000 },
    silver: { base: "#9e9e9e", mid: "#c0c0c0", sheen: "#f0f0f0", duration: 7000 },
    bronze: { base: "#b5651d", mid: "#cd7f32", sheen: "#f0c080", duration: 8000 }
  };
  var c = configs[type];
  var start = null;
  var cancelled = false;

  // Cancel any existing animation on this element
  if (el._sheenCancel) { el._sheenCancel(); }
  el._sheenCancel = function() { cancelled = true; };

  function animate(ts) {
    if (cancelled || !el.isConnected) { return; }
    if (!start) { start = ts; }
    var progress = ((ts - start) % c.duration) / c.duration;
    var pos = Math.round(progress * 300) - 100;
    el.style.background = "linear-gradient(90deg, " + c.base + " 0%, " + c.mid + " " + (pos - 40) + "%, " + c.sheen + " " + pos + "%, " + c.mid + " " + (pos + 40) + "%, " + c.base + " 100%)";
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

async function addReply(postId, text, anonymous, imageUrl) {
  if (!anonymous) { anonymous = false; }
  if (!imageUrl) { imageUrl = null; }
  if (!text && !imageUrl) { return; }
  await addDoc(collection(db, "boards", currentBoardId, "replies"), {
    postId: postId, author: username, text: text, anonymous: anonymous, imageUrl: imageUrl, timestamp: serverTimestamp()
  });
  if (currentStudentId) { await incrementStudentStat(currentStudentId, "comments"); }
}

function loadReplies(postId, container, parentVisible) {
  if (parentVisible === undefined) { parentVisible = true; }
  var q = query(collection(db, "boards", currentBoardId, "replies"), orderBy("timestamp", "asc"));
  onSnapshot(q, function(snap) {
    container.innerHTML = "";
    snap.forEach(function(d) {
      var r = d.data();
      if (r.postId !== postId) { return; }
      if (r.visible === undefined) { r.visible = true; }
      if (!r.visible && !isTeacher) { return; }
      if (!parentVisible && !isTeacher) { return; }
      var div = document.createElement("div");
      div.className = "reply";
      if (!r.visible) { div.classList.add("hidden-comment"); }
      div.innerHTML = "<strong>" + (r.anonymous && !isTeacher ? "🥷🏼 Anonymous" : r.author) + "</strong> " + r.text;
      if (r.imageUrl) {
        var img = document.createElement("img");
        img.src = r.imageUrl;
        img.className = "comment-image";
        (function(url) { img.onclick = function() { showImageLightbox(url); }; })(r.imageUrl);
        div.appendChild(img);
      }
      if (isTeacher) {
        var hBtn = document.createElement("button");
        hBtn.innerHTML = eyeLabel(r.visible, "Shown", "Hidden");
        hBtn.className = "hide-toggle teacher-control";
        (function(docId, vis) {
          hBtn.onclick = async function() { await updateDoc(doc(db, "boards", currentBoardId, "replies", docId), { visible: !vis }); };
        })(d.id, r.visible);
        div.appendChild(hBtn);
        var delBtn = document.createElement("button");
        delBtn.innerHTML = iconLabel("trash", "Delete");
        delBtn.className = "delete-btn teacher-control";
        (function(docId) {
          delBtn.onclick = async function() { await deleteDoc(doc(db, "boards", currentBoardId, "replies", docId)); };
        })(d.id);
        div.appendChild(delBtn);
      }
      container.appendChild(div);
    });
  });
}

function loadPosts() {
  if (!currentBoardId) { return; }
  if (unsubPosts) { unsubPosts(); unsubPosts = null; }
  var orderField = sortMode === "new" ? "timestamp" : "upvotes";
  var q = query(collection(db, "boards", currentBoardId, "posts"), orderBy(orderField, "desc"));
  unsubPosts = onSnapshot(q, function(snapshot) {
    postsDiv.innerHTML = "";
    var archivedComments = document.getElementById("archivedComments");
    if (archivedComments) { archivedComments.innerHTML = ""; }
    snapshot.forEach(function(docSnap) {
      var post = docSnap.data();
      var postId = docSnap.id;
      if (post.visible === undefined) { post.visible = true; }
      if (!post.visible && !isTeacher) { return; }
      if (!post.visible && isTeacher) {
        // Render into archived section instead
        var archivedComments = document.getElementById("archivedComments");
        if (archivedComments) {
          if (archivedComments.querySelector(".archived-comments-header") === null) {
            var header = document.createElement("div");
            header.className = "archived-comments-header";
            header.style.cssText = "text-align:center;color:var(--text-secondary,#888);font-size:0.85rem;margin:24px 0 8px;letter-spacing:0.05em;";
            header.textContent = "── Archived Comments ──";
            archivedComments.appendChild(header);
          }
          var aDiv = document.createElement("div");
          aDiv.className = "post hidden-comment";
          var displayName = post.anonymous ? "🥷🏼 Anonymous" : post.author;
          aDiv.innerHTML = "<strong>" + displayName + "</strong><br>" + post.text + "<br><span class='upvote'>🍿 " + (post.upvotes || 0) + "</span>";
          if (post.imageUrl) {
            var aImg = document.createElement("img");
            aImg.src = post.imageUrl;
            aImg.className = "comment-image";
            (function(url) { aImg.onclick = function() { showImageLightbox(url); }; })(postId);
            aDiv.appendChild(aImg);
          }
          var aHBtn = document.createElement("button");
          aHBtn.innerHTML = eyeLabel(false, "Shown", "Hidden");
          aHBtn.className = "hide-toggle teacher-control";
          (function(pid) {
            aHBtn.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "posts", pid), { visible: true });
              var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
              rSnap.forEach(function(rd) {
                if (rd.data().postId === pid) { updateDoc(doc(db, "boards", currentBoardId, "replies", rd.id), { visible: true }); }
              });
            };
          })(postId);
          aDiv.appendChild(aHBtn);
          var aDelBtn = document.createElement("button");
          aDelBtn.innerHTML = iconLabel("trash", "Delete");
          aDelBtn.className = "delete teacher-control";
          (function(pid) {
            aDelBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Delete this post?")) { return; }
              var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
              rSnap.forEach(function(rd) { if (rd.data().postId === pid) { deleteDoc(doc(db, "boards", currentBoardId, "replies", rd.id)); } });
              await deleteDoc(doc(db, "boards", currentBoardId, "posts", pid));
            };
          })(postId);
          aDiv.appendChild(aDelBtn);
          var aRepliesDiv = document.createElement("div");
          loadReplies(postId, aRepliesDiv, true);
          aDiv.appendChild(aRepliesDiv);
          archivedComments.appendChild(aDiv);
        }
        return;
      }
      if (post.upvoters && post.upvoters.indexOf(username) !== -1) { myUpvotedPostIds.add(postId); } else { myUpvotedPostIds.delete(postId); }
      var div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postId)) { div.classList.add("upvoted-by-me"); }
      if (!post.visible) { div.classList.add("hidden-comment"); }
      var displayName = post.anonymous && !isTeacher ? "🥷🏼 Anonymous" : post.author;
      div.innerHTML = "<strong>" + displayName + "</strong><br>" + post.text + "<br><span class='upvote'>🍿 <span class='upvote-count'>" + (post.upvotes || 0) + "</span></span><button class='reply-btn teacher-control'>Reply</button>";
      if (post.imageUrl) {
        var img = document.createElement("img");
        img.src = post.imageUrl;
        img.className = "comment-image";
        (function(url) { img.onclick = function() { showImageLightbox(url); }; })(post.imageUrl);
        div.appendChild(img);
      }
      if (isTeacher) {
        var hBtn = document.createElement("button");
        hBtn.innerHTML = eyeLabel(post.visible, "Shown", "Hidden");
        hBtn.className = "hide-toggle teacher-control";
        (function(pid, vis) {
          hBtn.onclick = async function(e) {
            e.stopPropagation();
            var newV = !vis;
            await updateDoc(doc(db, "boards", currentBoardId, "posts", pid), { visible: newV });
            var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
            rSnap.forEach(function(rd) {
              if (rd.data().postId === pid) { updateDoc(doc(db, "boards", currentBoardId, "replies", rd.id), { visible: newV }); }
            });
          };
        })(postId, post.visible);
        div.appendChild(hBtn);
        var delBtn = document.createElement("button");
        delBtn.innerHTML = iconLabel("trash", "Delete");
        delBtn.className = "delete teacher-control";
        (function(pid) {
          delBtn.onclick = async function(e) {
            e.stopPropagation();
            var rSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
            rSnap.forEach(function(rd) { if (rd.data().postId === pid) { deleteDoc(doc(db, "boards", currentBoardId, "replies", rd.id)); } });
            await deleteDoc(doc(db, "boards", currentBoardId, "posts", pid));
          };
        })(postId);
        div.appendChild(delBtn);
      }
      var upvoteSpan = div.querySelector(".upvote");
      (function(pid, postData) {
        upvoteSpan.onclick = async function(e) {
          e.stopPropagation();
          if (isDisplayMode) { return; }
          var already = postData.upvoters && postData.upvoters.indexOf(username) !== -1;
          createPopcornConfetti(upvoteSpan);
          playPop();
          if (navigator.vibrate) { navigator.vibrate(25); }
          var countEl = upvoteSpan.querySelector(".upvote-count");
          if (countEl) {
            var oldVal = parseInt(countEl.textContent) || 0;
            var newVal = already ? oldVal - 1 : oldVal + 1;
            animateUpvoteCount(countEl, oldVal, newVal);
          }
          var postRef = doc(db, "boards", currentBoardId, "posts", pid);
          if (already) {
            await updateDoc(postRef, { upvoters: arrayRemove(username), upvotes: increment(-1), upvoteHistory: arrayUnion({ username: username, action: "Removed Upvote", timestamp: Date.now() }) });
            if (currentStudentId) { await incrementStudentStat(currentStudentId, "upvotesGiven", -1); }
          } else {
            await updateDoc(postRef, { upvoters: arrayUnion(username), upvotes: increment(1), upvoteHistory: arrayUnion({ username: username, action: "Upvoted", timestamp: Date.now() }) });
            if (currentStudentId) { await incrementStudentStat(currentStudentId, "upvotesGiven", 1); }
            if (postData.author !== username) {
              var aq = query(collection(db, "boards", currentBoardId, "students"), where("username", "==", postData.author));
              var aSnap = await getDocs(aq);
              if (!aSnap.empty) { await incrementStudentStat(aSnap.docs[0].id, "upvotesReceived", 1); }
            }
          }
        };
      })(postId, post);
      if (isTeacher && post.upvoteHistory && post.upvoteHistory.length > 0) {
        var hDiv = document.createElement("div");
        hDiv.className = "comment-upvote-history";
        hDiv.innerHTML = "<strong>Upvote Log:</strong>";
        var legacyEntries = post.upvoteHistory.filter(function(entry) { return typeof entry === "string"; });
        var objectEntries = post.upvoteHistory.filter(function(entry) { return entry && typeof entry === "object"; });
        legacyEntries.forEach(function(entry) {
          var d = document.createElement("div");
          d.textContent = entry;
          hDiv.appendChild(d);
        });
        groupHistoryByStudent(objectEntries).forEach(function(group) {
          var d = document.createElement("div");
          d.textContent = group.username + ": " + group.entries.map(function(e) { return e.action; }).join(", ");
          hDiv.appendChild(d);
        });
        div.appendChild(hDiv);
      }
      var repliesDiv = document.createElement("div");
      loadReplies(postId, repliesDiv, post.visible);
      var replyBtn = div.querySelector(".reply-btn");
      if (isDisplayMode) { replyBtn.style.display = "none"; }
      (function(pid) {
        replyBtn.onclick = function(e) {
          e.stopPropagation();
          var input = document.createElement("textarea");
          input.className = "reply-input";
          input.placeholder = "Reply...";
          var anonWrapper = document.createElement("div");
          anonWrapper.className = "post-options";
          var anonCheck = document.createElement("input");
          anonCheck.type = "checkbox";
          anonCheck.id = "rA-" + pid;
          var label = document.createElement("label");
          label.htmlFor = "rA-" + pid;
          label.innerHTML = iconLabel("mask", "Anonymous");
          var riInput = document.createElement("input");
          riInput.type = "file";
          riInput.accept = "image/*";
          riInput.style.display = "none";
          var riBtn = document.createElement("button");
          riBtn.innerHTML = iconLabel("camera", "Add Image");
          riBtn.className = "secondary-btn teacher-control";
          riBtn.onclick = function() { riInput.click(); };
          var riPreview = document.createElement("div");
          riPreview.className = "image-preview";
          var replyImageFile = null;
          riInput.onchange = function(ev) {
            var f = ev.target.files[0];
            if (!f || !f.type.startsWith("image/")) { return; }
            replyImageFile = f;
            showImagePreview(f, riPreview, function() { replyImageFile = null; riPreview.innerHTML = ""; riInput.value = ""; });
          };
          anonWrapper.appendChild(anonCheck);
          anonWrapper.appendChild(label);
          anonWrapper.appendChild(riBtn);
          var send = document.createElement("button");
          send.textContent = "Send";
          send.className = "teacher-control";
          send.onclick = async function(ev) {
            ev.stopPropagation();
            var iUrl = null;
            if (replyImageFile) { iUrl = await uploadImage(replyImageFile, "boards/" + currentBoardId + "/replies"); }
            playWhoosh();
            await addReply(pid, input.value, anonCheck.checked, iUrl);
            input.remove(); anonWrapper.remove(); send.remove(); riInput.remove(); riPreview.remove();
          };
          div.appendChild(input);
          div.appendChild(anonWrapper);
          div.appendChild(riPreview);
          div.appendChild(send);
        };
      })(postId);
      div.appendChild(repliesDiv);
      postsDiv.appendChild(div);
    });
  });
}

teacherBtn.addEventListener("click", function() {
  if (!pollCreation.classList.contains("hidden")) {
    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    return;
  }
  pollCreation.innerHTML = "<h3>Create Poll</h3><div class='poll-type-buttons' id='pollTypeBtns'><button type='button' id='mcBtn' class='teacher-control'>Multiple Choice</button><button type='button' id='freeBtn' class='teacher-control'>Free Response</button><button type='button' id='drawBtn' class='teacher-control'>✏️ Drawing</button></div><input type='text' id='pollQuestionInput' placeholder='Poll question' style='display:none;' /><div id='mcOptionsContainer' style='display:none;'><div class='mc-options-list' id='mcOptionsList'></div><button type='button' class='add-option-btn teacher-control' id='addOptionBtn'>+</button><div class='require-all-row' style='margin-top:10px;'><input type='checkbox' id='requireAllCorrect' /><label for='requireAllCorrect'>Require All Correct</label></div></div><input type='file' id='pollImageInput' accept='image/*' style='display:none;' /><button type='button' id='pollImageBtn' class='secondary-btn teacher-control' style='display:none;'>" + iconLabel("camera", "Add Image") + "</button><div id='pollImagePreviewInner' class='image-preview'></div><button type='button' id='createPollBtn' class='teacher-control' style='display:none;'>Create Poll</button><button type='button' id='cancelPollBtn' class='teacher-control' style='display:none;margin-left:8px;'>Cancel</button>";
  pollCreation.classList.remove("hidden");

  var currentPollType = "";
  var pollImageFile = null;
  var pImgInput = document.getElementById("pollImageInput");
  var pImgPreview = document.getElementById("pollImagePreviewInner");

  document.getElementById("pollImageBtn").addEventListener("click", function(e) { e.stopPropagation(); pImgInput.click(); });
  pImgInput.addEventListener("change", function(e) {
    var f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) { return; }
    pollImageFile = f;
    showImagePreview(f, pImgPreview, function() { pollImageFile = null; pImgPreview.innerHTML = ""; pImgInput.value = ""; });
  });

  function addMCOptionRow() {
    var list = document.getElementById("mcOptionsList");
    var row = document.createElement("div");
    row.className = "mc-option-row";
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "correct-toggle teacher-control";
    toggle.textContent = "ㄨ";
    toggle.dataset.correct = "false";
    toggle.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isCorrect = toggle.dataset.correct === "true";
      toggle.dataset.correct = String(!isCorrect);
      toggle.textContent = !isCorrect ? "✓" : "ㄨ";
      toggle.classList.toggle("is-correct", !isCorrect);
    });
    var inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Option text";
    inp.style.marginBottom = "0";
    row.appendChild(toggle);
    row.appendChild(inp);
    list.appendChild(row);
  }

  addMCOptionRow();
  addMCOptionRow();

  document.getElementById("addOptionBtn").addEventListener("click", function(e) { e.preventDefault(); e.stopPropagation(); addMCOptionRow(); });

  document.getElementById("mcBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    currentPollType = "mc";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("mcOptionsContainer").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.getElementById("pollTypeBtns").style.display = "none";
  });

  document.getElementById("freeBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    currentPollType = "free";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.getElementById("pollTypeBtns").style.display = "none";
  });

  document.getElementById("drawBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    currentPollType = "draw";
    document.getElementById("pollQuestionInput").style.display = "block";
    document.getElementById("pollImageBtn").style.display = "inline-block";
    document.getElementById("createPollBtn").style.display = "inline-block";
    document.getElementById("cancelPollBtn").style.display = "inline-block";
    document.getElementById("pollTypeBtns").style.display = "none";
  });

  document.getElementById("cancelPollBtn").addEventListener("click", function(e) {
    e.stopPropagation();
    pollCreation.classList.add("hidden");
    pollCreation.innerHTML = "";
    pollImageFile = null;
  });

  document.getElementById("createPollBtn").addEventListener("click", async function(e) {
    e.stopPropagation();
    var createBtn = document.getElementById("createPollBtn");
    if (!createBtn || createBtn.disabled) { return; }
    if (!currentPollType) { alert("Please select Multiple Choice, Free Response, or Drawing first."); return; }
    var questionEl = document.getElementById("pollQuestionInput");
    var question = questionEl ? questionEl.value.trim() : "";
    if (!question) { alert("Please enter a poll question."); return; }
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";
    var imageUrl = null;
    try {
      if (pollImageFile) { imageUrl = await uploadImage(pollImageFile, "boards/" + currentBoardId + "/polls"); }
      if (currentPollType === "mc") {
        var rows = document.querySelectorAll("#mcOptionsList .mc-option-row");
        var options = [];
        var correctIndices = [];
        rows.forEach(function(row) {
          var text = row.querySelector("input[type='text']").value.trim();
          var isCorrect = row.querySelector(".correct-toggle").dataset.correct === "true";
          if (text) {
            if (isCorrect) { correctIndices.push(options.length); }
            options.push(text);
          }
        });
        if (options.length < 2) { alert("Please add at least 2 options."); createBtn.disabled = false; createBtn.textContent = "Create Poll"; return; }
        if (correctIndices.length === 0) { alert("Kernel crisis! Mark a ✓ to publish."); createBtn.disabled = false; createBtn.textContent = "Create Poll"; return; }
        var requireAll = document.getElementById("requireAllCorrect").checked;
        await addDoc(collection(db, "boards", currentBoardId, "polls"), {
          question: question, type: "mc", options: options,
          votes: Array(options.length).fill(0), voters: [], visible: false,
          imageUrl: imageUrl, history: [], correctIndices: correctIndices,
          requireAllCorrect: requireAll, responsesVisible: false,
          correctVisible: false, pointsAwarded: false, createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "boards", currentBoardId, "polls"), {
          question: question, type: currentPollType, responses: {}, visible: false,
          responsesVisible: false, imageUrl: imageUrl, history: [], createdAt: serverTimestamp()
        });
      }
      pollCreation.classList.add("hidden");
      pollCreation.innerHTML = "";
      pollImageFile = null;
    } catch (err) {
      console.error("Error creating poll:", err);
      alert("Something went wrong. Please try again.");
      if (createBtn) { createBtn.disabled = false; createBtn.textContent = "Create Poll"; }
    }
  });
});

var cachedTotalStudents = 0;

// Normalise Firestore votes field — created as array but becomes a map
// object {0: n, 1: n} after any ["votes.N"] increment operations.

// ─── POLLS ─────────────────────────────────────────────────────────────────

function getVotesArray(poll) {
  var options = poll.options || [];
  var raw = poll.votes;
  if (!raw) { return Array(options.length).fill(0); }
  if (Array.isArray(raw)) { return raw; }
  var arr = [];
  for (var i = 0; i < options.length; i++) {
    arr.push(raw[String(i)] !== undefined ? raw[String(i)] : (raw[i] !== undefined ? raw[i] : 0));
  }
  return arr;
}

// Using 1.6's proven pattern: await student count FIRST, then set up listener.
// This guarantees currentBoardId is valid and the listener fires correctly for students.

function applyPollSectionCollapse() {
  var wrapper = document.getElementById("pollCarouselWrapper");
  var bottomRow = document.getElementById("pollCollapseBottomRow");
  var topBtn = document.getElementById("pollCollapseToggleTop");
  var bottomBtn = document.getElementById("pollCollapseToggleBottom");
  if (wrapper) { wrapper.classList.toggle("hidden", pollSectionCollapsed); }
  if (bottomRow) { bottomRow.classList.toggle("hidden", pollSectionCollapsed); }
  var label = pollSectionCollapsed ? "▸ Show Polls" : "▾ Hide Polls";
  if (topBtn) { topBtn.textContent = label; }
  if (bottomBtn) { bottomBtn.textContent = label; }
}

var pollCarouselScrollDebounce = null;

// Keyed by poll ID (not raw index) so a mid-session poll add/remove doesn't
// silently jump the viewer to a different poll on the next re-render.
function wirePollCarouselNav(track, prevBtn, nextBtn, pollIds) {
  if (!pollIds.length) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
  var startIndex = currentCarouselPollId ? pollIds.indexOf(currentCarouselPollId) : 0;
  if (startIndex === -1) { startIndex = 0; }

  function updateNavButtons(index) {
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= pollIds.length - 1;
  }

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function scrollToIndex(index, smooth) {
    index = Math.max(0, Math.min(pollIds.length - 1, index));
    var card = track.children[index];
    if (!card) { return; }
    track.scrollTo({ left: card.offsetLeft, behavior: (smooth && !reducedMotion) ? "smooth" : "auto" });
    currentCarouselPollId = pollIds[index];
    updateNavButtons(index);
  }

  requestAnimationFrame(function() { scrollToIndex(startIndex, false); });

  prevBtn.onclick = function() {
    var idx = pollIds.indexOf(currentCarouselPollId);
    scrollToIndex((idx === -1 ? 0 : idx) - 1, true);
  };
  nextBtn.onclick = function() {
    var idx = pollIds.indexOf(currentCarouselPollId);
    scrollToIndex((idx === -1 ? 0 : idx) + 1, true);
  };

  track.onscroll = function() {
    if (pollCarouselScrollDebounce) { clearTimeout(pollCarouselScrollDebounce); }
    pollCarouselScrollDebounce = setTimeout(function() {
      var nearest = 0;
      var minDist = Infinity;
      for (var i = 0; i < track.children.length; i++) {
        var dist = Math.abs(track.children[i].offsetLeft - track.scrollLeft);
        if (dist < minDist) { minDist = dist; nearest = i; }
      }
      currentCarouselPollId = pollIds[nearest];
      updateNavButtons(nearest);
    }, 120);
  };

  updateNavButtons(startIndex);
}

async function loadPolls() {
  if (!currentBoardId) { return; }
  if (unsubPolls) { unsubPolls(); unsubPolls = null; }

  var studentsSnapshot = await getDocs(collection(db, "boards", currentBoardId, "students"));
  var totalStudents = studentsSnapshot.size;

  unsubPolls = onSnapshot(
    collection(db, "boards", currentBoardId, "polls"),
    function(snapshot) {
      pollSection.innerHTML = "";
      var archivedSection = document.getElementById("archivedPolls");
      if (archivedSection) { archivedSection.innerHTML = ""; }

      var pollDocs = [];
      snapshot.forEach(function(docSnap) { pollDocs.push(docSnap); });

      pollDocs.sort(function(a, b) {
        function getPollPriority(docSnap) {
          var p = docSnap.data();
          var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
          if (p.visible) { return 0; }
          if (!hasInteraction) { return 1; }
          return 2;
        }
        return getPollPriority(a) - getPollPriority(b);
      });

      var activePollDocs = pollDocs.filter(function(d) {
        var p = d.data();
        var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
        return p.visible || !hasInteraction;
      });
      var archivedPollDocs = pollDocs.filter(function(d) {
        var p = d.data();
        var hasInteraction = (p.history && p.history.length > 0) || (p.voters && p.voters.length > 0);
        return !p.visible && hasInteraction;
      });

      if (isTeacher) {
        var topRow = document.createElement("div");
        topRow.className = "poll-collapse-row";
        var topToggleBtn = document.createElement("button");
        topToggleBtn.type = "button";
        topToggleBtn.id = "pollCollapseToggleTop";
        topToggleBtn.className = "teacher-control";
        topToggleBtn.textContent = pollSectionCollapsed ? "▸ Show Polls" : "▾ Hide Polls";
        topToggleBtn.onclick = function() { pollSectionCollapsed = !pollSectionCollapsed; applyPollSectionCollapse(); };
        topRow.appendChild(topToggleBtn);
        pollSection.appendChild(topRow);
      }

      var carouselWrapper = document.createElement("div");
      carouselWrapper.id = "pollCarouselWrapper";
      carouselWrapper.className = "poll-carousel-wrapper" + (isTeacher && pollSectionCollapsed ? " hidden" : "");

      var carouselPrevBtn = document.createElement("button");
      carouselPrevBtn.type = "button";
      carouselPrevBtn.className = "poll-carousel-nav poll-carousel-prev";
      carouselPrevBtn.textContent = "‹";
      carouselPrevBtn.setAttribute("aria-label", "Previous poll");

      var carouselTrack = document.createElement("div");
      carouselTrack.id = "pollCarouselTrack";
      carouselTrack.className = "poll-carousel-track";

      var carouselNextBtn = document.createElement("button");
      carouselNextBtn.type = "button";
      carouselNextBtn.className = "poll-carousel-nav poll-carousel-next";
      carouselNextBtn.textContent = "›";
      carouselNextBtn.setAttribute("aria-label", "Next poll");

      carouselWrapper.appendChild(carouselPrevBtn);
      carouselWrapper.appendChild(carouselTrack);
      carouselWrapper.appendChild(carouselNextBtn);
      pollSection.appendChild(carouselWrapper);

      if (isTeacher) {
        var bottomRow = document.createElement("div");
        bottomRow.id = "pollCollapseBottomRow";
        bottomRow.className = "poll-collapse-row" + (pollSectionCollapsed ? " hidden" : "");
        var bottomToggleBtn = document.createElement("button");
        bottomToggleBtn.type = "button";
        bottomToggleBtn.id = "pollCollapseToggleBottom";
        bottomToggleBtn.className = "teacher-control";
        bottomToggleBtn.textContent = pollSectionCollapsed ? "▸ Show Polls" : "▾ Hide Polls";
        bottomToggleBtn.onclick = function() { pollSectionCollapsed = !pollSectionCollapsed; applyPollSectionCollapse(); };
        bottomRow.appendChild(bottomToggleBtn);
        pollSection.appendChild(bottomRow);
      }

      activePollDocs.forEach(function(docSnap) {
        var poll = docSnap.data();
        var pollId = docSnap.id;
        var pollVisible = poll.visible !== undefined ? poll.visible : false;

        if (!isTeacher && !pollVisible) { return; }

        // Restore vote state from history on reload
        if (!isTeacher && currentStudentId) {
          if (poll.requireAllCorrect) {
            var multiSet = new Set();
            (poll.history || []).forEach(function(h) {
              if (h.username !== username) { return; }
              var resp = h.response || "";
              if (resp.indexOf("Voted: ") === 0) {
                var optText = resp.slice(7);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { multiSet.add(idx); }
              } else if (resp.indexOf("Removed vote: ") === 0) {
                var optText = resp.slice(14);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { multiSet.delete(idx); }
              }
            });
            myPollVotes.set(pollId + "_multi", multiSet);
          } else {
            var lastVote = null;
            (poll.history || []).forEach(function(h) {
              if (h.username !== username) { return; }
              var resp = h.response || "";
              if (resp.indexOf("Changed vote: ") === 0) {
                var toSep = resp.indexOf(" to ");
                var optText = toSep === -1 ? "" : resp.slice(toSep + 4);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { lastVote = idx; }
              } else if (resp.indexOf("Voted: ") === 0) {
                var optText = resp.slice(7);
                var idx = (poll.options || []).indexOf(optText);
                if (idx !== -1) { lastVote = idx; }
              } else if (resp.indexOf("Removed vote: ") === 0) {
                lastVote = null;
              }
            });
            if (lastVote !== null) { myPollVotes.set(pollId, lastVote); }
          }
        }

        var div = document.createElement("div");
        div.className = "poll";
        div.dataset.pollId = pollId;
        var hasInteraction = (poll.history && poll.history.length > 0) || (poll.voters && poll.voters.length > 0);
        if (isTeacher && !pollVisible && !hasInteraction) { div.style.opacity = "0.4"; div.style.filter = "grayscale(30%)"; }
        var questionEl = document.createElement("strong");
        questionEl.textContent = poll.question;
        div.appendChild(questionEl);

        if (poll.imageUrl) {
          var img = document.createElement("img");
          img.src = poll.imageUrl;
          img.className = "poll-image";
          (function(url) { img.onclick = function() { showImageLightbox(url); }; })(poll.imageUrl);
          div.appendChild(img);
        }

        if (poll.type === "free") { renderFreePoll(div, poll, pollId, totalStudents); }
        else if (poll.type === "mc") { renderMCPoll(div, poll, pollId, totalStudents); }
        else if (poll.type === "draw") { renderDrawPoll(div, poll, pollId, totalStudents); }

        if (isTeacher) {
          var controlsDiv = document.createElement("div");
          controlsDiv.style.cssText = "margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";

          var toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.innerHTML = eyeLabel(pollVisible, "Shown", "Hidden");
          toggleBtn.className = "hide-toggle teacher-control";
          (function(pid, vis) {
            toggleBtn.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { visible: !vis });
            };
          })(pollId, pollVisible);
          controlsDiv.appendChild(toggleBtn);

          var rToggle = document.createElement("button");
          rToggle.type = "button";
          rToggle.innerHTML = eyeLabel(poll.responsesVisible, "Responses Shown", "Responses Hidden");
          rToggle.className = "hide-toggle teacher-control";
          (function(pid, rv) {
            rToggle.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { responsesVisible: !rv });
            };
          })(pollId, poll.responsesVisible);
          controlsDiv.appendChild(rToggle);

          if (poll.type === "mc" && poll.responsesVisible) {
            var cToggle = document.createElement("button");
            cToggle.type = "button";
            cToggle.innerHTML = eyeLabel(poll.correctVisible, "Correct Shown", "Correct Hidden");
            cToggle.className = "hide-toggle teacher-control";
            (function(pid, cv, ci, pa) {
              cToggle.onclick = async function(e) {
                e.stopPropagation();
                var newCV = !cv;
                await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { correctVisible: newCV });
                if (newCV && ci && ci.length > 0 && !pa) {
                  await awardLeaderboardPoints(pid, ci);
                  await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { pointsAwarded: true });
                }
              };
            })(pollId, poll.correctVisible, poll.correctIndices, poll.pointsAwarded);
            controlsDiv.appendChild(cToggle);
          }

          var seatMapBtn = document.createElement("button");
          seatMapBtn.type = "button";
          seatMapBtn.innerHTML = iconLabel("seat", "View on Seating Map");
          seatMapBtn.className = "teacher-control";
          (function(pid, pQuestion) {
            seatMapBtn.onclick = function(e) {
              e.stopPropagation();
              enterSeatMapResponseView(pid, pQuestion);
            };
          })(pollId, poll.question);
          controlsDiv.appendChild(seatMapBtn);

          var resetBtn = document.createElement("button");
          resetBtn.type = "button";
          resetBtn.innerHTML = iconLabel("refresh", "Reset");
          resetBtn.className = "teacher-control";
          (function(pid, pdata) {
            resetBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Reset this poll?")) { return; }
              var updates = { history: [], pointsAwarded: false };
              if (pdata.type === "mc") {
                updates.votes = Array(pdata.options.length).fill(0);
                updates.voters = [];
                updates.responsesVisible = false;
                updates.correctVisible = false;
              } else {
                updates.responses = {};
                updates.responsesVisible = false;
              }
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), updates);
            };
          })(pollId, poll);
          controlsDiv.appendChild(resetBtn);

          var delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.innerHTML = iconLabel("trash", "Delete");
          delBtn.className = "delete-poll teacher-control";
          (function(pid) {
            delBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Delete this poll?")) { return; }
              await deleteDoc(doc(db, "boards", currentBoardId, "polls", pid));
            };
          })(pollId);
          controlsDiv.appendChild(delBtn);
          div.appendChild(controlsDiv);
        }

        carouselTrack.appendChild(div);
      });

      wirePollCarouselNav(carouselTrack, carouselPrevBtn, carouselNextBtn, activePollDocs.map(function(d) { return d.id; }));

      if (isTeacher && archivedSection && archivedPollDocs.length > 0) {
        var header = document.createElement("div");
        header.style.cssText = "text-align:center;color:var(--text-secondary,#888);font-size:0.85rem;margin:24px 0 8px;letter-spacing:0.05em;";
        header.textContent = "── Archived Polls ──";
        archivedSection.appendChild(header);
        archivedPollDocs.forEach(function(docSnap) {
          var poll = docSnap.data();
          var pollId = docSnap.id;
          var div = document.createElement("div");
          div.className = "poll";
          div.style.opacity = "0.6";
          var questionEl = document.createElement("strong");
          questionEl.textContent = poll.question;
          div.appendChild(questionEl);
          if (poll.imageUrl) {
            var img = document.createElement("img");
            img.src = poll.imageUrl;
            img.className = "poll-image";
            (function(url) { img.onclick = function() { showImageLightbox(url); }; })(poll.imageUrl);
            div.appendChild(img);
          }
          if (poll.type === "free") { renderFreePoll(div, poll, pollId, totalStudents); }
          else if (poll.type === "mc") { renderMCPoll(div, poll, pollId, totalStudents); }
          else if (poll.type === "draw") { renderDrawPoll(div, poll, pollId, totalStudents); }
          var controlsDiv = document.createElement("div");
          controlsDiv.style.cssText = "margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;";
          var toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.innerHTML = eyeLabel(false, "Shown", "Hidden");
          toggleBtn.className = "hide-toggle teacher-control";
          (function(pid) {
            toggleBtn.onclick = async function(e) {
              e.stopPropagation();
              await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { visible: true });
            };
          })(pollId);
          controlsDiv.appendChild(toggleBtn);
          var delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.innerHTML = iconLabel("trash", "Delete");
          delBtn.className = "delete-poll teacher-control";
          (function(pid) {
            delBtn.onclick = async function(e) {
              e.stopPropagation();
              if (!confirm("Delete this poll?")) { return; }
              await deleteDoc(doc(db, "boards", currentBoardId, "polls", pid));
            };
          })(pollId);
          controlsDiv.appendChild(delBtn);
          div.appendChild(controlsDiv);
          archivedSection.appendChild(div);
        });
      }
    },
    function(error) { console.error("Poll listener error:", error); }
  );
}

// Domain-neutral nouns/verbs that survive compromise's tagging but carry no
// real meaning for a keyword map (e.g. "a lot of things happened").
var KEYWORD_STOPWORDS = [
  "thing", "things", "stuff", "lot", "lots", "way", "ways", "something",
  "anything", "everything", "someone", "people", "person", "time", "times",
  "bit", "part", "parts", "kind", "kinds", "sort", "sorts"
];

function extractKeywordCandidates(text) {
  if (!window.nlp || !text) { return []; }
  var out = [];
  window.nlp(text).json().forEach(function(sentence) {
    var buffer = [];
    function flushBuffer() {
      if (!buffer.length) { return; }
      var phrase = buffer.join(" ");
      var singular = window.nlp(phrase).nouns().toSingular().text();
      var term = (singular || phrase).toLowerCase().trim();
      if (term) { out.push(term); }
      buffer = [];
    }
    (sentence.terms || []).forEach(function(t) {
      var tags = t.tags || [];
      if (tags.indexOf("Noun") !== -1) { buffer.push(t.text); return; }
      flushBuffer();
      var isMeaningfulVerb = tags.indexOf("Verb") !== -1 && tags.indexOf("Auxiliary") === -1 && tags.indexOf("Copula") === -1;
      if (isMeaningfulVerb) { out.push(t.text.toLowerCase()); }
    });
    flushBuffer();
  });
  return out.filter(function(term) { return term.length > 1 && KEYWORD_STOPWORDS.indexOf(term) === -1; });
}

// TF-IDF over the poll's responses, each response treated as one document.
// Returns the top 10 terms by aggregate weighted score, each with its raw
// occurrence count (shown on hover).
function computeKeywordMap(responseTexts) {
  var N = responseTexts.length;
  if (!N) { return []; }
  var totalCount = {};
  var docFreq = {};
  responseTexts.forEach(function(text) {
    var seenInDoc = {};
    extractKeywordCandidates(text).forEach(function(term) {
      totalCount[term] = (totalCount[term] || 0) + 1;
      if (!seenInDoc[term]) { seenInDoc[term] = true; docFreq[term] = (docFreq[term] || 0) + 1; }
    });
  });
  var scored = Object.keys(totalCount).map(function(term) {
    // smoothed idf, consistent with scikit-learn's TfidfTransformer default
    var idf = Math.log((1 + N) / (1 + docFreq[term])) + 1;
    return { term: term, count: totalCount[term], score: totalCount[term] * idf };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 10);
}

function renderKeywordMap(poll) {
  var wrap = document.createElement("div");
  wrap.className = "keyword-map";
  var label = document.createElement("strong");
  label.textContent = "Keyword Map:";
  wrap.appendChild(label);

  if (!window.nlp) {
    var unavailable = document.createElement("div");
    unavailable.className = "confusion-timeline-empty";
    unavailable.textContent = "Keyword extraction unavailable.";
    wrap.appendChild(unavailable);
    return wrap;
  }

  var responseTexts = (poll.history || []).map(function(h) { return h.response || ""; });
  var keywords = computeKeywordMap(responseTexts);
  var cloud = document.createElement("div");
  cloud.className = "keyword-cloud";
  if (!keywords.length) {
    var emptyMsg = document.createElement("div");
    emptyMsg.className = "confusion-timeline-empty";
    emptyMsg.textContent = "No keywords yet -- waiting on responses.";
    cloud.appendChild(emptyMsg);
  } else {
    var maxScore = keywords[0].score || 1;
    keywords.forEach(function(k) {
      var chip = document.createElement("span");
      chip.className = "keyword-chip";
      chip.style.opacity = (0.55 + 0.45 * (k.score / maxScore)).toFixed(2);
      chip.title = k.count + (k.count === 1 ? " mention" : " mentions");
      var termSpan = document.createElement("span");
      termSpan.className = "keyword-term";
      termSpan.textContent = k.term;
      var countSpan = document.createElement("span");
      countSpan.className = "keyword-count";
      countSpan.textContent = k.count;
      chip.appendChild(termSpan);
      chip.appendChild(countSpan);
      cloud.appendChild(chip);
    });
  }
  wrap.appendChild(cloud);
  return wrap;
}

function renderFreePoll(div, poll, pollId, totalStudents) {
  var uniqueResponders = new Set();
  (poll.history || []).forEach(function(h) { uniqueResponders.add(h.username); });
  var pct = totalStudents > 0 ? Math.round((uniqueResponders.size / totalStudents) * 100) : 0;

  if (isTeacher) {
    var pDiv = document.createElement("div");
    pDiv.className = "poll-stat";
    pDiv.innerHTML = "<strong>🗳️ Responded: " + pct + "%</strong>";
    div.appendChild(pDiv);

    var kToggle = document.createElement("button");
    kToggle.type = "button";
    kToggle.className = "hide-toggle teacher-control";
    kToggle.innerHTML = eyeLabel(poll.keywordsVisible, "Keywords Shown", "Keywords Hidden");
    (function(pid, kv) {
      kToggle.onclick = async function(e) {
        e.stopPropagation();
        await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), { keywordsVisible: !kv });
      };
    })(pollId, poll.keywordsVisible);
    div.appendChild(kToggle);
  }

  if (isTeacher || poll.keywordsVisible) {
    div.appendChild(renderKeywordMap(poll));
  }

  if (isTeacher || poll.responsesVisible) {
    var logDiv = document.createElement("div");
    logDiv.className = "poll-log";
    logDiv.innerHTML = "<strong>Poll Log:</strong>";
    groupHistoryByStudent(poll.history).forEach(function(group) {
      var p = document.createElement("div");
      var texts = group.entries.map(function(e) { return e.response; });
      p.textContent = group.username + ": " + texts.join(", ");
      logDiv.appendChild(p);
    });
    div.appendChild(logDiv);
  }

  if (!isTeacher && !isDisplayMode) {
    var hasSubmitted = (poll.history || []).some(function(h) { return h.username === username; });
    var textarea = document.createElement("textarea");
    textarea.placeholder = hasSubmitted ? "✓ Your response popped in!" : "Enter your response...";
    if (hasSubmitted) { textarea.disabled = true; }

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Submit";
    // No teacher-control class — this is a student-facing button, styled as a normal poll button
    if (hasSubmitted) { submitBtn.disabled = true; }

    (function(pid, ta, sb) {
      sb.onclick = async function(e) {
        e.stopPropagation();
        var responseText = ta.value.trim();
        if (!responseText) { return; }
        await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), {
          history: arrayUnion({ username: username, response: responseText, timestamp: Date.now() })
        });
      playPop();
        if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast"); }
        ta.value = "";
        ta.placeholder = "✓ Your response popped in!";
        ta.disabled = true;
        sb.disabled = true;
      };
    })(pollId, textarea, submitBtn);

    div.appendChild(textarea);
    div.appendChild(submitBtn);
  } else if (isDisplayMode) {
    var waitingEl = document.createElement("div");
    waitingEl.className = "poll-waiting-placeholder";
    waitingEl.textContent = "Waiting for responses…";
    div.appendChild(waitingEl);
  }
}

var DRAW_COLORS = ["#1d1d1f", "#ff453a", "#0a84ff", "#34c759"];
var DRAW_GRID_SIZE = 500;
// Index 0 is the background/eraser color; 1-4 are the selectable pen colors.
var DRAW_PALETTE = ["#ffffff"].concat(DRAW_COLORS);

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  };
}

// A drawing is a flat 500x500 grid of palette indices, serialized as one hex
// digit per pixel (250,000 chars, fixed size regardless of how much is
// drawn) -- stored in its own Firestore document (see renderDrawPoll's
// submit flow) rather than as an uploaded image, so there's no Storage
// round trip to hang. Still comfortably under Firestore's 1MB/doc cap.
function packGridToString(grid) {
  var out = "";
  for (var i = 0; i < grid.length; i++) { out += grid[i].toString(16); }
  return out;
}

function renderPixelGridToCanvas(canvasEl, pixelsString) {
  canvasEl.width = DRAW_GRID_SIZE;
  canvasEl.height = DRAW_GRID_SIZE;
  var ctx = canvasEl.getContext("2d");
  var imageData = ctx.createImageData(DRAW_GRID_SIZE, DRAW_GRID_SIZE);
  var paletteRgb = DRAW_PALETTE.map(hexToRgb);
  var total = DRAW_GRID_SIZE * DRAW_GRID_SIZE;
  for (var i = 0; i < total && i < pixelsString.length; i++) {
    var idx = parseInt(pixelsString[i], 16) || 0;
    var rgb = paletteRgb[idx] || paletteRgb[0];
    var o = i * 4;
    imageData.data[o] = rgb.r;
    imageData.data[o + 1] = rgb.g;
    imageData.data[o + 2] = rgb.b;
    imageData.data[o + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

function showPixelArtLightbox(pixelsString) {
  var lb = document.createElement("div");
  lb.className = "image-lightbox";
  var canvas = document.createElement("canvas");
  canvas.className = "pixel-art-lightbox-canvas";
  renderPixelGridToCanvas(canvas, pixelsString);
  lb.appendChild(canvas);
  lb.onclick = function() { lb.remove(); };
  document.body.appendChild(lb);
}

// Interpolates from (x0,y0) to (x1,y1), stamping an NxN square brush (size
// cells per side) at ~1-grid-cell steps so fast pointer moves don't leave
// gaps on the grid. Bounds-checked per cell, not just at the
// stamp's center -- imageData.data is a flat buffer, so an unguarded
// out-of-range pixel index wraps into the next row instead of clipping.
function stampLine(grid, imageData, x0, y0, x1, y1, size, paletteIndex) {
  var rgb = hexToRgb(DRAW_PALETTE[paletteIndex]);
  var steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  var loOffset = -Math.floor(size / 2);
  var hiOffset = size - Math.floor(size / 2) - 1;
  for (var s = 0; s <= steps; s++) {
    var cx = Math.round(x0 + (x1 - x0) * (s / steps));
    var cy = Math.round(y0 + (y1 - y0) * (s / steps));
    for (var dy = loOffset; dy <= hiOffset; dy++) {
      var py = cy + dy;
      if (py < 0 || py >= DRAW_GRID_SIZE) { continue; }
      for (var dx = loOffset; dx <= hiOffset; dx++) {
        var px = cx + dx;
        if (px < 0 || px >= DRAW_GRID_SIZE) { continue; }
        var idx = py * DRAW_GRID_SIZE + px;
        grid[idx] = paletteIndex;
        var o = idx * 4;
        imageData.data[o] = rgb.r;
        imageData.data[o + 1] = rgb.g;
        imageData.data[o + 2] = rgb.b;
        imageData.data[o + 3] = 255;
      }
    }
  }
}

function renderDrawPoll(div, poll, pollId, totalStudents) {
  var uniqueResponders = new Set();
  (poll.history || []).forEach(function(h) { uniqueResponders.add(h.username); });
  var pct = totalStudents > 0 ? Math.round((uniqueResponders.size / totalStudents) * 100) : 0;

  if (isTeacher) {
    var pDiv = document.createElement("div");
    pDiv.className = "poll-stat";
    pDiv.innerHTML = "<strong>🗳️ Responded: " + pct + "%</strong>";
    div.appendChild(pDiv);
  }

  if (isTeacher || poll.responsesVisible) {
    var gridDiv = document.createElement("div");
    gridDiv.className = "draw-thumb-grid";
    // Legacy drawings (submitted before the pixel-grid rework) still carry
    // an uploaded imageUrl -- render those as-is.
    (poll.history || []).forEach(function(e) {
      if (!e.imageUrl) { return; }
      var thumb = document.createElement("div");
      thumb.className = "draw-thumb";
      var img = document.createElement("img");
      img.src = e.imageUrl;
      (function(url) { img.onclick = function() { showImageLightbox(url); }; })(e.imageUrl);
      var label = document.createElement("span");
      label.textContent = e.username;
      thumb.appendChild(img);
      thumb.appendChild(label);
      gridDiv.appendChild(thumb);
    });
    // uniqueResponders already reflects every submission (legacy or new --
    // both write the same lightweight history marker), so this is a
    // reliable synchronous "has anyone responded at all" check even before
    // the async fetch below resolves.
    if (uniqueResponders.size === 0) {
      var emptyMsg = document.createElement("div");
      emptyMsg.className = "confusion-timeline-empty";
      emptyMsg.textContent = "No drawings submitted yet.";
      gridDiv.appendChild(emptyMsg);
    }
    div.appendChild(gridDiv);

    // New-format drawings (a 500x500 pixel grid, stored in its own
    // subcollection document per student rather than embedded in the poll
    // doc) are fetched asynchronously and appended once ready. This stays
    // fire-and-forget rather than making renderDrawPoll itself async --
    // code below (the student's own canvas/toolbar, and the isDisplayMode
    // placeholder) must not get delayed behind this fetch, since
    // poll.responsesVisible isn't gated on !isTeacher.
    (async function() {
      var drawingsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls", pollId, "drawings"));
      drawingsSnap.forEach(function(d) {
        var data = d.data();
        var thumb = document.createElement("div");
        thumb.className = "draw-thumb";
        var canvasEl = document.createElement("canvas");
        canvasEl.className = "draw-thumb-canvas";
        renderPixelGridToCanvas(canvasEl, data.pixels);
        (function(pixels) { canvasEl.onclick = function() { showPixelArtLightbox(pixels); }; })(data.pixels);
        var label = document.createElement("span");
        label.textContent = data.username;
        thumb.appendChild(canvasEl);
        thumb.appendChild(label);
        gridDiv.appendChild(thumb);
      });
    })();
  }

  if (!isTeacher && !isDisplayMode) {
    var hasSubmitted = (poll.history || []).some(function(h) { return h.username === username; });
    if (hasSubmitted) {
      var doneMsg = document.createElement("div");
      doneMsg.className = "poll-stat";
      doneMsg.innerHTML = "<strong>✓ Your drawing popped in!</strong>";
      div.appendChild(doneMsg);
      return;
    }

    var drawContainer = document.createElement("div");
    drawContainer.className = "draw-container";

    var toolbar = document.createElement("div");
    toolbar.className = "draw-toolbar";

    var canvasWrapper = document.createElement("div");
    canvasWrapper.className = "draw-canvas-wrapper";

    var canvas = document.createElement("canvas");
    canvas.className = "draw-canvas";
    canvas.width = DRAW_GRID_SIZE;
    canvas.height = DRAW_GRID_SIZE;
    var ctx = canvas.getContext("2d");
    // Pixel-grid state: `grid` (palette indices, 0 = background) is what
    // actually gets serialized and submitted; `imageData` is kept in sync
    // alongside it purely so each stroke can be redrawn with one
    // putImageData call instead of rebuilding the canvas from `grid` every time.
    var grid = new Uint8Array(DRAW_GRID_SIZE * DRAW_GRID_SIZE);
    var imageData = ctx.createImageData(DRAW_GRID_SIZE, DRAW_GRID_SIZE);
    for (var wi = 0; wi < imageData.data.length; wi++) { imageData.data[wi] = 255; } // all-white, fully opaque
    ctx.putImageData(imageData, 0, 0);

    var currentColorIndex = 1; // DRAW_PALETTE[0] is the background/eraser color
    var erasing = false;
    var brushSize = 4;

    var eraserCursor = document.createElement("div");
    eraserCursor.className = "draw-eraser-cursor";
    eraserCursor.style.display = "none";

    var colorBtns = DRAW_COLORS.map(function(c, i) {
      var swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "draw-color" + (i === 0 ? " draw-color-active" : "");
      swatch.style.background = c;
      swatch.onclick = function(e) {
        e.stopPropagation();
        erasing = false;
        currentColorIndex = i + 1;
        colorBtns.forEach(function(b) { b.classList.remove("draw-color-active"); });
        eraserBtn.classList.remove("draw-tool-active");
        swatch.classList.add("draw-color-active");
        eraserCursor.style.display = "none";
      };
      return swatch;
    });
    colorBtns.forEach(function(b) { toolbar.appendChild(b); });

    var eraserBtn = document.createElement("button");
    eraserBtn.type = "button";
    eraserBtn.className = "draw-color draw-eraser-btn";
    eraserBtn.innerHTML = ICONS.eraser;
    eraserBtn.title = "Eraser";
    eraserBtn.onclick = function(e) {
      e.stopPropagation();
      erasing = true;
      colorBtns.forEach(function(b) { b.classList.remove("draw-color-active"); });
      eraserBtn.classList.add("draw-tool-active");
    };
    toolbar.appendChild(eraserBtn);

    var sizeContainer = document.createElement("div");
    sizeContainer.className = "draw-size-container";
    var sizeSlider = document.createElement("input");
    sizeSlider.type = "range";
    sizeSlider.min = "1";
    sizeSlider.max = "20";
    sizeSlider.value = String(brushSize);
    sizeSlider.className = "draw-size-slider";
    sizeSlider.title = "Brush size";
    var sizeLabel = document.createElement("span");
    sizeLabel.className = "draw-size-label";
    sizeLabel.textContent = brushSize;
    sizeSlider.oninput = function() {
      brushSize = parseInt(sizeSlider.value, 10);
      sizeLabel.textContent = brushSize;
    };
    sizeContainer.appendChild(sizeSlider);
    sizeContainer.appendChild(sizeLabel);
    toolbar.appendChild(sizeContainer);

    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "secondary-btn";
    clearBtn.textContent = "Clear";
    clearBtn.onclick = function(e) {
      e.stopPropagation();
      grid.fill(0);
      for (var ci = 0; ci < imageData.data.length; ci++) { imageData.data[ci] = 255; }
      ctx.putImageData(imageData, 0, 0);
    };
    toolbar.appendChild(clearBtn);

    var expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "draw-expand-btn";
    expandBtn.innerHTML = ICONS.maximize;
    expandBtn.title = "Expand to full screen";
    var isFullscreen = false;
    var fullscreenPlaceholder = null;
    var fullscreenCleanupObserver = null;

    function exitFullscreen() {
      isFullscreen = false;
      drawContainer.classList.remove("draw-fullscreen");
      if (fullscreenPlaceholder && fullscreenPlaceholder.parentNode) {
        fullscreenPlaceholder.parentNode.replaceChild(drawContainer, fullscreenPlaceholder);
      }
      fullscreenPlaceholder = null;
      if (fullscreenCleanupObserver) { fullscreenCleanupObserver.disconnect(); fullscreenCleanupObserver = null; }
      expandBtn.innerHTML = ICONS.maximize;
      expandBtn.title = "Expand to full screen";
    }

    expandBtn.onclick = function(e) {
      e.stopPropagation();
      if (isFullscreen) { exitFullscreen(); return; }
      isFullscreen = true;
      // `position: fixed` is relative to the nearest ancestor with a
      // transform/filter/backdrop-filter, not necessarily the viewport --
      // and every .poll card has exactly that (a lingering identity
      // transform left behind by its entrance animation's fill-mode), which
      // is why fullscreen previously only expanded within the poll's own
      // box. Reparenting straight onto <body> sidesteps that regardless of
      // which ancestor (now or in the future) would otherwise trap it.
      fullscreenPlaceholder = document.createComment("draw-fullscreen-placeholder");
      drawContainer.parentNode.insertBefore(fullscreenPlaceholder, drawContainer);
      document.body.appendChild(drawContainer);
      drawContainer.classList.add("draw-fullscreen");
      expandBtn.innerHTML = ICONS.minimize;
      expandBtn.title = "Exit full screen";
      // Reparenting also lifts drawContainer out of pollSection, so it would
      // otherwise survive (and become a permanent orphan) across the full
      // innerHTML="" rebuild that loadPolls() does on every snapshot. Watch
      // for this specific poll's own container leaving the document and
      // tear the fullscreen overlay down if it does.
      fullscreenCleanupObserver = new MutationObserver(function() {
        if (!div.isConnected) {
          if (fullscreenCleanupObserver) { fullscreenCleanupObserver.disconnect(); fullscreenCleanupObserver = null; }
          drawContainer.remove();
          fullscreenPlaceholder = null;
          isFullscreen = false;
        }
      });
      fullscreenCleanupObserver.observe(document.body, { childList: true, subtree: true });
    };
    canvasWrapper.appendChild(canvas);
    canvasWrapper.appendChild(eraserCursor);
    canvasWrapper.appendChild(expandBtn);

    var submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = "Submit Drawing";

    var drawing = false;
    var lastPoint = null;
    function canvasPoint(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = DRAW_GRID_SIZE / rect.width;
      var scaleY = DRAW_GRID_SIZE / rect.height;
      return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }
    function stampAndRedraw(from, to) {
      stampLine(grid, imageData, from.x, from.y, to.x, to.y, brushSize, erasing ? 0 : currentColorIndex);
      ctx.putImageData(imageData, 0, 0);
    }
    // Shows a circle sized to the current brush at the pointer's position so
    // students can see exactly what area the eraser will cover -- only while
    // the eraser tool is active, not the color pen.
    function updateEraserCursor(e) {
      if (!erasing) { eraserCursor.style.display = "none"; return; }
      var rect = canvas.getBoundingClientRect();
      var cssPerCell = rect.width / DRAW_GRID_SIZE;
      var size = brushSize * cssPerCell;
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      eraserCursor.style.width = size + "px";
      eraserCursor.style.height = size + "px";
      eraserCursor.style.left = (x - size / 2) + "px";
      eraserCursor.style.top = (y - size / 2) + "px";
      eraserCursor.style.display = "block";
    }
    canvas.addEventListener("pointerdown", function(e) {
      e.preventDefault();
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      var p = canvasPoint(e);
      lastPoint = p;
      stampAndRedraw(p, p);
    });
    canvas.addEventListener("pointermove", function(e) {
      updateEraserCursor(e);
      if (!drawing) { return; }
      var p = canvasPoint(e);
      stampAndRedraw(lastPoint, p);
      lastPoint = p;
    });
    canvas.addEventListener("pointerenter", function(e) { updateEraserCursor(e); });
    canvas.addEventListener("pointerleave", function() { eraserCursor.style.display = "none"; });
    function stopDrawing() { drawing = false; lastPoint = null; }
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);

    (function(pid, sb) {
      sb.onclick = async function(e) {
        e.stopPropagation();
        sb.disabled = true;
        sb.textContent = "Submitting...";
        try {
          var pixelsString = packGridToString(grid);
          await addDoc(collection(db, "boards", currentBoardId, "polls", pid, "drawings"), {
            username: username, pixels: pixelsString, timestamp: Date.now()
          });
          await updateDoc(doc(db, "boards", currentBoardId, "polls", pid), {
            history: arrayUnion({ username: username, response: "Submitted a drawing", timestamp: Date.now() })
          });
          playPop();
          if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast"); }
        } catch (err) {
          console.error("Error submitting drawing:", err);
          alert("Something went wrong submitting your drawing. Please try again.");
          sb.disabled = false;
          sb.textContent = "Submit Drawing";
        }
      };
    })(pollId, submitBtn);

    drawContainer.appendChild(toolbar);
    drawContainer.appendChild(canvasWrapper);
    drawContainer.appendChild(submitBtn);
    div.appendChild(drawContainer);
  } else if (isDisplayMode) {
    var waitingEl = document.createElement("div");
    waitingEl.className = "poll-waiting-placeholder";
    waitingEl.textContent = "Waiting for responses…";
    div.appendChild(waitingEl);
  }
}

function renderMCPoll(div, poll, pollId, totalStudents) {
  var responsesShown = poll.responsesVisible === true;
  var correctShown = poll.correctVisible === true;
  var voters = poll.voters || [];
  var votes = getVotesArray(poll);
  var options = poll.options || [];
  var correctIndices = poll.correctIndices || [];
  var pct = totalStudents > 0 ? Math.round((voters.length / totalStudents) * 100) : 0;

  if (isTeacher) {
    var pDiv = document.createElement("div");
    pDiv.className = "poll-stat";
    pDiv.innerHTML = "<strong>🗳️ Responded: " + pct + "%</strong>";
    div.appendChild(pDiv);

    var chart = document.createElement("div");
    chart.className = "mc-bar-chart";
    var maxVotes = 1;
    for (var vi = 0; vi < votes.length; vi++) {
      if ((votes[vi] || 0) > maxVotes) { maxVotes = votes[vi] || 0; }
    }
    for (var oi = 0; oi < options.length; oi++) {
      var voteCount = Number(votes[oi]) || 0;
      var row = document.createElement("div");
      row.className = "mc-bar-row";
      var barLabel = document.createElement("div");
      barLabel.className = "mc-bar-label";
      barLabel.textContent = options[oi];
      var track = document.createElement("div");
      track.className = "mc-bar-track";
      var fill = document.createElement("div");
      fill.className = "mc-bar-fill";
      fill.style.background = correctIndices.indexOf(oi) !== -1 ? "#34c759" : "#ff453a";
      fill.style.width = (voteCount === 0 ? 0 : Math.max(4, (voteCount / maxVotes) * 100)) + "%";
      var countSpan = document.createElement("span");
      countSpan.className = "mc-bar-count";
      countSpan.textContent = voteCount;
      track.appendChild(fill);
      track.appendChild(countSpan);
      row.appendChild(barLabel);
      row.appendChild(track);
      chart.appendChild(row);
    }
    div.appendChild(chart);

    var logDiv = document.createElement("div");
    logDiv.className = "poll-log";
    logDiv.innerHTML = "<strong>Poll Log:</strong>";
    groupHistoryByStudent(poll.history).forEach(function(group) {
      var p = document.createElement("div");
      var lineText, isCorrect;
      if (poll.requireAllCorrect) {
        var finalSet = computeFinalMCState(poll, group.entries, true);
        var idxList = Array.from(finalSet).sort(function(a, b) { return a - b; });
        lineText = idxList.map(function(idx) { return options[idx]; }).join(", ");
        isCorrect = idxList.length === correctIndices.length && idxList.every(function(idx) { return correctIndices.indexOf(idx) !== -1; });
      } else {
        lineText = group.entries.map(function(e) { return mcHistoryActionPhrase(e.response); }).join(", ");
        var finalIdx = computeFinalMCState(poll, group.entries, false);
        isCorrect = finalIdx !== null && correctIndices.indexOf(finalIdx) !== -1;
      }
      p.textContent = (isCorrect ? "✓ " : "") + group.username + ": " + lineText;
      logDiv.appendChild(p);
    });
    div.appendChild(logDiv);

  } else {
    // Student view
    if (responsesShown) {
      var maxVotes = 1;
      for (var vi = 0; vi < votes.length; vi++) { if ((votes[vi] || 0) > maxVotes) { maxVotes = votes[vi] || 0; } }
      var chart = document.createElement("div");
      chart.className = "mc-bar-chart";
      for (var oi = 0; oi < options.length; oi++) {
        var voteCount = Number(votes[oi]) || 0;
        var row = document.createElement("div");
        row.className = "mc-bar-row";
        var barLabel = document.createElement("div");
        barLabel.className = "mc-bar-label";
        barLabel.textContent = options[oi];
        var track = document.createElement("div");
        track.className = "mc-bar-track";
        var fill = document.createElement("div");
        fill.className = "mc-bar-fill";
        if (correctShown) {
          fill.style.background = correctIndices.indexOf(oi) !== -1 ? "#34c759" : "#ff453a";
          var studentPicked = myPollVotes.get(pollId) === oi || (poll.requireAllCorrect && (myPollVotes.get(pollId + "_multi") || new Set()).has(oi));
          if (studentPicked) {
            row.style.cssText += "outline:2px solid #0071e3;border-radius:999px;";
            if (correctIndices.indexOf(oi) !== -1 && !celebratedPollIds.has(pollId)) {
              celebratedPollIds.add(pollId);
              triggerPopcornConfetti();
              playChime();
              if (navigator.vibrate) { navigator.vibrate([30, 50, 60]); }
              studentCorrectStreak++;
              if (studentCorrectStreak >= 3) { showStreakBadge(studentCorrectStreak); }
              // Medal celebration
              var myMedal = oi === correctIndices[0] ? (
                poll.correctIndices && poll.correctIndices.length > 0 ? null : null
              ) : null;
              var medals = ["🥇", "🥈", "🥉"];
              // Find student's rank among correct answerers by timestamp
              var myEntry = (poll.history || []).filter(function(h) {
                return h.username === username && (h.response || "").indexOf("Voted: ") === 0;
              }).sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
              var allCorrectEntries = (poll.history || []).filter(function(h) {
                var resp = h.response || "";
                if (resp.indexOf("Voted: ") !== 0) { return false; }
                var optText = resp.slice(7);
                var idx = (poll.options || []).indexOf(optText);
                return correctIndices.indexOf(idx) !== -1;
              });
              var uniqueCorrect = {};
              allCorrectEntries.forEach(function(h) {
                if (!uniqueCorrect[h.username] || h.timestamp < uniqueCorrect[h.username]) {
                  uniqueCorrect[h.username] = h.timestamp || 0;
                }
              });
              var sortedCorrect = Object.keys(uniqueCorrect).sort(function(a, b) {
                return uniqueCorrect[a] - uniqueCorrect[b];
              });
              var myRankAmongCorrect = sortedCorrect.indexOf(username);
              if (myRankAmongCorrect >= 0 && myRankAmongCorrect <= 2) {
                showMedalCelebration(medals[myRankAmongCorrect]);
              }
              // First to answer
              if (myRankAmongCorrect === 0) {
                setTimeout(function() {
                  showFirstBadge();
                  triggerLightningConfetti();
                  playThunderbolt();
                }, 2800);
              }
            } else {
              studentCorrectStreak = 0;
            }
          }
        } else {
          fill.style.background = "#0071e3";
          if (myPollVotes.get(pollId) === oi || (poll.requireAllCorrect && (myPollVotes.get(pollId + "_multi") || new Set()).has(oi))) {
            row.style.cssText += "outline:2px solid #0071e3;border-radius:999px;box-shadow:0 0 0 3px rgba(0,113,227,0.25);";
          }
        }
        fill.style.width = (voteCount === 0 ? 0 : Math.max(4, (voteCount / maxVotes) * 100)) + "%";
        var countSpan = document.createElement("span");
        countSpan.className = "mc-bar-count";
        countSpan.textContent = voteCount;
        track.appendChild(fill);
        track.appendChild(countSpan);
        row.appendChild(barLabel);
        row.appendChild(track);
        chart.appendChild(row);
      }
      div.appendChild(chart);
    } else {
      for (var oi = 0; oi < options.length; oi++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = options[oi];
        if (poll.requireAllCorrect) {
          var currentSet = myPollVotes.get(pollId + "_multi") || new Set();
          if (currentSet.has(oi)) { btn.classList.add("voted-by-me"); }
        } else {
          if (myPollVotes.get(pollId) === oi) { btn.classList.add("voted-by-me"); }
        }
        if (isDisplayMode) {
          btn.disabled = true;
          div.appendChild(btn);
          continue;
        }
        (function(optIndex, optText, pollData) {
          btn.onclick = async function(e) {
            e.stopPropagation();
            var pollRef = doc(db, "boards", currentBoardId, "polls", pollId);
            if (pollData.requireAllCorrect) {
              var currentSet = myPollVotes.get(pollId + "_multi") || new Set();
              if (currentSet.has(optIndex)) {
                currentSet.delete(optIndex);
                myPollVotes.set(pollId + "_multi", currentSet);
                playPop();
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(-1),
                  voters: currentSet.size === 0 ? arrayRemove(username) : arrayUnion(username),
                  history: arrayUnion({ username: username, response: "Removed vote: " + optText, timestamp: Date.now() })
                });
              } else {
                currentSet.add(optIndex);
                myPollVotes.set(pollId + "_multi", currentSet);
                playPop();
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(1),
                  voters: arrayUnion(username),
                  history: arrayUnion({ username: username, response: "Voted: " + optText, timestamp: Date.now() })
                });
              }
            } else {
              var prevChoice = myPollVotes.get(pollId);
              if (prevChoice === optIndex) {
                myPollVotes.delete(pollId);
                playPop();
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(-1),
                  voters: arrayRemove(username),
                  history: arrayUnion({ username: username, response: "Removed vote: " + optText, timestamp: Date.now() })
                });
                if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast", -1); }
              } else if (prevChoice === undefined || prevChoice === null) {
                // Fresh pick -- no prior selection to switch from.
                myPollVotes.set(pollId, optIndex);
                playPop();
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(1),
                  voters: arrayUnion(username),
                  history: arrayUnion({ username: username, response: "Voted: " + optText, timestamp: Date.now() })
                });
                if (currentStudentId) { await incrementStudentStat(currentStudentId, "pollsCast", 1); }
              } else {
                // Switching directly from one option to another, recorded as
                // its own distinct event (not a separate remove + vote pair)
                // so the poll log can show it as a single "changed vote" line.
                var prevOptText = (pollData.options || [])[prevChoice];
                myPollVotes.set(pollId, optIndex);
                playPop();
                await updateDoc(pollRef, {
                  ["votes." + optIndex]: increment(1),
                  ["votes." + prevChoice]: increment(-1),
                  history: arrayUnion({ username: username, response: "Changed vote: " + prevOptText + " to " + optText, timestamp: Date.now() })
                });
              }
            }
          };
        })(oi, options[oi], poll);
        div.appendChild(btn);
      }
    }
  }
}

// Scopes every metric to the current class session window
// [classSessionStartAt, classSessionEndAt || now] -- a fresh "Paused->Live"
// click moves winStart forward (that *is* "reset daily metrics," no data is
// ever deleted), and pausing freezes winEnd so the numbers stop advancing
// until the next session starts (per the confirmed "freeze while paused"
// decision). Posts/replies use their own `timestamp` (a Firestore
// Timestamp -- note the .toMillis() conversion, these are NOT plain
// numbers like confusionSetAt/history[].timestamp are). Polls have no
// single consistent timestamp field at all: `voters` (multiple-choice) is a
// flat array with no time info whatsoever and can never be session-
// windowed, so poll engagement is derived entirely from `history` entries
// (which DO carry a client Date.now() timestamp on every poll type) instead.
async function updateDailyDashboard() {
  if (!isTeacher || !currentBoardId) { return; }
  try {
    var winStart = classSessionStartAt || 0;
    var winEnd = classSessionEndAt || Date.now();
    function inWindow(ms) { return ms >= winStart && ms <= winEnd; }
    function firestoreTsInWindow(ts) { return !!ts && typeof ts.toMillis === "function" && inWindow(ts.toMillis()); }

    var postsSnap = await getDocs(collection(db, "boards", currentBoardId, "posts"));
    var repliesSnap = await getDocs(collection(db, "boards", currentBoardId, "replies"));
    var pollsSnap = await getDocs(collection(db, "boards", currentBoardId, "polls"));
    var studentsSnap = await getDocs(collection(db, "boards", currentBoardId, "students"));

    var postsInWindow = [];
    postsSnap.forEach(function(d) { var p = d.data(); if (firestoreTsInWindow(p.timestamp)) { postsInWindow.push(p); } });
    var repliesInWindow = [];
    repliesSnap.forEach(function(d) { var r = d.data(); if (firestoreTsInWindow(r.timestamp)) { repliesInWindow.push(r); } });

    var activeStudents = new Set();
    postsInWindow.forEach(function(p) { activeStudents.add(p.author); });
    repliesInWindow.forEach(function(r) { activeStudents.add(r.author); });
    pollsSnap.forEach(function(pd) {
      (pd.data().history || []).forEach(function(h) { if (inWindow(h.timestamp)) { activeStudents.add(h.username); } });
    });
    var attendance = activeStudents.size;
    var totalStudents = studentsSnap.size;

    var totalComments = 0;
    var totalUpvotes = 0;
    var anonCount = 0;
    var totalCommentCount = 0;
    postsInWindow.forEach(function(p) {
      totalComments++;
      totalCommentCount++;
      totalUpvotes += p.upvotes || 0;
      if (p.anonymous) { anonCount++; }
    });
    repliesInWindow.forEach(function(r) {
      totalCommentCount++;
      if (r.anonymous) { anonCount++; }
    });

    var pollParticipationSum = 0;
    var pollCount = 0;
    pollsSnap.forEach(function(pd) {
      var p = pd.data();
      var resp = new Set();
      (p.history || []).forEach(function(h) {
        if (!inWindow(h.timestamp)) { return; }
        // mc polls log both "Voted: X" and "Removed vote: X" to the same
        // history array -- only a vote should count toward participation.
        if (p.type === "mc" && h.response && h.response.indexOf("Removed vote: ") === 0) { return; }
        resp.add(h.username);
      });
      if (resp.size === 0) { return; }
      pollCount++;
      if (attendance > 0) { pollParticipationSum += resp.size / attendance; }
    });

    var engagementPct = pollCount > 0 ? Math.round((pollParticipationSum / pollCount) * 100) : 0;
    var anonPct = totalCommentCount > 0 ? Math.round((anonCount / totalCommentCount) * 100) : 0;
    var engDisplay = document.getElementById("dailyEngagementDisplay");
    var metricsText = document.getElementById("dailyMetricsText");
    if (engDisplay) { engDisplay.textContent = engagementPct + "% Engagement"; }
    if (metricsText) {
      metricsText.innerHTML = "Attendance: " + attendance + "/" + totalStudents + " &nbsp;|&nbsp; Upvotes: " + totalUpvotes + " &nbsp;|&nbsp; Comments: " + totalComments + " &nbsp;|&nbsp; Poll Participation: " + engagementPct + "% &nbsp;|&nbsp; 🥷🏼 Anonymity: " + anonPct + "%";
    }
  } catch (err) {
    console.error("Daily dashboard error:", err);
  }
  setTimeout(function() { updateDailyDashboard(); }, 60000);
}

function initStickyLeaderboard() {
  var card = leaderboardSection.querySelector(".leaderboard-card");
  if (!card) { return; }

  var existing = card.querySelector(".lb-compress-btn");
  if (existing) { existing.remove(); }

  var toggleBtn = document.createElement("button");
  toggleBtn.className = "lb-compress-btn";
  toggleBtn.textContent = isLeaderboardCompressed ? "∨" : "∧";
  toggleBtn.style.cssText = "position:absolute;bottom:8px;right:12px;width:28px;height:28px;border-radius:50%;padding:0;font-size:0.8rem;display:flex;align-items:center;justify-content:center;opacity:0.4;border:1.5px solid var(--border-color);background:transparent;color:var(--text-color);cursor:pointer;transition:all 0.3s ease;z-index:10;";
  toggleBtn.onmouseenter = function() { toggleBtn.style.opacity = "1"; };
  toggleBtn.onmouseleave = function() { toggleBtn.style.opacity = "0.4"; };
  toggleBtn.onclick = function(e) {
    e.stopPropagation();
    isLeaderboardCompressed = !isLeaderboardCompressed;
    toggleBtn.textContent = isLeaderboardCompressed ? "∨" : "∧";
    applyLeaderboardCompression(isLeaderboardCompressed, true);
  };
  card.style.position = "relative";
  card.appendChild(toggleBtn);

  // The board re-renders on every Firestore snapshot, which rebuilds these
  // rows from scratch — re-apply whatever compression state was already in
  // effect so a live score update doesn't silently reset the view to expanded.
  applyLeaderboardCompression(isLeaderboardCompressed, false);
}

function applyLeaderboardCompression(compress, animated) {
  var card = leaderboardSection.querySelector(".leaderboard-card");
  if (!card) { return; }
  var allRows = card.querySelectorAll(".lb-row");
  if (allRows.length === 0) { return; }
  var rows = [];
  var personalRow = null;
  allRows.forEach(function(row) {
    if (row.classList.contains("lb-personal-row")) { personalRow = row; }
    else { rows.push(row); }
  });
  var divider = card.querySelector(".lb-divider");
  var rowContainer = rows[0] ? rows[0].parentNode : (personalRow ? personalRow.parentNode : null);
  if (!rowContainer) { return; }

  if (animated) { playWhoosh(); }

  if (compress) {
    leaderboardSection.classList.add("lb-compressed");
    rows.forEach(function(row, i) {
      if (i >= LEADERBOARD_COMPACT_N) {
        row.style.opacity = "0";
        row.style.pointerEvents = "none";
      } else {
        row.style.opacity = "1";
      }
      row.style.top = (i * 28) + "px";

      var nameDiv = row.querySelector(".lb-name");
      var emoji = row.querySelector(".lb-emoji");

      // Move emoji out of nameDiv into row directly so it stays visible
      if (emoji && nameDiv && emoji.parentNode === nameDiv) {
        nameDiv.removeChild(emoji);
        emoji.style.cssText = "font-size:1.2rem;display:inline-block;transition:all 0.4s ease;flex-shrink:0;";
        row.insertBefore(emoji, nameDiv);
      }

      if (nameDiv) { nameDiv.style.cssText = "opacity:0;width:0;overflow:hidden;min-width:0;flex-shrink:1;transition:all 0.4s ease;"; }
      var medal = row.querySelector(".lb-medal");
      if (medal) { medal.style.cssText = "opacity:0;width:0;overflow:hidden;min-width:0;margin:0;transition:all 0.4s ease;"; }
      var score = row.querySelector(".lb-score");
      if (score) { score.style.cssText = "opacity:0;transition:opacity 0.4s ease;"; }
      var track = row.querySelector(".lb-bar-track");
      if (track) { track.style.height = "14px"; track.style.transition = "height 0.4s ease"; }
      var fill = row.querySelector(".lb-bar-fill");
      if (fill) {
        fill.style.height = "14px";
        fill.style.transition = "height 0.4s ease";
        fill.style.backgroundSize = "300% 100%";
      }
    });

    if (divider) { divider.style.cssText += "opacity:0;height:0;pointer-events:none;"; }
    if (personalRow) {
      var compactShown = Math.min(rows.length, LEADERBOARD_COMPACT_N);
      personalRow.style.opacity = "1";
      personalRow.style.pointerEvents = "";
      personalRow.style.top = (compactShown * 28) + "px";

      var pNameDiv = personalRow.querySelector(".lb-name");
      var pEmoji = personalRow.querySelector(".lb-emoji");
      if (pEmoji && pNameDiv && pEmoji.parentNode === pNameDiv) {
        pNameDiv.removeChild(pEmoji);
        pEmoji.style.cssText = "font-size:1.2rem;display:inline-block;transition:all 0.4s ease;flex-shrink:0;";
        personalRow.insertBefore(pEmoji, pNameDiv);
      }
      if (pNameDiv) { pNameDiv.style.cssText = "opacity:0;width:0;overflow:hidden;min-width:0;flex-shrink:1;transition:all 0.4s ease;"; }
      // Exception: the personal row keeps its "#N" placement visible even
      // though every other row's medal/score text is hidden in compact mode.
      var pMedal = personalRow.querySelector(".lb-medal");
      if (pMedal) { pMedal.style.cssText = "opacity:1;width:auto;overflow:visible;min-width:0;margin-left:6px;font-size:0.72rem;font-weight:700;color:var(--text-secondary);pointer-events:auto;transition:all 0.4s ease;"; }
      var pScore = personalRow.querySelector(".lb-score");
      if (pScore) { pScore.style.cssText = "opacity:0;transition:opacity 0.4s ease;"; }
      var pTrack = personalRow.querySelector(".lb-bar-track");
      if (pTrack) { pTrack.style.height = "14px"; pTrack.style.transition = "height 0.4s ease"; }
      var pFill = personalRow.querySelector(".lb-bar-fill");
      if (pFill) { pFill.style.height = "14px"; pFill.style.transition = "height 0.4s ease"; }
    }

    var compactCount = Math.min(rows.length, LEADERBOARD_COMPACT_N) + (personalRow ? 1 : 0);
    rowContainer.style.height = (compactCount * 28) + "px";
    rowContainer.style.transition = "height 0.4s ease";

  } else {
    leaderboardSection.classList.remove("lb-compressed");
    var ROW_HEIGHT = 48;
    var DIVIDER_HEIGHT = 24;
    rows.forEach(function(row, i) {
      row.style.opacity = "1";
      row.style.pointerEvents = "";
      row.style.top = (i * ROW_HEIGHT) + "px";

      var nameDiv = row.querySelector(".lb-name");
      var emoji = row.querySelector(".lb-emoji");

      // Move emoji back inside nameDiv
      if (emoji && nameDiv && emoji.parentNode === row) {
        row.removeChild(emoji);
        emoji.style.cssText = "display:inline-block;transition:all 0.4s ease;";
        nameDiv.insertBefore(emoji, nameDiv.firstChild);
      }

      if (nameDiv) { nameDiv.style.cssText = "width:110px;opacity:1;overflow:visible;min-width:110px;transition:all 0.4s ease;display:flex;align-items:center;gap:5px;justify-content:flex-end;"; }
      var medal = row.querySelector(".lb-medal");
      if (medal) { medal.style.cssText = "opacity:1;width:auto;font-size:1.1rem;margin-left:6px;flex-shrink:0;transition:all 0.4s ease;"; }
      var score = row.querySelector(".lb-score");
      if (score) { score.style.cssText = "font-size:0.78rem;font-weight:700;color:white;white-space:nowrap;opacity:1;transition:opacity 0.4s ease;"; }
      var track = row.querySelector(".lb-bar-track");
      if (track) { track.style.height = "30px"; track.style.transition = "height 0.4s ease"; }
      var fill = row.querySelector(".lb-bar-fill");
      if (fill) {
        fill.style.height = "100%";
        fill.style.transition = "height 0.4s ease, width 0.5s ease";
        fill.style.backgroundSize = "300% 100%";
      }
    });

    var dividerTop = rows.length * ROW_HEIGHT;
    if (divider) { divider.style.cssText += "opacity:1;height:" + DIVIDER_HEIGHT + "px;top:" + dividerTop + "px;pointer-events:none;"; }
    if (personalRow) {
      personalRow.style.opacity = "1";
      personalRow.style.pointerEvents = "";
      personalRow.style.top = (dividerTop + (divider ? DIVIDER_HEIGHT : 0)) + "px";

      var pNameDiv2 = personalRow.querySelector(".lb-name");
      var pEmoji2 = personalRow.querySelector(".lb-emoji");
      if (pEmoji2 && pNameDiv2 && pEmoji2.parentNode === personalRow) {
        personalRow.removeChild(pEmoji2);
        pEmoji2.style.cssText = "display:inline-block;transition:all 0.4s ease;";
        pNameDiv2.insertBefore(pEmoji2, pNameDiv2.firstChild);
      }
      if (pNameDiv2) { pNameDiv2.style.cssText = "width:110px;opacity:1;overflow:visible;min-width:110px;transition:all 0.4s ease;display:flex;align-items:center;gap:5px;justify-content:flex-end;"; }
      var pMedal2 = personalRow.querySelector(".lb-medal");
      if (pMedal2) { pMedal2.style.cssText = "opacity:1;width:auto;font-size:1.1rem;margin-left:6px;flex-shrink:0;color:var(--text-secondary);transition:all 0.4s ease;"; }
      var pScore2 = personalRow.querySelector(".lb-score");
      if (pScore2) { pScore2.style.cssText = "font-size:0.78rem;font-weight:700;color:white;white-space:nowrap;opacity:1;transition:opacity 0.4s ease;"; }
      var pTrack2 = personalRow.querySelector(".lb-bar-track");
      if (pTrack2) { pTrack2.style.height = "30px"; pTrack2.style.transition = "height 0.4s ease"; }
      var pFill2 = personalRow.querySelector(".lb-bar-fill");
      if (pFill2) { pFill2.style.height = "100%"; pFill2.style.transition = "height 0.4s ease, width 0.5s ease"; }
    }

    rowContainer.style.height = (rows.length * ROW_HEIGHT + (personalRow ? DIVIDER_HEIGHT + ROW_HEIGHT : 0)) + "px";
    rowContainer.style.transition = "height 0.4s ease";
  }
}

function initStickyCommentBar() {
  var newPost = document.getElementById("newPost");
  var postInput = document.getElementById("postInput");
  var cancelBtn = document.getElementById("cancelPostBtn");
  if (!newPost || !postInput) { return; }

  postInput.addEventListener("focus", function() {
    newPost.classList.remove("comment-collapsed");
    newPost.classList.add("comment-expanded");
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() {
      postInput.value = "";
      postImageFile = null;
      document.getElementById("postImagePreview").innerHTML = "";
      document.getElementById("postImageInput").value = "";
      if (document.getElementById("anonymousToggle")) { document.getElementById("anonymousToggle").checked = false; }
      postInput.blur();
      newPost.classList.remove("comment-expanded");
      newPost.classList.add("comment-collapsed");
    });
  }
}

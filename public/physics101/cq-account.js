// Custom Quiz account save. When the library was opened from a PopBoard (?board=&student=) and the student
// is signed in, each finished session merges into their own student record as `studyQuiz` (shape in
// docs/physics101-custom-quiz.md). This is a field on boards/{b}/students/{s}, which the existing rules
// already let the owning student update; no rules change. Logged out (or any failure): local only.
import { shouldUseEmulators, normalizeId } from "../board-return.js?v=20261022a";
import { mergeProfile } from "./cq-core.js";

const P = new URLSearchParams(location.search);
const board = normalizeId(P.get("board") || ""), student = normalizeId(P.get("student") || "");
// same public web config as study.html and app.js
const CONFIG = {
  apiKey: "AIzaSyClkHjUnQ96VNRj1FxyY-ca-AcDWYoX_m8",
  authDomain: "hotseat-4f661.firebaseapp.com",
  projectId: "hotseat-4f661",
  storageBucket: "hotseat-4f661.firebasestorage.app",
  messagingSenderId: "1052089495081",
  appId: "1:1052089495081:web:15293be177ad3a6f577638"
};
let fb = null;
async function firebase() {
  if (!board || !student) return null;
  if (fb) return fb;
  fb = (async () => {
    const appMod = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const fs = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const au = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(CONFIG);
    const db = fs.getFirestore(app), auth = au.getAuth(app);
    if (shouldUseEmulators(location.hostname, location.search)) { au.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }); fs.connectFirestoreEmulator(db, "127.0.0.1", 8080); }
    if (auth.authStateReady) await auth.authStateReady();
    if (!auth.currentUser) return null;
    const ref = fs.doc(db, "boards", board, "students", student);
    const snap = await fs.getDoc(ref);
    if (!snap.exists() || snap.data().uid !== auth.currentUser.uid) return null; // only the owner writes
    return { fs, ref, profile: snap.data().studyQuiz || null };
  })().catch((e) => { console.warn("custom quiz: account unavailable, saving on this device only", e); return null; });
  return fb;
}
export async function accountProfile() { const f = await firebase(); return f ? f.profile : null; }
export async function saveSession(rec) {
  const f = await firebase(); if (!f) return false;
  try { f.profile = mergeProfile(f.profile, rec); await f.fs.updateDoc(f.ref, { studyQuiz: f.profile }); return true; }
  catch (e) { console.warn("custom quiz: account save failed", e); return false; }
}

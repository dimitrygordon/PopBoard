// Run with: cd tests && npm install && npm test
// Uses the Firestore + Storage emulators with project "demo-popboard", so no
// Firebase login or real project is touched.
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment, assertSucceeds, assertFails
} from "@firebase/rules-unit-testing";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, arrayUnion, arrayRemove, increment, collection, getDocs
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let env;
const B = "board1";

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-popboard",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync(new URL("../storage.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 9199 }
  });
});
after(async () => { await env.cleanup(); });

// Seed: admin, approved teacher T (owns board1), pending teacher P,
// student alice (uid a1, anonymous) and a teacher-created, unclaimed "carol".
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "admins/admin1"), { role: "admin" });
    await setDoc(doc(db, "teachers/T"), { name: "Ms T", approved: true });
    await setDoc(doc(db, "teachers/P"), { name: "Mr P", approved: false });
    await setDoc(doc(db, `boards/${B}`), { name: "Physics", ownerUid: "T", teacherAccount: "Ms T" });
    await setDoc(doc(db, `boards/${B}/students/sA`), { username: "alice", uid: "a1", secured: false, historicalUpvotesReceived: 0 });
    await setDoc(doc(db, `boards/${B}/names/alice`), { studentId: "sA", uid: "a1", secured: false });
    await setDoc(doc(db, `boards/${B}/members/a1`), { studentId: "sA", username: "alice" });
    await setDoc(doc(db, `boards/${B}/students/sC`), { username: "carol", uid: null, secured: false });
    await setDoc(doc(db, `boards/${B}/names/carol`), { studentId: "sC", uid: null, secured: false });
    await setDoc(doc(db, `boards/${B}/posts/p1`), { author: "alice", authorUid: "a1", text: "hi", upvotes: 0, upvoters: [], upvoteHistory: [] });
    await setDoc(doc(db, `boards/${B}/polls/q1`), { question: "2+2?", options: ["3", "4"], votes: {}, voters: [], history: [] });
    await setDoc(doc(db, `boards/${B}/leaderboard/alice`), { score: 1 });
  });
});

const anon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const withEmail = (uid) => env.authenticatedContext(uid, { email: uid + "@students.popboard.invalid", firebase: { sign_in_provider: "password" } }).firestore();
const user = (uid) => env.authenticatedContext(uid).firestore();
const nobody = () => env.unauthenticatedContext().firestore();

function joinBatch(db, uid, sid, name) {
  const b = writeBatch(db);
  b.set(doc(db, `boards/${B}/students/${sid}`), { username: name, uid, secured: false, historicalUpvotesReceived: 0 });
  b.set(doc(db, `boards/${B}/names/${name}`), { studentId: sid, uid, secured: false });
  b.set(doc(db, `boards/${B}/members/${uid}`), { studentId: sid, username: name });
  return b;
}

// ---------- basics ----------
test("signed-out visitors can't read anything", async () => {
  await assertFails(getDoc(doc(nobody(), `boards/${B}`)));
  await assertFails(getDoc(doc(nobody(), `boards/${B}/posts/p1`)));
});
test("nobody can write admins/*", async () => {
  await assertFails(setDoc(doc(user("x"), "admins/x"), { role: "admin" }));
  await assertFails(setDoc(doc(user("admin1"), "admins/x"), { role: "admin" }));
});

// ---------- teachers ----------
test("a new teacher can create their own profile only unapproved", async () => {
  await assertSucceeds(setDoc(doc(user("N"), "teachers/N"), { name: "New", approved: false }));
  await assertFails(setDoc(doc(user("N2"), "teachers/N2"), { name: "New", approved: true }));
  await assertFails(setDoc(doc(user("N3"), "teachers/someoneElse"), { name: "X", approved: false }));
});
test("a teacher can't approve themselves; an admin can", async () => {
  await assertFails(updateDoc(doc(user("P"), "teachers/P"), { approved: true }));
  await assertSucceeds(updateDoc(doc(user("admin1"), "teachers/P"), { approved: true }));
});
test("only approved teachers can create boards, owned by themselves", async () => {
  await assertFails(setDoc(doc(user("P"), "boards/b2"), { name: "X", ownerUid: "P" }));
  await assertSucceeds(setDoc(doc(user("T"), "boards/b3"), { name: "Y", ownerUid: "T" }));
  await assertFails(setDoc(doc(user("T"), "boards/b4"), { name: "Z", ownerUid: "someoneElse" }));
});
test("another teacher can't change or read inside someone else's board", async () => {
  await assertFails(updateDoc(doc(user("P"), `boards/${B}`), { name: "hacked" }));
  await assertFails(getDoc(doc(user("P"), `boards/${B}/posts/p1`)));
  await assertFails(getDoc(doc(user("P"), `boards/${B}/students/sA`)));
});
test("the board's teacher and admins can manage it", async () => {
  await assertSucceeds(updateDoc(doc(user("T"), `boards/${B}`), { leaderboardVisible: false }));
  await assertSucceeds(deleteDoc(doc(user("admin1"), `boards/${B}/posts/p1`)));
  await assertFails(updateDoc(doc(user("T"), `boards/${B}`), { ownerUid: "P" }));
});
test("study links: only the owning teacher writes; signed-in users read", async () => {
  await assertSucceeds(setDoc(doc(user("T"), "teachers/T/studyLinks/l1"), { title: "x" }));
  await assertFails(setDoc(doc(user("P"), "teachers/T/studyLinks/l2"), { title: "x" }));
  await assertFails(setDoc(doc(user("P"), "teachers/P/studyLinks/l3"), { title: "unapproved" }));
  await assertSucceeds(getDocs(collection(anon("zz"), "teachers/T/studyLinks")));
});

// ---------- teacher names (name + password sign-in) ----------
const teacherCtx = (uid, email) => env.authenticatedContext(uid, { email, firebase: { sign_in_provider: "password" } }).firestore();
async function seedTeacherNameDoc() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/T"), { name: "Ms T", approved: true, email: "t@school.edu" });
    await setDoc(doc(ctx.firestore(), "teacherNames/ms t"), { uid: "T", email: "t@school.edu", name: "Ms T" });
  });
}
test("teacherNames: anyone (even signed out) can look up one name, but nobody can list them", async () => {
  await seedTeacherNameDoc();
  await assertSucceeds(getDoc(doc(nobody(), "teacherNames/ms t")));
  await assertSucceeds(getDoc(doc(nobody(), "teacherNames/nobody-here")));
  await assertFails(getDocs(collection(nobody(), "teacherNames")));
  await assertFails(getDocs(collection(anon("zz"), "teacherNames")));
  await assertFails(getDocs(collection(user("admin1"), "teacherNames")));
});
test("teacherNames: a teacher can claim their own profile name, mapped to their own uid and email", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/N"), { name: "Mr New", approved: false, email: "new@school.edu" });
  });
  const db = teacherCtx("N", "new@school.edu");
  await assertSucceeds(setDoc(doc(db, "teacherNames/mr new"), { uid: "N", email: "new@school.edu", name: "Mr New" }));
});
test("teacherNames: can't point a name at someone else's uid or email", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/N"), { name: "Mr New", approved: false, email: "new@school.edu" });
  });
  const db = teacherCtx("N", "new@school.edu");
  await assertFails(setDoc(doc(db, "teacherNames/mr new"), { uid: "T", email: "new@school.edu", name: "Mr New" }));
  await assertFails(setDoc(doc(db, "teacherNames/mr new"), { uid: "N", email: "victim@school.edu", name: "Mr New" }));
  await assertFails(setDoc(doc(db, "teacherNames/mr new"), { uid: "N", email: "new@school.edu", name: "Mr New", approved: true }));
});
test("teacherNames: the doc id must be the lowercased name on the caller's teacher profile", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/N"), { name: "Mr New", approved: false, email: "new@school.edu" });
  });
  const db = teacherCtx("N", "new@school.edu");
  await assertFails(setDoc(doc(db, "teacherNames/Mr New"), { uid: "N", email: "new@school.edu", name: "Mr New" }));
  await assertFails(setDoc(doc(db, "teacherNames/principal"), { uid: "N", email: "new@school.edu", name: "Principal" }));
  // no teacher profile at all
  await assertFails(setDoc(doc(teacherCtx("X", "x@school.edu"), "teacherNames/x"), { uid: "X", email: "x@school.edu", name: "X" }));
});
test("teacherNames: anonymous users and student accounts can't claim names", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/a1"), { name: "alice", approved: false });
  });
  await assertFails(setDoc(doc(anon("a1"), "teacherNames/alice"), { uid: "a1", email: null, name: "alice" }));
  await assertFails(setDoc(doc(withEmail("a1"), "teacherNames/alice"), { uid: "a1", email: "a1@students.popboard.invalid", name: "alice" }));
});
test("teacherNames: names are unique (case-insensitive) and can't be overwritten", async () => {
  await seedTeacherNameDoc();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "teachers/E"), { name: "MS T", approved: false, email: "evil@x.com" });
  });
  const evil = teacherCtx("E", "evil@x.com");
  await assertFails(setDoc(doc(evil, "teacherNames/ms t"), { uid: "E", email: "evil@x.com", name: "MS T" }));
  await assertFails(updateDoc(doc(evil, "teacherNames/ms t"), { email: "evil@x.com" }));
  // even the owner can't edit in place (delete + re-create instead)
  await assertFails(updateDoc(doc(teacherCtx("T", "t@school.edu"), "teacherNames/ms t"), { email: "other@school.edu" }));
});
test("teacherNames: only the owner or an admin can delete", async () => {
  await seedTeacherNameDoc();
  await assertFails(deleteDoc(doc(teacherCtx("E", "evil@x.com"), "teacherNames/ms t")));
  await assertFails(deleteDoc(doc(nobody(), "teacherNames/ms t")));
  await assertSucceeds(deleteDoc(doc(user("admin1"), "teacherNames/ms t")));
  await seedTeacherNameDoc();
  await assertSucceeds(deleteDoc(doc(teacherCtx("T", "t@school.edu"), "teacherNames/ms t")));
});

// ---------- students joining ----------
test("an anonymous student can join with a new name", async () => {
  await assertSucceeds(joinBatch(anon("b1"), "b1", "sB", "bob").commit());
});
test("a student can't register under someone else's uid", async () => {
  await assertFails(joinBatch(anon("b1"), "zzz", "sB", "bob").commit());
});
test("a student can't take a name that's already registered", async () => {
  await assertFails(joinBatch(anon("evil"), "evil", "sX", "alice").commit());
  await assertFails(updateDoc(doc(anon("evil"), `boards/${B}/names/alice`), { uid: "evil" }));
});
test("a member can't create a second student record", async () => {
  await assertFails(joinBatch(anon("a1"), "a1", "sA2", "alice2").commit());
});
test("a student can claim a teacher-created name, once", async () => {
  const db = anon("c1");
  const b = writeBatch(db);
  b.update(doc(db, `boards/${B}/students/sC`), { uid: "c1" });
  b.update(doc(db, `boards/${B}/names/carol`), { uid: "c1" });
  b.set(doc(db, `boards/${B}/members/c1`), { studentId: "sC", username: "carol" });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(doc(anon("c2"), `boards/${B}/students/sC`), { uid: "c2" }));
});
test("a member can't point their membership at another student", async () => {
  await assertFails(setDoc(doc(anon("m9"), `boards/${B}/members/m9`), { studentId: "sA", username: "alice" }));
});
test("protecting a name needs an email-linked (password) account", async () => {
  await assertFails(updateDoc(doc(anon("a1"), `boards/${B}/names/alice`), { secured: true, authSalt: "s" }));
  await assertSucceeds(updateDoc(doc(withEmail("a1"), `boards/${B}/names/alice`), { secured: true, authSalt: "s" }));
  await assertSucceeds(updateDoc(doc(withEmail("a1"), `boards/${B}/students/sA`), { secured: true }));
  await assertFails(updateDoc(doc(withEmail("zz"), `boards/${B}/names/alice`), { secured: true, authSalt: "x" }));
});
test("a student can update their own record but not their name or uid", async () => {
  const db = anon("a1");
  await assertSucceeds(updateDoc(doc(db, `boards/${B}/students/sA`), { emoji: "🍿", handRaised: true }));
  await assertFails(updateDoc(doc(db, `boards/${B}/students/sA`), { username: "teacher" }));
  await assertFails(updateDoc(doc(db, `boards/${B}/students/sA`), { gold: 99 }));
  await assertFails(updateDoc(doc(anon("b1"), `boards/${B}/students/sA`), { emoji: "x" }));
});
test("members can only see their own membership doc", async () => {
  await assertSucceeds(getDoc(doc(anon("a1"), `boards/${B}/members/a1`)));
  await assertFails(getDoc(doc(anon("a1"), `boards/${B}/members/zz`)));
});

// ---------- posts, upvotes, polls ----------
test("posts must carry the poster's own name and uid", async () => {
  const db = anon("a1");
  await assertSucceeds(setDoc(doc(db, `boards/${B}/posts/p2`), { author: "alice", authorUid: "a1", text: "ok", upvotes: 0, upvoters: [], upvoteHistory: [] }));
  await assertFails(setDoc(doc(db, `boards/${B}/posts/p3`), { author: "carol", authorUid: "a1", text: "fake" }));
  await assertFails(setDoc(doc(anon("outsider"), `boards/${B}/posts/p4`), { author: "x", authorUid: "outsider", text: "no" }));
});
test("anonymous posts: no author on the post; hidden author is teacher-only", async () => {
  const db = anon("a1");
  const b = writeBatch(db);
  b.set(doc(db, `boards/${B}/posts/anon1`), { author: "", anonymous: true, text: "secret q", upvotes: 0, upvoters: [], upvoteHistory: [] });
  b.set(doc(db, `boards/${B}/postAuthors/anon1`), { author: "alice", authorUid: "a1", kind: "posts" });
  await assertSucceeds(b.commit());
  // other students can read the post but not who wrote it
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `boards/${B}/members/b1`), { studentId: "sB", username: "bob" });
  });
  await assertSucceeds(getDoc(doc(anon("b1"), `boards/${B}/posts/anon1`)));
  await assertFails(getDoc(doc(anon("b1"), `boards/${B}/postAuthors/anon1`)));
  await assertFails(getDoc(doc(anon("a1"), `boards/${B}/postAuthors/anon1`)));
  await assertSucceeds(getDoc(doc(user("T"), `boards/${B}/postAuthors/anon1`)));
});
test("anonymous posts can't leak or fake the author", async () => {
  const db = anon("a1");
  // author name on an anonymous post is rejected
  await assertFails(setDoc(doc(db, `boards/${B}/posts/anon2`), { author: "alice", anonymous: true, text: "x" }));
  // anonymous post without the hidden-author record is rejected
  await assertFails(setDoc(doc(db, `boards/${B}/posts/anon3`), { author: "", anonymous: true, text: "x" }));
  // can't file the hidden author under someone else's name
  const b = writeBatch(db);
  b.set(doc(db, `boards/${B}/posts/anon4`), { author: "", anonymous: true, text: "x" });
  b.set(doc(db, `boards/${B}/postAuthors/anon4`), { author: "carol", authorUid: "a1", kind: "posts" });
  await assertFails(b.commit());
});
test("anonymous replies work the same way", async () => {
  const db = anon("a1");
  const b = writeBatch(db);
  b.set(doc(db, `boards/${B}/replies/r1`), { postId: "p1", author: "", anonymous: true, text: "re" });
  b.set(doc(db, `boards/${B}/postAuthors/r1`), { author: "alice", authorUid: "a1", kind: "replies" });
  await assertSucceeds(b.commit());
  await assertSucceeds(setDoc(doc(db, `boards/${B}/replies/r2`), { postId: "p1", author: "alice", authorUid: "a1", anonymous: false, text: "signed" }));
  await assertFails(setDoc(doc(db, `boards/${B}/replies/r3`), { postId: "p1", author: "carol", authorUid: "a1", anonymous: false, text: "fake" }));
});
test("upvotes: only your own name, one at a time", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `boards/${B}/members/b1`), { studentId: "sB", username: "bob" });
  });
  const db = anon("b1");
  const p = doc(db, `boards/${B}/posts/p1`);
  await assertSucceeds(updateDoc(p, { upvoters: arrayUnion("bob"), upvotes: increment(1), upvoteHistory: arrayUnion({ username: "bob", action: "Upvoted", timestamp: 1 }) }));
  await assertSucceeds(updateDoc(p, { upvoters: arrayRemove("bob"), upvotes: increment(-1), upvoteHistory: arrayUnion({ username: "bob", action: "Removed Upvote", timestamp: 2 }) }));
  await assertFails(updateDoc(p, { upvoters: arrayUnion("carol"), upvotes: increment(1) }));
  await assertFails(updateDoc(p, { upvotes: increment(5) }));
  await assertFails(updateDoc(p, { text: "edited by someone else" }));
  await assertFails(updateDoc(p, { upvoteHistory: arrayUnion({ username: "carol", action: "Upvoted", timestamp: 3 }) }));
});
test("poll votes: only your own name; can't edit the question", async () => {
  const db = anon("a1");
  const q = doc(db, `boards/${B}/polls/q1`);
  await assertSucceeds(updateDoc(q, { "votes.1": increment(1), voters: arrayUnion("alice"), history: arrayUnion({ username: "alice", response: "Voted: 4", timestamp: 1 }) }));
  await assertFails(updateDoc(q, { history: arrayUnion({ username: "carol", response: "Voted: 3", timestamp: 2 }) }));
  await assertFails(updateDoc(q, { voters: arrayUnion("carol") }));
  await assertFails(updateDoc(q, { question: "hacked" }));
  await assertFails(updateDoc(q, { history: [] })); // can't wipe others' history
});
test("drawings must be under your own name", async () => {
  const db = anon("a1");
  await assertSucceeds(setDoc(doc(db, `boards/${B}/polls/q1/drawings/d1`), { username: "alice", pixels: "" }));
  await assertFails(setDoc(doc(db, `boards/${B}/polls/q1/drawings/d2`), { username: "carol", pixels: "" }));
});
test("leaderboard: students can set only their own emoji/nickname", async () => {
  const db = anon("a1");
  await assertSucceeds(updateDoc(doc(db, `boards/${B}/leaderboard/alice`), { emoji: "🍿" }));
  await assertFails(updateDoc(doc(db, `boards/${B}/leaderboard/alice`), { score: 999 }));
  await assertSucceeds(updateDoc(doc(user("T"), `boards/${B}/leaderboard/alice`), { score: 2 }));
});
test("upvote credit to another student is limited to +1 'upvotes received'", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `boards/${B}/members/b1`), { studentId: "sB", username: "bob" });
  });
  const db = anon("b1");
  await assertSucceeds(updateDoc(doc(db, `boards/${B}/students/sA`), { historicalUpvotesReceived: 1, monthlyStats: {} }));
  await assertFails(updateDoc(doc(db, `boards/${B}/students/sA`), { historicalUpvotesReceived: 50 }));
  await assertFails(updateDoc(doc(db, `boards/${B}/students/sA`), { confusionState: "red" }));
});
test("seats are teacher-only to change", async () => {
  await assertFails(setDoc(doc(anon("a1"), `boards/${B}/seats/s1`), { x: 1, y: 1 }));
  await assertSucceeds(setDoc(doc(user("T"), `boards/${B}/seats/s1`), { x: 1, y: 1 }));
});

// ---------- storage ----------
test("storage: members may upload images under 5 MB; others may not", async () => {
  const img = new Uint8Array([137, 80, 78, 71]);
  const st = (uid) => env.authenticatedContext(uid).storage();
  await assertSucceeds(uploadBytes(ref(st("a1"), `boards/${B}/posts/1-a.png`), img, { contentType: "image/png" }));
  await assertSucceeds(uploadBytes(ref(st("T"), `boards/${B}/posts/2-a.png`), img, { contentType: "image/png" }));
  await assertFails(uploadBytes(ref(st("outsider"), `boards/${B}/posts/3-a.png`), img, { contentType: "image/png" }));
  await assertFails(uploadBytes(ref(st("a1"), `boards/${B}/posts/4-a.html`), img, { contentType: "text/html" }));
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), `boards/${B}/posts/5.png`), img, { contentType: "image/png" }));
});

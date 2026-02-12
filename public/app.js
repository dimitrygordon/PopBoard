// https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js   ← updated to latest as of Feb 2026
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy,
  doc, updateDoc, deleteDoc, getDoc, getDocs, setDoc, increment, arrayUnion, runTransaction
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// ── Config ────────────────────────────────────────────────────────────────
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
const auth = getAuth(app);

// ── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let currentBoardId = null;
let isTeacher = false;
let sortMode = "new";
let myUpvotedPosts = new Set();
let myPollVotes = new Map(); // pollId → {type: "mc"/"free", value: index or text}
let topSortCache = [];
let topSortTimer = null;

// ── DOM ───────────────────────────────────────────────────────────────────
const loginDiv       = document.getElementById("login");
const popboardsDiv   = document.getElementById("popboards");
const appDiv         = document.getElementById("app");
const boardSelect    = document.getElementById("boardSelect");
const boardSelection = document.getElementById("boardSelection");
const boardsList     = document.getElementById("boardsList");
const newBoardName   = document.getElementById("newBoardName");
const createBoardBtn = document.getElementById("createBoardBtn");
const usernameInput  = document.getElementById("usernameInput");
const anonToggle     = document.getElementById("anonToggle");
const joinBtn        = document.getElementById("joinBtn");
const postInput      = document.getElementById("postInput");
const anonPostToggle = document.getElementById("anonPostToggle");
const postBtn        = document.getElementById("postBtn");
const sortSelect     = document.getElementById("sortSelect");
const postsDiv       = document.getElementById("posts");
const pollSection    = document.getElementById("pollSection");
const themeToggle    = document.getElementById("themeToggle");
const teacherBtn     = document.getElementById("teacherBtn");
const backBtns       = document.querySelectorAll("#backToBoards");

// ── Theme ─────────────────────────────────────────────────────────────────
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  let theme = localStorage.getItem("theme");
  if (!theme) theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(theme);
}

themeToggle.onclick = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
loadTheme();

// ── Auth & Join ───────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => { currentUser = user; });

async function join() {
  const name = usernameInput.value.trim();
  if (!name) return alert("Enter a name");

  await signInAnonymously(auth).catch(err => alert("Auth error: " + err.message));

  const anon = anonToggle.checked;
  currentUser = { uid: auth.currentUser.uid, displayName: name, isAnonymous: anon };

  const boardsSnap = await getDocs(collection(db, "boards"));
  if (boardsSnap.empty && name !== "dagpopboard") {
    alert("No PopBoards yet. Teacher must create one.");
    return;
  }

  if (name === "dagpopboard") {
    isTeacher = true;
    showPopboards();
  } else {
    boardSelection.classList.remove("hidden");
    boardsSnap.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.data().name;
      boardSelect.appendChild(opt);
    });
  }
}

joinBtn.onclick = join;

// ── PopBoards Page ────────────────────────────────────────────────────────
function showPopboards() {
  loginDiv.classList.add("hidden");
  popboardsDiv.classList.remove("hidden");
  appDiv.classList.add("hidden");
  teacherBtn.classList.toggle("hidden", !isTeacher);

  getDocs(collection(db, "boards")).then(snap => {
    boardsList.innerHTML = "";
    snap.forEach(docSnap => {
      const board = docSnap.data();
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${board.name}</strong>
        <button onclick="enterBoard('${docSnap.id}')">Enter</button>
        <button onclick="deleteBoard('${docSnap.id}')">Delete</button>
      `;
      boardsList.appendChild(div);
    });
  });
}

window.enterBoard = id => {
  currentBoardId = id;
  popboardsDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");
  loadPosts();
  loadPoll();
};

window.deleteBoard = async id => {
  if (!confirm("Delete entire PopBoard?")) return;
  // Note: recursive delete not implemented – use admin SDK or manual in prod
  await deleteDoc(doc(db, "boards", id));
  showPopboards();
};

createBoardBtn.onclick = async () => {
  const name = newBoardName.value.trim();
  if (!name) return;
  const ref = await addDoc(collection(db, "boards"), { name, createdBy: currentUser.uid, timestamp: serverTimestamp() });
  enterBoard(ref.id);
};

// ── Back buttons ──────────────────────────────────────────────────────────
backBtns.forEach(btn => btn.onclick = () => {
  if (isTeacher) showPopboards();
  else location.reload();
});

// ── Posting ───────────────────────────────────────────────────────────────
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text || !currentBoardId) return;

  const anon = anonPostToggle.checked;
  await addDoc(collection(db, `boards/${currentBoardId}/posts`), {
    author: anon ? "Anonymous" : currentUser.displayName,
    realAuthorUid: currentUser.uid,
    text,
    upvotes: 0,
    upvoters: [],
    timestamp: serverTimestamp(),
    hidden: false
  });
  postInput.value = "";
};

// ── Posts ─────────────────────────────────────────────────────────────────
function loadPosts() {
  if (topSortTimer) clearInterval(topSortTimer);

  if (sortMode === "top") {
    // Periodic fetch to save reads
    const fetchTop = async () => {
      const q = query(collection(db, `boards/${currentBoardId}/posts`), orderBy("upvotes", "desc"));
      const snap = await getDocs(q);
      topSortCache = snap.docs;
      renderPosts(topSortCache);
    };
    fetchTop();
    topSortTimer = setInterval(fetchTop, 120000); // 2 min
  } else {
    const q = query(collection(db, `boards/${currentBoardId}/posts`), orderBy("timestamp", "desc"));
    onSnapshot(q, snap => renderPosts(snap.docs));
  }
}

function renderPosts(docs) {
  postsDiv.innerHTML = "";
  docs.forEach(docSnap => {
    const post = docSnap.data();
    if (post.hidden && !isTeacher) return;

    const div = document.createElement("div");
    div.className = "post";
    if (myUpvotedPosts.has(docSnap.id)) div.classList.add("upvoted-by-me");

    const popcorn = getPopcornIcon(post.upvotes || 0);
    const authorDisplay = post.author.startsWith("Anonymous") && isTeacher 
      ? `🥷🏼 ${getRealAuthorName(post)}` : post.author;

    div.innerHTML = `
      <strong>${authorDisplay}</strong><br>
      ${post.text}<br>
      <span class="upvote">${popcorn} ${isTeacher ? `(${post.upvotes || 0})` : ""}</span>
      ${isTeacher ? `<button class="hidePost" data-id="${docSnap.id}">${post.hidden ? "Unhide" : "Hide"}</button>
                     <button class="deletePost" data-id="${docSnap.id}">Delete</button>` : ""}
      <div class="replies"></div>
      <input type="text" placeholder="Reply..." class="replyInput" data-id="${docSnap.id}">
      <button class="replyBtn" data-id="${docSnap.id}">Reply</button>
    `;

    const upvoteEl = div.querySelector(".upvote");
    upvoteEl.onclick = () => toggleUpvote(docSnap.id, post.upvotes || 0);

    if (isTeacher) {
      div.querySelector(".hidePost").onclick = () => toggleHidePost(docSnap.id, post.hidden);
      div.querySelector(".deletePost").onclick = () => deletePost(docSnap.id);
    }

    // Load replies
    const repliesDiv = div.querySelector(".replies");
    onSnapshot(collection(db, `boards/${currentBoardId}/posts/${docSnap.id}/replies`), snap => {
      repliesDiv.innerHTML = "";
      snap.forEach(rSnap => {
        const r = rSnap.data();
        if (r.hidden && !isTeacher) return;
        const rAuthor = r.author.startsWith("Anonymous") && isTeacher ? `🥷🏼 ${getRealAuthorName(r)}` : r.author;
        const rDiv = document.createElement("div");
        rDiv.className = "reply";
        rDiv.innerHTML = `<strong>${rAuthor}</strong>: ${r.text}
          ${isTeacher ? `<button onclick="toggleHideReply('${docSnap.id}','${rSnap.id}',${r.hidden})">${r.hidden?'Unhide':'Hide'}</button>
                         <button onclick="deleteReply('${docSnap.id}','${rSnap.id}')">Delete</button>` : ""}`;
        repliesDiv.appendChild(rDiv);
      });
    });

    // Reply submit
    div.querySelector(".replyBtn").onclick = async () => {
      const input = div.querySelector(".replyInput");
      const text = input.value.trim();
      if (!text) return;
      const anon = anonPostToggle.checked;
      await addDoc(collection(db, `boards/${currentBoardId}/posts/${docSnap.id}/replies`), {
        author: anon ? "Anonymous" : currentUser.displayName,
        realAuthorUid: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        hidden: false
      });
      input.value = "";
    };

    postsDiv.appendChild(div);
  });
}

function getPopcornIcon(count) {
  if (count >= 10) return '<span class="popcorn-mega">🍿</span>';
  if (count >= 5)  return '<span class="popcorn-medium">🍿</span>';
  if (count >= 2)  return '<span class="popcorn-small">🍿</span>';
  return "";
}

async function toggleUpvote(postId, currentCount) {
  if (myUpvotedPosts.has(postId)) {
    // remove
    await runTransaction(db, async t => {
      const ref = doc(db, `boards/${currentBoardId}/posts`, postId);
      const snap = await t.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data.upvoters?.includes(currentUser.uid)) return;
      t.update(ref, {
        upvotes: increment(-1),
        upvoters: arrayRemove(currentUser.uid)
      });
    });
    myUpvotedPosts.delete(postId);
  } else {
    // add
    await runTransaction(db, async t => {
      const ref = doc(db, `boards/${currentBoardId}/posts`, postId);
      const snap = await t.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.upvoters?.includes(currentUser.uid)) return;
      t.update(ref, {
        upvotes: increment(1),
        upvoters: arrayUnion(currentUser.uid)
      });
    });
    myUpvotedPosts.add(postId);
    triggerConfetti();
    if ("vibrate" in navigator) navigator.vibrate(50);
  }
  // No need to reload – transaction will trigger snapshot
}

function triggerConfetti() {
  const conf = document.createElement("div");
  conf.className = "confetti";
  conf.textContent = "🍿";
  conf.style.left = Math.random() * 100 + "vw";
  document.body.appendChild(conf);
  setTimeout(() => conf.remove(), 1300);
}

sortSelect.onchange = e => {
  sortMode = e.target.value;
  loadPosts();
};

// ── Polls ──────────────────────────────────────────────────────────────────
teacherBtn.onclick = () => {
  const type = prompt("Poll type: 'mc' or 'free'");
  if (!type) return;

  const question = prompt("Question:");
  if (!question) return;

  let imageUrl = null;
  // Image upload (simple – add file input in real UI later)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `polls/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    imageUrl = await getDownloadURL(storageRef);
    createPoll(question, type, imageUrl);
  };
  fileInput.click();
  if (!fileInput.files?.length) createPoll(question, type, null); // no image
};

async function createPoll(question, type, imageUrl) {
  await addDoc(collection(db, `boards/${currentBoardId}/polls`), {
    question,
    type, // "mc" or "free"
    options: type === "mc" ? (prompt("Options (comma sep):")?.split(",").map(s=>s.trim()) || []) : [],
    votes: type === "mc" ? {} : [], // mc: {optionIndex: count}, free: [{userUid, text}]
    responses: {}, // pollId → {uid: value}
    active: true,
    hidden: false,
    closed: false,
    imageUrl,
    createdBy: currentUser.uid,
    timestamp: serverTimestamp()
  });
}

function loadPoll() {
  onSnapshot(collection(db, `boards/${currentBoardId}/polls`), snap => {
    pollSection.innerHTML = "";
    snap.forEach(docSnap => {
      const p = docSnap.data();
      if (!p.active || (p.hidden && !isTeacher)) return;

      const div = document.createElement("div");
      div.className = "poll";

      let header = `<strong>${p.question}</strong>`;
      if (p.imageUrl) header += `<br><img src="${p.imageUrl}" style="max-width:100%;border-radius:6px;">`;
      div.innerHTML = header + "<br>";

      const myVote = myPollVotes.get(docSnap.id);

      if (p.type === "mc") {
        p.options.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.textContent = `${opt} ${p.closed ? `(${p.votes[i] || 0})` : ""}`;
          if (myVote?.value === i) btn.classList.add("voted-by-me");
          btn.onclick = () => toggleMcVote(docSnap.id, i, p);
          div.appendChild(btn);
        });
      } else { // free
        const input = document.createElement("input");
        input.placeholder = "Your answer...";
        input.value = myVote?.value || "";
        const submit = document.createElement("button");
        submit.textContent = myVote ? "Update" : "Submit";
        submit.onclick = () => submitFreeResponse(docSnap.id, input.value, p);
        div.append(input, submit);
      }

      if (isTeacher) {
        const actions = document.createElement("div");
        actions.innerHTML = `
          <button onclick="closePoll('${docSnap.id}')">${p.closed ? "Reopen" : "Close & Show Results"}</button>
          <button onclick="toggleHidePoll('${docSnap.id}', ${p.hidden})">${p.hidden ? "Unhide" : "Hide"}</button>
          <button onclick="deletePoll('${docSnap.id}')">Delete</button>
        `;
        div.appendChild(actions);

        if (p.closed) {
          if (p.type === "mc") {
            const chart = document.createElement("div");
            chart.className = "bar-chart";
            p.options.forEach((opt, i) => {
              const count = p.votes[i] || 0;
              const max = Math.max(...Object.values(p.votes), 1);
              const width = (count / max) * 100;
              chart.innerHTML += `
                <div class="bar" style="width:${width}%">
                  <span class="bar-label">${opt}: ${count}</span>
                </div>`;
            });
            div.appendChild(chart);
          } else {
            // Free responses – list for teacher
            const list = document.createElement("ul");
            p.responses && Object.entries(p.responses).forEach(([uid, text]) => {
              list.innerHTML += `<li>${uid.slice(0,6)}...: ${text}</li>`;
            });
            div.appendChild(list);
          }
        }
      }

      pollSection.appendChild(div);
    });
  });
}

async function toggleMcVote(pollId, index, poll) {
  const prev = myPollVotes.get(pollId);
  let delta = 1;
  let newIndex = index;

  if (prev && prev.value === index) {
    // unvote
    delta = -1;
    newIndex = null;
  }

  await runTransaction(db, async t => {
    const ref = doc(db, `boards/${currentBoardId}/polls`, pollId);
    const snap = await t.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.responses?.[currentUser.uid] && prev?.value !== index) return; // already voted elsewhere

    const votes = {...(data.votes || {})};
    if (prev) votes[prev.value] = (votes[prev.value] || 1) + (delta === -1 ? -1 : 0);
    if (newIndex !== null) votes[newIndex] = (votes[newIndex] || 0) + delta;

    t.update(ref, {
      votes,
      responses: { ...data.responses, [currentUser.uid]: newIndex }
    });
  });

  if (newIndex === null) myPollVotes.delete(pollId);
  else myPollVotes.set(pollId, {type: "mc", value: newIndex});
}

async function submitFreeResponse(pollId, text, poll) {
  if (!text.trim()) return;
  await updateDoc(doc(db, `boards/${currentBoardId}/polls`, pollId), {
    [`responses.${currentUser.uid}`]: text
  });
  myPollVotes.set(pollId, {type: "free", value: text});
}

window.closePoll = id => updateDoc(doc(db, `boards/${currentBoardId}/polls`, id), { closed: !getDoc(doc(db, `boards/${currentBoardId}/polls`, id)).data().closed });
window.toggleHidePoll = (id, hidden) => updateDoc(doc(db, `boards/${currentBoardId}/polls`, id), { hidden: !hidden });
window.deletePoll = id => deleteDoc(doc(db, `boards/${currentBoardId}/polls`, id));

// Similar toggleHidePost, deletePost, toggleHideReply, deleteReply functions...

// ── Utils ────────────────────────────────────────────────────────────────
function getRealAuthorName(data) {
  // In production, resolve via /users/{uid} or cache
  return data.realAuthorUid ? data.realAuthorUid.slice(0,8) : "unknown";
}

// Init
sortSelect.onchange();

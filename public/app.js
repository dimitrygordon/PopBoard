import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";  // stable recent version
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp, query, orderBy,
  doc, updateDoc, deleteDoc, getDocs, increment, runTransaction, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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

// State
let username = "";
let isTeacher = false;
let currentBoardId = null;
let sortMode = "new";
let myUpvotedPosts = new Set(JSON.parse(localStorage.getItem("myUpvotedPosts") || "[]"));
let myPollVotes = new Map(JSON.parse(localStorage.getItem("myPollVotes") || "[]")); // pollId → {type,value}
let topSortCache = [];
let topSortTimer = null;

// DOM
const loginDiv       = document.getElementById("login");
const popboardsDiv   = document.getElementById("popboards");
const appDiv         = document.getElementById("app");
const boardSelect    = document.getElementById("boardSelect");
const boardSelection = document.getElementById("boardSelection");
const boardsList     = document.getElementById("boardsList");
const newBoardName   = document.getElementById("newBoardName");
const createBoardBtn = document.getElementById("createBoardBtn");
const usernameInput  = document.getElementById("usernameInput");
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

// Persist votes across reloads/sessions
function saveMyVotes() {
  localStorage.setItem("myUpvotedPosts", JSON.stringify([...myUpvotedPosts]));
  localStorage.setItem("myPollVotes", JSON.stringify([...myPollVotes]));
}

// Theme (unchanged)
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}
function loadTheme() {
  let theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(theme);
}
themeToggle.onclick = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
loadTheme();

// Join
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return alert("Please enter a display name");

  isTeacher = (username === "dagpopboard");
  teacherBtn.classList.toggle("hidden", !isTeacher);

  loginDiv.classList.add("hidden");

  if (isTeacher) {
    showPopboards();
  } else {
    boardSelection.classList.remove("hidden");
    getDocs(collection(db, "boards")).then(snap => {
      boardSelect.innerHTML = "";
      snap.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.data().name;
        boardSelect.appendChild(opt);
      });
    });
  }
};

// Enter selected board (non-teacher)
boardSelect.onchange = () => {
  if (boardSelect.value) {
    currentBoardId = boardSelect.value;
    popboardsDiv.classList.add("hidden");
    appDiv.classList.remove("hidden");
    loadPosts();
    loadPoll();
  }
};

// PopBoards view (teacher only)
function showPopboards() {
  popboardsDiv.classList.remove("hidden");
  appDiv.classList.add("hidden");
  getDocs(collection(db, "boards")).then(snap => {
    boardsList.innerHTML = "";
    snap.forEach(docSnap => {
      const board = docSnap.data();
      const div = document.createElement("div");
      div.style.margin = "10px 0";
      div.innerHTML = `
        <strong>${board.name || "Unnamed"}</strong>
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
  if (!confirm("Delete entire PopBoard and all content?")) return;
  await deleteDoc(doc(db, "boards", id));
  showPopboards();
};

createBoardBtn.onclick = async () => {
  const name = newBoardName.value.trim();
  if (!name) return alert("Enter a name");
  const ref = await addDoc(collection(db, "boards"), {
    name,
    createdAt: serverTimestamp()
  });
  enterBoard(ref.id);
};

// Back to PopBoards (teacher only)
backBtns.forEach(btn => {
  btn.onclick = () => {
    if (isTeacher) {
      showPopboards();
    } else {
      // For students: perhaps reload or hide app
      location.reload();
    }
  };
});

// Posting comment
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text || !currentBoardId) return;

  const isAnon = anonPostToggle.checked;
  await addDoc(collection(db, `boards/${currentBoardId}/posts`), {
    author: isAnon ? "Anonymous" : username,
    text,
    upvotes: 0,
    timestamp: serverTimestamp(),
    hidden: false
  });
  postInput.value = "";
};

// Posts loading & rendering (similar to before, but no UID checks)
function loadPosts() {
  if (topSortTimer) clearInterval(topSortTimer);

  const baseQuery = collection(db, `boards/${currentBoardId}/posts`);

  if (sortMode === "top") {
    const fetchTop = async () => {
      const q = query(baseQuery, orderBy("upvotes", "desc"));
      const snap = await getDocs(q);
      topSortCache = snap.docs;
      renderPosts(topSortCache);
    };
    fetchTop();
    topSortTimer = setInterval(fetchTop, 120000); // 2 min refresh
  } else {
    const q = query(baseQuery, orderBy("timestamp", "desc"));
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
    const upvoteText = isTeacher ? ` (${post.upvotes || 0})` : "";

    div.innerHTML = `
      <strong>${post.author}</strong><br>
      ${post.text}<br>
      <span class="upvote">${popcorn}${upvoteText}</span>
      ${isTeacher ? `<button class="hideBtn" data-id="${docSnap.id}">${post.hidden ? "Unhide" : "Hide"}</button>
                     <button class="deleteBtn" data-id="${docSnap.id}">Delete</button>` : ""}
      <!-- Replies section, input, etc. similar to previous version -->
    `;

    // Upvote toggle (client-side only enforcement)
    div.querySelector(".upvote").onclick = () => toggleUpvote(docSnap.id, post.upvotes || 0);

    // Teacher moderation
    if (isTeacher) {
      div.querySelector(".hideBtn").onclick = () => toggleHidePost(docSnap.id, post.hidden);
      div.querySelector(".deleteBtn").onclick = () => deletePost(docSnap.id);
    }

    // ... add replies loading/submit similarly (omitted for brevity, copy from prior version)

    postsDiv.appendChild(div);
  });
}

function getPopcornIcon(count) {
  if (count >= 10) return '<span class="popcorn-mega">🍿</span>';
  if (count >= 5)  return '<span class="popcorn-medium">🍿</span>';
  if (count >= 2)  return '<span class="popcorn-small">🍿</span>';
  return "";
}

function toggleUpvote(postId, currentCount) {
  const already = myUpvotedPosts.has(postId);
  const delta = already ? -1 : 1;

  // Client-side UI update first
  if (already) {
    myUpvotedPosts.delete(postId);
  } else {
    myUpvotedPosts.add(postId);
    triggerConfetti();
    if ("vibrate" in navigator) navigator.vibrate(50);
  }
  saveMyVotes();  // persist

  // Server update (optimistic – no rollback on fail)
  updateDoc(doc(db, `boards/${currentBoardId}/posts`, postId), {
    upvotes: increment(delta)
  }).catch(err => console.error("Upvote failed:", err));
}

// Confetti (unchanged)
function triggerConfetti() {
  const conf = document.createElement("div");
  conf.className = "confetti";
  conf.textContent = "🍿";
  conf.style.left = Math.random() * 100 + "vw";
  document.body.appendChild(conf);
  setTimeout(() => conf.remove(), 1300);
}

// Poll logic (similar – client-side vote enforcement via Map + localStorage)
// ... (copy/adapt poll creation, loadPoll, toggleMcVote, submitFreeResponse from previous version, removing UID parts)

// Init
sortSelect.onchange = e => { sortMode = e.target.value; loadPosts(); };

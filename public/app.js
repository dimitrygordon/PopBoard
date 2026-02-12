// ────────────────────────────────────────────────
// Firebase imports
// ────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ────────────────────────────────────────────────
// Firebase config
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
// App state
// ────────────────────────────────────────────────
let username = "";
let isTeacher = false;
let sortMode = "new";
let unsubscribePosts = null;

// Persistent anonymous user ID
let userId = localStorage.getItem("pollUserId");
if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("pollUserId", userId);
}

// ────────────────────────────────────────────────
// DOM elements
// ────────────────────────────────────────────────
const loginDiv = document.getElementById("login");
const appDiv = document.getElementById("app");
const joinBtn = document.getElementById("joinBtn");
const usernameInput = document.getElementById("usernameInput");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const postsDiv = document.getElementById("posts");
const sortSelect = document.getElementById("sortSelect");
const teacherBtn = document.getElementById("teacherBtn");
const pollSection = document.getElementById("pollSection");
const themeToggle = document.getElementById("themeToggle");
const htmlElement = document.documentElement;

// ────────────────────────────────────────────────
// Theme handling
// ────────────────────────────────────────────────
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);
  else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

themeToggle.onclick = () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
};

loadTheme();

// ────────────────────────────────────────────────
// Join session
// ────────────────────────────────────────────────
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  isTeacher = username === "Dimitry";
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPolls();
};

// ────────────────────────────────────────────────
// Posts
// ────────────────────────────────────────────────
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    author: username,
    text,
    upvotes: 0,
    timestamp: serverTimestamp()
  });

  postInput.value = "";
};

sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

function loadPosts() {
  if (unsubscribePosts) unsubscribePosts();

  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  unsubscribePosts = onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const div = document.createElement("div");
      div.className = "post";

      div.innerHTML = `
        <strong>${post.author}</strong>
        <p>${post.text}</p>
        <span class="upvote">🍿 ${post.upvotes || 0}</span>
        ${isTeacher ? "<button class='delete'>Delete</button>" : ""}
      `;

      div.querySelector(".upvote").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          upvotes: (post.upvotes || 0) + 1
        });
      };

      if (isTeacher) {
        div.querySelector(".delete").onclick = async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      postsDiv.appendChild(div);
    });
  });
}

// ────────────────────────────────────────────────
// Teacher creates poll
// ────────────────────────────────────────────────
teacherBtn.onclick = async () => {
  const question = prompt("Poll question:");
  if (!question) return;

  const type = prompt("Poll type: 'multiple' or 'free'");
  if (!["multiple", "free"].includes(type)) return;

  let options = [];
  if (type === "multiple") {
    const optStr = prompt("Comma-separated options:");
    options = optStr.split(",").map(o => o.trim()).filter(Boolean);
    if (!options.length) return;
  }

  let imageUrl = null;
  if (confirm("Add an image to this poll?")) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();

    await new Promise(resolve => {
      input.onchange = async () => {
        const file = input.files[0];
        const imgRef = ref(storage, `poll-images/${crypto.randomUUID()}`);
        await uploadBytes(imgRef, file);
        imageUrl = await getDownloadURL(imgRef);
        resolve();
      };
    });
  }

  await addDoc(collection(db, "polls"), {
    question,
    type,
    options,
    votes: {},
    responses: {},
    imageUrl,
    active: true,
    createdAt: serverTimestamp()
  });
};

// ────────────────────────────────────────────────
// Load polls
// ────────────────────────────────────────────────
function loadPolls() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      const div = document.createElement("div");
      div.className = "poll";

      if (poll.imageUrl) {
        const img = document.createElement("img");
        img.src = poll.imageUrl;
        div.appendChild(img);
      }

      div.innerHTML += `<strong>${poll.question}</strong><br/>`;

      // ── ACTIVE POLLS ──
      if (poll.active) {

        // Multiple choice
        if (poll.type === "multiple") {
          poll.options.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.textContent = opt;

            if (poll.votes?.[userId] === i) {
              btn.classList.add("voted-by-me");
            }

            btn.onclick = async () => {
              const current = poll.votes?.[userId];
              const newVotes = { ...(poll.votes || {}) };

              if (current === i) delete newVotes[userId];
              else newVotes[userId] = i;

              await updateDoc(doc(db, "polls", docSnap.id), { votes: newVotes });
            };

            div.appendChild(btn);
          });
        }

        // Free response
        if (poll.type === "free") {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Type your response...";
          textarea.value = poll.responses?.[userId] || "";

          const submit = document.createElement("button");
          submit.textContent = "Submit";

          submit.onclick = async () => {
            await updateDoc(doc(db, "polls", docSnap.id), {
              [`responses.${userId}`]: textarea.value.trim()
            });
          };

          div.appendChild(textarea);
          div.appendChild(submit);
        }
      }

      // ── CLOSED POLLS ──
      if (!poll.active && poll.type === "multiple") {
        const counts = {};
        Object.values(poll.votes || {}).forEach(i => {
          counts[i] = (counts[i] || 0) + 1;
        });

        poll.options.forEach((opt, i) => {
          const wrap = document.createElement("div");
          wrap.className = "result";
          wrap.innerHTML = `<strong>${opt} (${counts[i] || 0})</strong>`;

          const bar = document.createElement("div");
          bar.className = "bar";
          bar.style.width = `${(counts[i] || 0) * 24}px`;

          wrap.appendChild(bar);
          div.appendChild(wrap);
        });
      }

      if (!poll.active && poll.type === "free" && isTeacher) {
        Object.values(poll.responses || {}).forEach(r => {
          const p = document.createElement("p");
          p.textContent = r;
          div.appendChild(p);
        });
      }

      if (isTeacher && poll.active) {
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close Poll";
        closeBtn.onclick = async () => {
          await updateDoc(doc(db, "polls", docSnap.id), { active: false });
        };
        div.appendChild(closeBtn);
      }

      pollSection.appendChild(div);
    });
  });
}

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, doc, updateDoc, deleteDoc, runTransaction,
  getDoc, getDocs, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config (keep yours)
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

// State
let username = "";
let isTeacher = false;
let sortMode = "new";
let lastTopSortRefresh = 0;

// Local user data (persisted in localStorage)
let myUpvotes     = new Set(JSON.parse(localStorage.getItem("myUpvotes") || "[]"));
let myPollVotes   = new Map();   // pollId → optionIndex | "free:"+text
let myAnonymous   = false;

// DOM
const loginDiv       = document.getElementById("login");
const appDiv         = document.getElementById("app");
const joinBtn        = document.getElementById("joinBtn");
const usernameInput  = document.getElementById("usernameInput");
const postInput      = document.getElementById("postInput");
const postBtn        = document.getElementById("postBtn");
const postsDiv       = document.getElementById("posts");
const sortSelect     = document.getElementById("sortSelect");
const teacherBtn     = document.getElementById("teacherBtn");
const pollSection    = document.getElementById("pollSection");
const themeToggle    = document.getElementById("themeToggle");
const anonymousToggle= document.getElementById("anonymousToggle");
const html           = document.documentElement;

// ─── Theme ───────────────────────────────────────
function setTheme(theme) {
  html.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  let theme = localStorage.getItem("theme");
  if (!theme) {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  setTheme(theme);
}

themeToggle.onclick = () => {
  const current = html.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
};

loadTheme();

// ─── Join ─────────────────────────────────────────
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  isTeacher = username.toLowerCase() === "dimitry"; // case insensitive
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// ─── Anonymous toggle ─────────────────────────────
anonymousToggle.onchange = (e) => {
  myAnonymous = e.target.checked;
};

// ─── Post comment ─────────────────────────────────
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text) return;

  const data = {
    author: myAnonymous ? "Anonymous" : username,
    text,
    upvotes: 0,
    timestamp: serverTimestamp(),
    isReplyTo: null,          // null = top-level
    anonymous: myAnonymous
  };

  await addDoc(collection(db, "posts"), data);
  postInput.value = "";
};

// ─── Sort change ──────────────────────────────────
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// ─── Upvote helper ────────────────────────────────
function getPopcornLevel(count) {
  if (count >= 10) return { cls: "popcorn-mega",   txt: "🍿🍿🍿" };
  if (count >= 5)  return { cls: "popcorn-medium", txt: "🍿🍿" };
  if (count >= 2)  return { cls: "popcorn-small",  txt: "🍿" };
  return { cls: "", txt: "" };
}

function addConfetti(parentEl) {
  for (let i = 0; i < 6; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.textContent = ["🍿","🌟","🎉"][Math.floor(Math.random()*3)];
    c.style.left = (Math.random()*100)+"%";
    parentEl.appendChild(c);
    setTimeout(() => c.remove(), 800);
  }
  // Haptic feedback on mobile
  if (navigator.vibrate) navigator.vibrate(50);
}

// ─── Load posts (with reply support + throttled top sort) ──────────────
function loadPosts() {
  const now = Date.now();

  // For "top" sort: refresh only every ~2 minutes
  if (sortMode === "top" && now - lastTopSortRefresh < 120000) {
    // skip refresh if too soon
    return;
  }
  if (sortMode === "top") lastTopSortRefresh = now;

  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, async (snap) => {
    // For top sort → get accurate counts via .get() if needed (but here we trust snapshot)
    postsDiv.innerHTML = "";

    const postElements = new Map(); // id → element

    for (const docSnap of snap.docs) {
      const post = docSnap.data();
      const id = docSnap.id;

      const isReply = !!post.isReplyTo;
      const el = document.createElement("div");
      el.className = `post ${isReply ? "reply" : ""}`;
      if (myUpvotes.has(id)) el.classList.add("upvoted-by-me");

      const author = post.anonymous ? "Anonymous" : post.author;
      let html = `<strong>${author}</strong><br>${post.text}<br>`;

      if (!isReply) {
        // Only top-level posts get upvote + popcorn
        const level = getPopcornLevel(post.upvotes || 0);
        html += `
          <span class="upvote-area ${level.cls}">
            ${level.txt}
          </span>
        `;
      }

      if (isTeacher) {
        html += `<button class="small delete">Delete</button>`;
      }

      // Reply button (for top-level only)
      if (!isReply) {
        html += `<button class="small reply-btn">Reply</button>`;
      }

      el.innerHTML = html;

      // Upvote toggle (only for top-level)
      if (!isReply) {
        const upvoteArea = el.querySelector(".upvote-area");
        if (upvoteArea) {
          upvoteArea.onclick = async () => {
            const already = myUpvotes.has(id);
            try {
              await runTransaction(db, async (t) => {
                const ref = doc(db, "posts", id);
                const snap = await t.get(ref);
                if (!snap.exists()) throw "gone";
                const cur = snap.data().upvotes || 0;
                t.update(ref, { upvotes: already ? Math.max(0, cur-1) : cur+1 });
              });

              if (already) {
                myUpvotes.delete(id);
                el.classList.remove("upvoted-by-me");
              } else {
                myUpvotes.add(id);
                el.classList.add("upvoted-by-me");
                addConfetti(upvoteArea);
              }
              localStorage.setItem("myUpvotes", JSON.stringify([...myUpvotes]));
            } catch(e) {
              console.error("Upvote failed", e);
            }
          };
        }
      }

      // Delete
      if (isTeacher) {
        el.querySelector(".delete")?.addEventListener("click", async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", id));
          }
        });
      }

      // Reply
      if (!isReply) {
        el.querySelector(".reply-btn")?.addEventListener("click", async () => {
          const text = prompt("Your reply:");
          if (!text?.trim()) return;

          await addDoc(collection(db, "posts"), {
            author: myAnonymous ? "Anonymous" : username,
            text: text.trim(),
            upvotes: 0,
            timestamp: serverTimestamp(),
            isReplyTo: id,
            anonymous: myAnonymous
          });
        });
      }

      postElements.set(id, el);
    }

    // Append in correct visual order (replies under parents)
    snap.docs.forEach(docSnap => {
      const post = docSnap.data();
      const el = postElements.get(docSnap.id);
      if (!post.isReplyTo) {
        postsDiv.appendChild(el);
      } else {
        const parentEl = postElements.get(post.isReplyTo);
        if (parentEl) {
          parentEl.appendChild(el);
        } else {
          postsDiv.appendChild(el); // orphan
        }
      }
    });
  });
}

// ─── Poll logic ───────────────────────────────────
teacherBtn.onclick = async () => {
  const type = prompt("Poll type?\n1 = Multiple choice\n2 = Free response", "1");
  if (!type) return;

  const question = prompt("Poll question:");
  if (!question) return;

  let imageUrl = "";
  if (confirm("Add an image for context?")) {
    imageUrl = prompt("Paste direct image URL (png/jpg):")?.trim() || "";
  }

  if (type === "2") {
    // Free response
    await addDoc(collection(db, "polls"), {
      question,
      type: "free",
      imageUrl,
      responses: {},          // uid or anonId → text
      active: true,
      closedAt: null
    });
  } else {
    // Multiple choice
    const optionsStr = prompt("Comma-separated options:");
    if (!optionsStr) return;
    const options = optionsStr.split(",").map(o => o.trim()).filter(Boolean);
    if (options.length < 1) return;

    await addDoc(collection(db, "polls"), {
      question,
      type: "mc",
      options,
      imageUrl,
      votes: Array(options.length).fill(0),
      voters: {},             // voterKey → index
      active: true,
      closedAt: null
    });
  }
};

function loadPoll() {
  onSnapshot(collection(db, "polls"), snap => {
    pollSection.innerHTML = "";

    snap.forEach(docSnap => {
      const poll = docSnap.data();
      if (!poll.active && !isTeacher) return; // students see only active

      const div = document.createElement("div");
      div.className = "poll";

      let html = `<strong>${poll.question}</strong><br>`;
      if (poll.imageUrl) {
        html += `<img class="poll-context" src="${poll.imageUrl}" alt="poll image">`;
      }

      const myVote = myPollVotes.get(docSnap.id);

      if (poll.type === "free") {
        // Free response
        if (poll.active) {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Type your answer...";
          textarea.value = myVote?.startsWith("free:") ? myVote.slice(6) : "";
          const submit = document.createElement("button");
          submit.textContent = myVote ? "Update Answer" : "Submit";

          submit.onclick = async () => {
            const text = textarea.value.trim();
            if (!text) return;

            const key = username || "anon_" + Date.now();
            await updateDoc(doc(db, "polls", docSnap.id), {
              [`responses.${key}`]: text
            });
            myPollVotes.set(docSnap.id, "free:" + text);
          };

          div.append(textarea, submit);
        } else if (isTeacher) {
          // Teacher sees responses
          html += `<div><em>Free responses (teacher only):</em><ul>`;
          Object.entries(poll.responses || {}).forEach(([k,v]) => {
            html += `<li><strong>${k}:</strong> ${v}</li>`;
          });
          html += `</ul></div>`;
        }
      } else {
        // Multiple choice
        poll.options.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.textContent = opt;

          if (myVote === i) btn.classList.add("voted-by-me");

          btn.onclick = async () => {
            const key = username || "anon_" + Date.now();

            if (myVote === i) {
              // remove vote
              const upd = { [`voters.${key}`]: deleteField() };
              poll.votes[i]--;
              await updateDoc(doc(db, "polls", docSnap.id), upd);
              myPollVotes.delete(docSnap.id);
              btn.classList.remove("voted-by-me");
            } else {
              // set / change vote
              const upd = {
                [`voters.${key}`]: i,
                [`votes.${myVote ?? i}`]: myVote != null ? increment(-1) : increment(0),
                [`votes.${i}`]: increment(1)
              };
              await updateDoc(doc(db, "polls", docSnap.id), upd);
              myPollVotes.set(docSnap.id, i);
              div.querySelectorAll("button").forEach(b => b.classList.remove("voted-by-me"));
              btn.classList.add("voted-by-me");
            }
          };

          div.appendChild(btn);
        });
      }

      if (poll.active && isTeacher) {
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close Poll & Show Results";
        closeBtn.onclick = async () => {
          await updateDoc(doc(db, "polls", docSnap.id), {
            active: false,
            closedAt: serverTimestamp()
          });
        };
        div.appendChild(closeBtn);
      }

      if (!poll.active) {
        // Show results (bar chart)
        const resDiv = document.createElement("div");
        resDiv.className = "poll-results";
        resDiv.innerHTML = "<strong>Results:</strong>";

        if (poll.type === "mc") {
          const total = poll.votes.reduce((a,b)=>a+b,0) || 1;
          poll.options.forEach((opt,i) => {
            const pct = Math.round((poll.votes[i] || 0) / total * 100);
            const bar = document.createElement("div");
            bar.className = "bar-container";
            bar.innerHTML = `
              <div class="bar" style="width:${pct}%">
                ${opt} — ${poll.votes[i] || 0} (${pct}%)
              </div>
            `;
            resDiv.appendChild(bar);
          });
        } else if (isTeacher) {
          resDiv.innerHTML += " (free responses visible in teacher view only)";
        }

        div.appendChild(resDiv);
      }

      pollSection.appendChild(div);
    });
  });
}

// Start
loadPosts();
loadPoll();

// ────────────────────────────────────────────────
// Firebase imports
// ────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  serverTimestamp, query, orderBy, doc, updateDoc,
  deleteDoc, increment, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
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

// ────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────
let username = "";
let isTeacher = false;
let sortMode = "new";

let myUpvotedPostIds = new Set();
let myPollVotes = new Map();                // pollId → {type:"mc", optionIndex} | {type:"fr", text}
let activeReplyInput = null;

// DOM elements
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
const htmlElement    = document.documentElement;

// ────────────────────────────────────────────────
// Theme handling
// ────────────────────────────────────────────────
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  let theme = localStorage.getItem("theme");
  if (!theme) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }
  setTheme(theme);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) {
    setTheme(e.matches ? "dark" : "light");
  }
});

themeToggle.addEventListener("click", () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

// ────────────────────────────────────────────────
// Join
// ────────────────────────────────────────────────
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (username.length < 2) {
    alert("Please enter at least 2 characters");
    return;
  }

  isTeacher = username.toLowerCase() === "dimitry";
  if (isTeacher) teacherBtn.classList.remove("hidden");

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// ────────────────────────────────────────────────
// New top-level post
// ────────────────────────────────────────────────
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (text.length < 2) return;

  try {
    await addDoc(collection(db, "posts"), {
      author: username,
      text,
      upvotes: 0,
      upvoters: [],
      replies: [],
      timestamp: serverTimestamp(),
      type: "post"
    });
    postInput.value = "";
  } catch (err) {
    alert("Could not post — check your connection");
    console.error(err);
  }
};

// ────────────────────────────────────────────────
// Load & render posts + replies
// ────────────────────────────────────────────────
function loadPosts() {
  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    if (snapshot.empty) {
      postsDiv.innerHTML = '<p style="text-align:center; padding:40px; color:#888;">No posts yet...</p>';
      return;
    }

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;

      // Sync local upvote state from server
      if (post.upvoters?.includes(username)) {
        myUpvotedPostIds.add(postId);
      } else {
        myUpvotedPostIds.delete(postId);
      }

      const postDiv = document.createElement("div");
      postDiv.className = "post";
      if (myUpvotedPostIds.has(postId)) {
        postDiv.classList.add("upvoted-by-me");
      }

      postDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <strong>${post.author}${post.author === username ? ' (you)' : ''}</strong><br>
            <span style="font-size:0.85em; color:#888;">
              ${post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString([], {dateStyle:'short', timeStyle:'short'}) : '...'}
            </span>
          </div>
          ${isTeacher ? `<button class="delete" data-id="${postId}">×</button>` : ''}
        </div>
        <div style="margin:8px 0 12px;">${post.text}</div>

        <div style="display:flex; gap:16px; font-size:0.9em; color:#666;">
          <span class="upvote" data-id="${postId}">
            🍿 <strong>${post.upvotes || 0}</strong>
          </span>
          <span class="reply-btn" style="cursor:pointer;" data-id="${postId}">Reply</span>
        </div>

        <div class="replies-container" id="replies-${postId}"></div>
      `;

      // Upvote toggle
      const upvoteEl = postDiv.querySelector(".upvote");
      upvoteEl.onclick = () => handleUpvoteToggle(postId, post.upvoters || [], post.upvotes || 0);

      // Reply button
      postDiv.querySelector(".reply-btn").onclick = () => openReplyInput(postId, postDiv);

      // Delete (teacher only)
      if (isTeacher) {
        postDiv.querySelector(".delete").onclick = async () => {
          if (!confirm("Delete this post and all replies?")) return;
          try {
            await deleteDoc(doc(db, "posts", postId));
          } catch (err) {
            alert("Could not delete post");
            console.error(err);
          }
        };
      }

      // Render replies (oldest → newest)
      const repliesContainer = postDiv.querySelector(`#replies-${postId}`);
      if (post.replies?.length > 0) {
        const sorted = [...post.replies].sort((a,b) => a.timestamp - b.timestamp);
        sorted.forEach(reply => {
          const replyDiv = document.createElement("div");
          replyDiv.className = "reply";
          const time = new Date(reply.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
          replyDiv.innerHTML = `
            <strong>${reply.author}</strong>
            <span style="font-size:0.82em; color:#888; margin-left:8px;">${time}</span><br>
            ${reply.text}
          `;
          repliesContainer.appendChild(replyDiv);
        });
      }

      postsDiv.appendChild(postDiv);
    });
  }, err => {
    console.error("Posts listener error:", err);
    postsDiv.innerHTML = '<p style="color:#c00; text-align:center;">Error loading posts — check connection</p>';
  });
}

// ────────────────────────────────────────────────
// Upvote toggle
// ────────────────────────────────────────────────
async function handleUpvoteToggle(postId, currentUpvoters, currentCount) {
  const already = currentUpvoters.includes(username);
  const postRef = doc(db, "posts", postId);

  try {
    if (already) {
      await updateDoc(postRef, {
        upvoters: arrayRemove(username),
        upvotes: increment(-1)
      });
      myUpvotedPostIds.delete(postId);
    } else {
      await updateDoc(postRef, {
        upvoters: arrayUnion(username),
        upvotes: increment(1)
      });
      myUpvotedPostIds.add(postId);

      // Popcorn animation
      const el = document.querySelector(`.upvote[data-id="${postId}"]`);
      if (el) {
        const conf = document.createElement("span");
        conf.className = "popcorn-confetti";
        conf.textContent = "🍿";
        conf.style.left = "50%";
        el.appendChild(conf);
        setTimeout(() => conf.remove(), 800);
      }
    }
  } catch (err) {
    console.error("Upvote failed:", err);
    alert("Could not update vote — try again");
  }
}

// ────────────────────────────────────────────────
// Reply input
// ────────────────────────────────────────────────
function openReplyInput(postId, postElement) {
  if (activeReplyInput) activeReplyInput.remove();

  const template = document.getElementById("reply-input-template").content.cloneNode(true);
  const area = template.querySelector(".reply-input-area");

  const sendBtn   = area.querySelector(".reply-send-btn");
  const cancelBtn = area.querySelector(".reply-cancel-btn");
  const textarea  = area.querySelector(".reply-text");

  sendBtn.onclick = async () => {
    const text = textarea.value.trim();
    if (text.length < 1) return;

    try {
      await updateDoc(doc(db, "posts", postId), {
        replies: arrayUnion({
          author: username,
          text,
          timestamp: Date.now()
        })
      });
      area.remove();
      activeReplyInput = null;
    } catch (err) {
      alert("Could not send reply");
      console.error(err);
    }
  };

  cancelBtn.onclick = () => {
    area.remove();
    activeReplyInput = null;
  };

  const actionBar = postElement.querySelector(".upvote").parentElement;
  actionBar.parentElement.insertBefore(area, actionBar.nextSibling);

  textarea.focus();
  activeReplyInput = area;
}

// ────────────────────────────────────────────────
// Poll handling (unchanged except minor error handling)
// ────────────────────────────────────────────────
teacherBtn.onclick = async () => {
  const type = prompt("Poll type?\n1 = Multiple choice\n2 = Free response", "1");
  if (!type) return;

  try {
    if (type === "1") {
      const q = prompt("Poll question:");
      const optsStr = prompt("Comma-separated options:");
      if (!q || !optsStr) return;

      const options = optsStr.split(",").map(o => o.trim()).filter(Boolean);
      if (options.length < 2) return alert("Need at least 2 options");

      await addDoc(collection(db, "polls"), {
        type: "mc",
        question: q,
        options,
        votes: Array(options.length).fill(0),
        voters: [],
        active: true,
        timestamp: serverTimestamp()
      });
    } else if (type === "2") {
      const q = prompt("Free response question:");
      if (!q) return;

      await addDoc(collection(db, "polls"), {
        type: "fr",
        question: q,
        responses: [],
        active: true,
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    alert("Could not create poll");
    console.error(err);
  }
};

function loadPoll() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      if (!poll.active) return;

      const div = document.createElement("div");
      div.className = "poll";

      if (poll.type === "mc") {
        div.innerHTML = `<strong>${poll.question}</strong><br/>`;

        const myIdx = myPollVotes.get(docSnap.id)?.optionIndex;

        poll.options.forEach((opt, i) => {
          const count = poll.votes?.[i] ?? 0;
          const btn = document.createElement("button");
          btn.textContent = `${opt} (${count})`;
          if (myIdx === i) btn.classList.add("voted-by-me");

          btn.onclick = () => handlePollVote(docSnap.id, i, poll.voters || [], poll.votes || []);
          div.appendChild(btn);
        });
      } else if (poll.type === "fr") {
        div.innerHTML = `
          <strong>${poll.question} (free response)</strong><br/>
          ${isTeacher ? `<small>(only you can see answers)</small><br/>` : ''}
        `;

        if (!isTeacher) {
          const existing = myPollVotes.get(docSnap.id)?.text;
          const input = document.createElement("textarea");
          input.placeholder = "Your answer...";
          input.value = existing || "";
          input.rows = 3;
          input.style.cssText = "width:100%; margin:10px 0;";

          const btn = document.createElement("button");
          btn.textContent = existing ? "Update Answer" : "Submit Answer";

          btn.onclick = async () => {
            const text = input.value.trim();
            if (!text) return;

            const ref = doc(db, "polls", docSnap.id);
            try {
              if (existing) {
                await updateDoc(ref, { responses: arrayRemove({ username, text: existing }) });
              }
              await updateDoc(ref, {
                responses: arrayUnion({ username, text, timestamp: Date.now() })
              });
              myPollVotes.set(docSnap.id, { type: "fr", text });
              btn.textContent = "Update Answer";
            } catch (err) {
              alert("Could not submit answer");
              console.error(err);
            }
          };

          div.append(input, btn);
        } else {
          console.log(`FR poll "${poll.question}":`, poll.responses || []);
          div.innerHTML += `<small>(check console for answers)</small>`;
        }
      }

      pollSection.appendChild(div);
    });
  }, err => {
    console.error("Polls listener error:", err);
  });
}

async function handlePollVote(pollId, idx, voters, votes) {
  const ref = doc(db, "polls", pollId);
  const prev = myPollVotes.get(pollId);

  try {
    if (prev && prev.optionIndex === idx) {
      // remove
      await updateDoc(ref, {
        voters: arrayRemove(username),
        [`votes.${idx}`]: increment(-1)
      });
      myPollVotes.delete(pollId);
    } else {
      if (prev) {
        await updateDoc(ref, {
          voters: arrayRemove(username),
          [`votes.${prev.optionIndex}`]: increment(-1)
        });
      }
      await updateDoc(ref, {
        voters: arrayUnion(username),
        [`votes.${idx}`]: increment(1)
      });
      myPollVotes.set(pollId, { type: "mc", optionIndex: idx });
    }
  } catch (err) {
    console.error("Poll vote failed:", err);
    alert("Could not update vote");
  }
}

// ────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────
loadTheme();

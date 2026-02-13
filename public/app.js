// ---------------- Firebase imports ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, getDocs,
  serverTimestamp, query, orderBy, doc, updateDoc, deleteDoc,
  increment, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ---------------- Firebase config ----------------
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

// ---------------- App State ----------------
let username = "";
let isTeacher = false;
let sortMode = "new";

let myUpvotedPostIds = new Set();
let myPollVotes = new Map();

// ---------------- DOM elements ----------------
const loginDiv      = document.getElementById("login");
const appDiv        = document.getElementById("app");
const joinBtn       = document.getElementById("joinBtn");
const usernameInput = document.getElementById("usernameInput");
const postInput     = document.getElementById("postInput");
const postBtn       = document.getElementById("postBtn");
const postsDiv      = document.getElementById("posts");
const sortSelect    = document.getElementById("sortSelect");
const teacherBtn    = document.getElementById("teacherBtn");
const pollSection   = document.getElementById("pollSection");
const themeToggle   = document.getElementById("themeToggle");
const htmlElement   = document.documentElement;

// ---------------- Theme ----------------
function setTheme(theme) {
  htmlElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
}

function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);
  else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
  if (!localStorage.getItem("theme")) setTheme(e.matches ? "dark" : "light");
});

themeToggle.addEventListener("click", () => {
  const current = htmlElement.getAttribute("data-theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
});

loadTheme();

// ---------------- Join ----------------
joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  if (!username) return;

  if (username === "301718") {
    isTeacher = true;
    username = "Dimitry";
    teacherBtn.classList.remove("hidden");
  } else {
    isTeacher = false;
    if (username.toLowerCase() === "dimitry") {
      alert("This name is reserved. Choose another.");
      return;
    }
  }

  loginDiv.classList.add("hidden");
  appDiv.classList.remove("hidden");

  loadPosts();
  loadPoll();
};

// ---------------- Post ----------------
postBtn.onclick = async () => {
  const text = postInput.value.trim();
  if (!text) return;

  const anonymous = document.getElementById("anonymousToggle")?.checked || false;

  await addDoc(collection(db, "posts"), {
    author: username,
    text,
    anonymous,
    upvotes: 0,
    upvoters: [],
    upvoteHistory: [],
    timestamp: serverTimestamp()
  });

  postInput.value = "";
  if (document.getElementById("anonymousToggle")) {
    document.getElementById("anonymousToggle").checked = false;
  }
};

// ---------------- Sort ----------------
sortSelect.onchange = () => {
  sortMode = sortSelect.value;
  loadPosts();
};

// ---------------- Confetti ----------------
function createPopcornConfetti(upvoteElement) {
  for (let i = 0; i < 6; i++) {
    const particle = document.createElement("span");
    particle.textContent = "🍿";
    particle.style.position = "absolute";
    particle.style.left = `${upvoteElement.getBoundingClientRect().left + window.scrollX}px`;
    particle.style.top = `${upvoteElement.getBoundingClientRect().top + window.scrollY}px`;
    particle.style.fontSize = "16px";
    particle.style.opacity = 1;
    particle.style.transition = "all 0.8s ease-out";
    particle.style.pointerEvents = "none";
    document.body.appendChild(particle);

    const x = (Math.random() - 0.5) * 60;
    const y = -Math.random() * 60 - 20;

    requestAnimationFrame(() => {
      particle.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*360}deg)`;
      particle.style.opacity = 0;
    });

    setTimeout(() => particle.remove(), 800);
  }
}

// ---------------- Replies ----------------
async function addReply(postId, text, anonymous = false) {
  if (!text) return;
  await addDoc(collection(db, "replies"), {
    postId,
    author: username,
    text,
    anonymous,
    timestamp: serverTimestamp()
  });
}

// ---------------- Load Replies ----------------

// ---------------- Load Replies (Updated) ----------------
function loadReplies(postId, container, parentVisible = true) {
  const q = query(collection(db, "replies"), orderBy("timestamp", "asc"));
  onSnapshot(q, snap => {
    container.innerHTML = "";

    snap.forEach(d => {
      const r = d.data();
      if (r.postId !== postId) return;

      // default visibility
      if (r.visible === undefined) r.visible = true;

      // hide if not visible and user is not teacher
      if (!r.visible && !isTeacher) return;
      if (!parentVisible && !isTeacher) return;

      const div = document.createElement("div");
      div.className = "reply";

      const displayName = r.anonymous && !isTeacher ? "🥷🏼Anonymous" : r.author;
      div.innerHTML = `<strong>${displayName}</strong>: ${r.text}`;

      if (isTeacher) {
        // Delete button (red)
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.onclick = async () => {
          await deleteDoc(doc(db, "replies", d.id));
        };
        div.appendChild(delBtn);

        // Hide/Show toggle button (tan, matches main comment)
        const hideBtn = document.createElement("button");
        hideBtn.textContent = r.visible ? "Hide Comment" : "Show Comment";
        hideBtn.className = "hide-toggle"; // ONLY this class
        hideBtn.onclick = async () => {
          const ref = doc(db, "replies", d.id);
          const newVisible = !r.visible;
          await updateDoc(ref, { visible: newVisible });
          r.visible = newVisible;
          hideBtn.textContent = newVisible ? "Hide Comment" : "Show Comment";
        };
        div.appendChild(hideBtn);
      }

      container.appendChild(div);
    });
  });
}

// ---------------- Load Posts ----------------
function loadPosts() {
  const q = query(
    collection(db, "posts"),
    orderBy(sortMode === "new" ? "timestamp" : "upvotes", "desc")
  );

  onSnapshot(q, snapshot => {
    postsDiv.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const postId = docSnap.id;

      if (post.visible === undefined) post.visible = true;
      if (!post.visible && !isTeacher) return;

      if (post.upvoters?.includes(username)) myUpvotedPostIds.add(postId);
      else myUpvotedPostIds.delete(postId);

      const div = document.createElement("div");
      div.className = "post";
      if (myUpvotedPostIds.has(postId)) div.classList.add("upvoted-by-me");

      const displayName = post.anonymous && !isTeacher ? "🥷🏼Anonymous" : post.author;

      div.innerHTML = `
        <strong>${displayName}</strong><br/>
        ${post.text}<br/>
        <span class="upvote">🍿 ${post.upvotes || 0}</span>
        <button class="reply-btn">Reply</button>
        ${isTeacher ? "<button class='delete'>Delete</button>" : ""}
      `;

      // Teacher hide/show toggle
      if (isTeacher) {
        const hideBtn = document.createElement("button");
        hideBtn.textContent = post.visible ? "Hide Comment" : "Show Comment";
        hideBtn.onclick = async () => {
          const ref = doc(db, "posts", postId);
          const newVisible = !post.visible;
          await updateDoc(ref, { visible: newVisible });
          hideBtn.textContent = newVisible ? "Hide Comment" : "Show Comment";

          // Update all replies visibility
          const repliesRef = collection(db, "replies");
          const snap = await getDocs(repliesRef);
          snap.forEach(d => {
            const r = d.data();
            if (r.postId === postId) updateDoc(doc(db, "replies", d.id), { visible: newVisible });
          });
        };
        div.appendChild(hideBtn);
      }

      const upvoteSpan = div.querySelector(".upvote");
      upvoteSpan.onclick = async () => {
        createPopcornConfetti(upvoteSpan);
        navigator.vibrate?.(25);

        const ref = doc(db, "posts", postId);
        const already = post.upvoters?.includes(username);

        if (already) {
          await updateDoc(ref, {
            upvoters: arrayRemove(username),
            upvotes: increment(-1),
            upvoteHistory: arrayUnion({ username, action: "Removed Upvote" })
          });
        } else {
          await updateDoc(ref, {
            upvoters: arrayUnion(username),
            upvotes: increment(1),
            upvoteHistory: arrayUnion({ username, action: "Upvoted" })
          });
        }
      };

      const repliesDiv = document.createElement("div");
      loadReplies(postId, repliesDiv, post.visible);

      const replyBtn = div.querySelector(".reply-btn");
      replyBtn.onclick = () => {
        const input = document.createElement("textarea");
        input.className = "reply-input";
        input.placeholder = "Reply…";

        const anonCheck = document.createElement("input");
        anonCheck.type = "checkbox";
        anonCheck.id = "replyAnonymous";
        const label = document.createElement("label");
        label.textContent = " 🥷🏼Anonymous";
        label.prepend(anonCheck);

        const send = document.createElement("button");
        send.textContent = "Send";
        send.onclick = () => {
          addReply(postId, input.value, anonCheck.checked);
          input.remove();
          send.remove();
          label.remove();
        };

        div.appendChild(input);
        div.appendChild(label);
        div.appendChild(send);
      };

      if (isTeacher && div.querySelector(".delete")) {
        div.querySelector(".delete").onclick = async () => {
          const replyQuery = query(collection(db, "replies"));
          onSnapshot(replyQuery, snap => {
            snap.forEach(d => {
              if (d.data().postId === postId) deleteDoc(doc(db, "replies", d.id));
            });
          });
          await deleteDoc(doc(db, "posts", postId));
        };
      }

      div.appendChild(repliesDiv);
      postsDiv.appendChild(div);
    });
  });
}

// ---------------- Polls ----------------
teacherBtn.onclick = async () => {
  const question = prompt("Poll question:");
  if (!question) return;

  const typeDiv = document.createElement("div");
  typeDiv.innerHTML = `
    <button id="mcBtn">Multiple Choice</button>
    <button id="freeBtn">Free Response</button>
  `;
  document.body.appendChild(typeDiv);

  return new Promise(resolve => {
    typeDiv.querySelector("#mcBtn").onclick = async () => {
      const optionsStr = prompt("Comma-separated options:");
      if (!optionsStr) return;

      const options = optionsStr.split(",").map(o => o.trim()).filter(o => o);
      if (options.length === 0) return;

      await addDoc(collection(db, "polls"), {
        question,
        type: "mc",
        options,
        votes: Array(options.length).fill(0),
        voters: [],
        visible: false,
        history: []
      });

      typeDiv.remove();
      resolve();
    };

    typeDiv.querySelector("#freeBtn").onclick = async () => {
      await addDoc(collection(db, "polls"), {
        question,
        type: "free",
        responses: {},
        visible: false,
        history: []
      });

      typeDiv.remove();
      resolve();
    };
  });
};

function loadPoll() {
  onSnapshot(collection(db, "polls"), snapshot => {
    pollSection.innerHTML = "";

    snapshot.forEach(docSnap => {
      const poll = docSnap.data();
      const pollId = docSnap.id;

      if (!poll.visible && !isTeacher) return;

      const div = document.createElement("div");
      div.className = "poll";
      div.innerHTML = `<strong>${poll.question}</strong><br/>`;

      if (poll.type === "free") {
        if (isTeacher) {
          const ul = document.createElement("ul");
          (poll.history || []).forEach(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.username}: ${entry.response}`;
            ul.appendChild(li);
          });
          div.appendChild(ul);
        } else {
          const textarea = document.createElement("textarea");
          textarea.placeholder = "Enter your response...";
          const submitBtn = document.createElement("button");
          submitBtn.textContent = "Submit";

          submitBtn.onclick = async () => {
            const responseText = textarea.value.trim();
            if (!responseText) return;

            await updateDoc(doc(db, "polls", pollId), {
              history: arrayUnion({ username, response: responseText })
            });

            textarea.value = "✅ Submitted!";
            textarea.disabled = true;
            submitBtn.disabled = true;
          };

          div.appendChild(textarea);
          div.appendChild(submitBtn);
        }
      } else {
        const myChoice = myPollVotes.get(pollId);
        poll.options.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.textContent = `${opt} (${poll.votes?.[i] || 0})`;
          if (myChoice === i) btn.classList.add("voted-by-me");

          btn.onclick = async () => {
            const pollRef = doc(db, "polls", pollId);
            const prevChoice = myPollVotes.get(pollId);

            if (prevChoice === i) {
              myPollVotes.delete(pollId);
              await updateDoc(pollRef, {
                [`votes.${i}`]: increment(-1),
                history: arrayUnion({ username, response: `Removed vote: ${opt}` })
              });
            } else {
              myPollVotes.set(pollId, i);
              const updates = {
                [`votes.${i}`]: increment(1),
                history: arrayUnion({ username, response: `Voted: ${opt}` })
              };
              if (prevChoice !== undefined) updates[`votes.${prevChoice}`] = increment(-1);
              await updateDoc(pollRef, updates);
            }
          };

          div.appendChild(btn);
        });
      }

      if (isTeacher) {
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = poll.visible ? "Hide Poll" : "Post Poll";
        toggleBtn.onclick = async () => {
          await updateDoc(doc(db, "polls", pollId), { visible: !poll.visible });
        };
        div.appendChild(toggleBtn);

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete Poll";
        delBtn.onclick = async () => {
          await deleteDoc(doc(db, "polls", pollId));
        };
        div.appendChild(delBtn);

        // Reset Poll Button
        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset Poll";
        resetBtn.onclick = async () => {
          if (!confirm("Are you sure you want to reset this poll? This will clear all votes and history.")) return;

          const updates = { history: [] };

          if (poll.type === "mc") {
            updates.votes = Array(poll.options.length).fill(0);
            updates.voters = [];
          } else if (poll.type === "free") {
            updates.responses = {};
          }

          await updateDoc(doc(db, "polls", pollId), updates);
        };
        div.appendChild(resetBtn);

        const logDiv = document.createElement("div");
        logDiv.style.marginTop = "8px";
        logDiv.style.borderTop = "1px solid var(--border-color)";
        logDiv.innerHTML = "<strong>Poll Log:</strong><br/>";
        (poll.history || []).forEach(entry => {
          const p = document.createElement("div");
          p.textContent = `${entry.username}: ${entry.response}`;
          logDiv.appendChild(p);
        });
        div.appendChild(logDiv);
      }

      pollSection.appendChild(div);
    });
  });
}

// ---------------- Alerts for polls posted live ----------------
const knownVisiblePolls = new Set(); // track polls already "posted"

onSnapshot(collection(db, "polls"), snapshot => {
  snapshot.forEach(docSnap => {
    const poll = docSnap.data();
    const pollId = docSnap.id;

    // Only alert if poll just became visible
    if (poll.visible && !knownVisiblePolls.has(pollId)) {
      knownVisiblePolls.add(pollId);

      // Sound alert
      const audio = new Audio('/ping.mp3');
      audio.play().catch(() => {});

      // Vibration (mobile)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

      // Browser notification
      if (Notification.permission === "granted") {
        new Notification("New Poll Posted!", {
          body: poll.question || "Check the latest poll",
          icon: "/popboard-logo.png"
        });
      }
    }

    // Remove from known set if poll is hidden again (so next post triggers again)
    if (!poll.visible && knownVisiblePolls.has(pollId)) {
      knownVisiblePolls.delete(pollId);
    }
  });
});

// Request permission once
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

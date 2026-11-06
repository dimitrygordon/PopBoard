// Dimitry's DIY PBL Bookshare: 18 storyboard pages from Socrates' content package.
// Script text lives in the side column (teleprompter). Animations auto-play and loop. No audio.
import { ART, h, fx } from "./bs-engine.js";
import { SLIDES } from "./bs-data.js";

export { SLIDES };

function artPath(slideId, name) {
  return `${ART}${slideId}/${name}`;
}

function hasFileGuess(slideId) {
  // Runtime: try mid/bg/fg; missing images just fail to load and CSS placeholder remains.
  return true;
}

function placeholder(scene, label) {
  const ph = h("div", "bs-ph");
  ph.innerHTML = `<div class="bs-ph-label">${fx(label)}</div><div class="bs-ph-note">Leo art pending</div>`;
  scene.appendChild(ph);
  return ph;
}

function layerStack(scene, slideId) {
  const stack = h("div", "bs-layers");
  // Preferred drop-in names; browser 404 is fine until Leo fills the folder.
  for (const name of ["bg.webp", "bg.png", "mid.webp", "mid.png", "fg.webp", "fg.png"]) {
    const img = document.createElement("img");
    img.className = "bs-layer bs-" + name.split(".")[0];
    img.alt = "";
    img.decoding = "async";
    img.src = artPath(slideId, name);
    img.onerror = () => img.remove();
    stack.appendChild(img);
  }
  scene.appendChild(stack);
  return stack;
}

function buildTitle(scene, T) {
  const wrap = h("div", "bs-title-stage");
  const cover = document.createElement("img");
  cover.className = "bs-book-cover";
  cover.alt = "DIY Project Based Learning for Math and Science book cover";
  cover.src = ART + "book_cover.webp";
  wrap.appendChild(cover);
  const meta = h("div", "bs-title-meta");
  meta.innerHTML = `
    <div class="bs-book-title">DIY Project Based Learning for Math and Science</div>
    <div class="bs-book-author">Heather Wolpert-Gawron</div>
    <div class="bs-book-pub">Routledge · Eye On Education · 2016</div>
    <div class="bs-book-fore">Foreword by Suzie Boss</div>
    <div class="bs-by">Book Share by Dimitry Gordon</div>`;
  wrap.appendChild(meta);
  scene.appendChild(wrap);
  T.fadeUp(cover, 0.1, 0.7, 18);
  T.fadeUp(meta, 0.35, 0.6, 10);
  T.loop(cover, [{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], 1.2, 5);
}

function buildGeneric(scene, T, slide) {
  layerStack(scene, slide.id);
  const board = h("div", "bs-board");
  const kind = slide.kind || "idea";
  board.dataset.kind = kind;
  if (slide.idea) board.dataset.idea = String(slide.idea);
  const chips = (slide.side_bullets || []).map((b) => `<div class="bs-chip">${fx(b)}</div>`).join("");
  board.innerHTML = `<div class="bs-board-title">${fx(slide.title)}</div>${slide.chapter ? `<div class="bs-chapter">${fx(slide.chapter)}</div>` : ""}<div class="bs-chips">${chips}</div>`;
  scene.appendChild(board);
  placeholder(scene, slide.title);
  T.fadeUp(board, 0.15, 0.55, 14);
  const chipNodes = board.querySelectorAll(".bs-chip");
  chipNodes.forEach((c, i) => T.fadeUp(c, 0.35 + i * 0.12, 0.4, 10));
  // gentle loop pulse on board
  T.loop(board, [{ transform: "translateY(0)" }, { transform: "translateY(-4px)" }, { transform: "translateY(0)" }], 2, 6);
}

function buildConclude(scene, T, slide) {
  const board = h("div", "bs-board bs-conclude");
  const takes = (slide.side_bullets || []).map((b) => `<li>${fx(b)}</li>`).join("");
  const qs = (slide.questions || []).map((q, i) => `<li><b>Q${i + 1}.</b> ${fx(q)}</li>`).join("");
  board.innerHTML = `<div class="bs-board-title">${fx(slide.title)}</div>
    <div class="bs-conclude-grid">
      <div><h3>Takeaways</h3><ol>${takes}</ol></div>
      <div><h3>Discussion questions</h3><ol class="bs-dq">${qs}</ol></div>
    </div>`;
  scene.appendChild(board);
  T.fadeUp(board, 0.1, 0.6, 12);
}

function buildResources(scene, T, slide) {
  const board = h("div", "bs-board bs-resources");
  const items = (slide.side_bullets || []).map((b) => `<li>${fx(b)}</li>`).join("");
  board.innerHTML = `<div class="bs-board-title">Resources</div><ul>${items}</ul>`;
  scene.appendChild(board);
  T.fadeUp(board, 0.1, 0.55, 10);
}

export const PAGES = SLIDES.map((slide) => {
  const sideBits = [];
  sideBits.push(`<ul class="bs-side-bullets">${(slide.side_bullets || []).map((b) => `<li>${fx(b)}</li>`).join("")}</ul>`);
  if (slide.questions && slide.questions.length) {
    sideBits.push(`<p class="aside">Discussion questions (short)</p><ol class="bs-side-q">${slide.questions.map((q) => `<li>${fx(q)}</li>`).join("")}</ol>`);
  }
  // Teleprompter: full narration script Dimitry reads aloud
  sideBits.push(`<div class="bs-script"><p class="aside">Script (read aloud)</p><p class="bs-script-text">${fx(slide.narration)}</p></div>`);
  return {
    title: slide.title,
    kicker: slide.kicker || "",
    guide: slide.guide || "",
    cap: slide.guide || "",
    side: sideBits.join(""),
    build(scene, T) {
      if (slide.kind === "title") buildTitle(scene, T);
      else if (slide.kind === "conclude") buildConclude(scene, T, slide);
      else if (slide.kind === "resources") buildResources(scene, T, slide);
      else buildGeneric(scene, T, slide);
      return {};
    },
  };
});

export const PAGE_COUNT = PAGES.length;

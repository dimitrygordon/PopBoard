// Astronomy Course: turns one slide from a deck file into storybook page markup.
// Pure functions (no DOM), so the tests can check that every word of every slide survives.
// Positions are percentages of the 16:9 page; font sizes are in deck points and scale with
// the page through the --u variable (one point at the current page width).

const FONTS = {
  "Cabin Sketch": "var(--ac-title-font)",
  "Architects Daughter": "var(--ac-head-font)",
  "Patrick Hand": "var(--ac-body-font)",
  "Gochi Hand": "var(--ac-note-font)",
  "Itim": "var(--ac-fallback-font)"
};

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Words of one text box, paragraph by paragraph, exactly as on the slide (line breaks become spaces).
export function boxText(item) {
  return item.p.map((p) => p.r.map((r) => (r.br ? " " : r.x)).join("").replace(/[\v\u000b]/g, " ")).filter((s) => s.trim());
}

// Every word on a slide, in deck order, one string per paragraph.
export function slideText(slide) {
  const out = [];
  for (const it of slide.items) if (it.t === "text") out.push(...boxText(it));
  return out;
}

// Options a student can tap on a check for understanding: boxes that start with "A)" to "D)".
export function optionLetter(item) {
  const t = boxText(item).join(" ").trim();
  const m = /^([A-D])\)/.exec(t);
  return m ? m[1] : null;
}

function runHtml(r) {
  if (r.br) return "<br>";
  const st = [];
  if (r.sz) st.push(`font-size:calc(var(--u) * ${r.sz})`);
  if (r.f && FONTS[r.f]) st.push(`font-family:${FONTS[r.f]}`);
  if (r.c) st.push(`color:${r.c}`);
  if (r.b) st.push("font-weight:700");
  if (r.i) st.push("font-style:italic");
  if (r.u) st.push("text-decoration:underline");
  const text = esc(r.x).replace(/[\v\u000b]/g, "<br>");
  const inner = r.sup ? `<sup>${text}</sup>` : r.sub ? `<sub>${text}</sub>` : text;
  return `<span style="${st.join(";")}">${inner}</span>`;
}

const ALIGN = { l: "left", c: "center", r: "right", j: "justify" };
const ANCHOR = { t: "flex-start", m: "center", b: "flex-end" };

// opts.base: folder holding the deck's art; opts.options: { letter -> true } boxes to render as buttons.
export function renderSlide(slide, opts = {}) {
  const base = opts.base || "";
  const parts = [];
  let n = 0;
  for (const it of slide.items) {
    const [x, y, w, h] = it.box;
    const pos = `left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
    if (it.t === "img") {
      parts.push(`<img class="ac-art" src="${esc(base + it.src)}" alt="" style="${pos}" draggable="false" decoding="async">`);
      continue;
    }
    if (it.t !== "text") continue;
    n++;
    const paras = it.p.map((p) => {
      const lh = p.lh ? `line-height:${(p.lh * 1.2).toFixed(3)}` : "";
      // the paragraph carries its largest run size so the line box (strut) scales with the page
      const big = Math.max(0, ...p.r.map((r) => r.sz || 0));
      const fs = big ? `;font-size:calc(var(--u) * ${big})` : "";
      return `<p style="text-align:${ALIGN[p.al] || "left"};${lh}${fs}">${p.r.map(runHtml).join("") || "&nbsp;"}</p>`;
    }).join("");
    const letter = opts.options ? optionLetter(it) : null;
    const choice = opts.choices && opts.choices.includes(boxText(it).join(" ").trim()) ? boxText(it).join(" ").trim() : null;
    const style = `${pos};justify-content:${ANCHOR[it.anchor] || "flex-start"}`;
    if (letter || choice) {
      const v = letter || choice;
      parts.push(`<button type="button" class="ac-tb ac-opt" data-opt="${esc(v)}" style="${style}">${paras}</button>`);
    } else {
      parts.push(`<div class="ac-tb" style="${style}">${paras}</div>`);
    }
  }
  return parts.join("");
}

// Readable copy of a page for the phone sheet: same words and order, body-sized.
export function readableHtml(slide) {
  const out = [];
  for (const it of slide.items) {
    if (it.t !== "text") continue;
    // one block per text box; its paragraphs stay on their own lines
    const lines = it.p.map((p) => p.r.map((r) => {
      if (r.br) return "<br>";
      const t = esc(r.x).replace(/[\v\u000b]/g, "<br>");
      return r.sup ? `<sup>${t}</sup>` : r.sub ? `<sub>${t}</sub>` : (r.b ? `<b>${t}</b>` : t);
    }).join("")).filter((h) => h.replace(/<br>/g, "").trim());
    if (lines.length) out.push(`<p>${lines.join("<br>")}</p>`);
  }
  return out.join("");
}

// "10^9" in an answer note becomes 10 with a raised 9.
export function noteHtml(s) {
  return esc(s).replace(/\^(-?\d+)/g, "<sup>$1</sup>");
}

// Search: does every word of the query appear in the text? Case and accents ignored.
export function fold(s) { return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
export function matches(text, query) {
  const q = fold(query).split(/\s+/).filter(Boolean);
  if (!q.length) return true;
  const t = fold(text);
  return q.every((w) => t.includes(w));
}

// Library search over a catalog entry: title first, then the title page, then each page.
// Returns null (no match) or { where: "title" | "page", page, snippet }.
export function searchDeck(deck, query) {
  if (!fold(query).trim()) return { where: "all" };
  const head = `${deck.key} deck ${deck.key.slice(1).replace(/^0/, "")} ${deck.title} ${deck.sub} ${deck.tag}`;
  if (matches(head, query)) return { where: "title" };
  const all = deck.pages.join(" ");
  if (!matches(all, query)) return null;
  const words = fold(query).split(/\s+/).filter(Boolean);
  let best = 0;
  for (let i = 0; i < deck.pages.length; i++) if (words.some((w) => fold(deck.pages[i]).includes(w))) { best = i; if (matches(deck.pages[i], query)) break; }
  return { where: "page", page: best + 1, snippet: snippet(deck.pages[best], words[0]) };
}
export function snippet(text, word, span = 60) {
  const t = String(text), i = fold(t).indexOf(word);
  if (i < 0) return t.slice(0, span * 2);
  const a = Math.max(0, i - span), b = Math.min(t.length, i + word.length + span);
  return (a ? "\u2026" : "") + t.slice(a, b).trim() + (b < t.length ? "\u2026" : "");
}

// Card layout JSON for s09 genre quads and keyterms sticky cards.
// Leo replaces art/s09/cards.json and art/keyterms/cards.json; we read them at boot.
import { ART } from "./bs-engine.js";

let s09 = null;
let keyterms = null;
let ready = null;

const S09_FALLBACK = {
  version: 1,
  source: "inline-fallback",
  size: [1920, 1080],
  cards: [
    { id: "lab_report", text: "Lab report", rot: -10,
      quad: [[1135, 255], [1395, 220], [1425, 395], [1165, 430]] },
    { id: "business_letter", text: "Business letter", rot: -16,
      quad: [[1110, 530], [1295, 495], [1340, 755], [1155, 790]] },
    { id: "executive_summary", text: "Executive summary", rot: -4,
      quad: [[1395, 545], [1605, 535], [1620, 770], [1410, 780]] },
    { id: "problem_statement", text: "Problem statement", rot: 16,
      quad: [[1575, 560], [1790, 610], [1730, 845], [1515, 795]] },
  ],
};

const KT_FALLBACK = {
  version: 1,
  source: "inline-fallback",
  size: [1920, 1080],
  cards: (() => {
    const terms = [
      "Driving question", "Entry event", "Authentic audience", "Backplanning",
      "Problem statement", "BIRAC", "Costa's Levels", '"Able to Teach This Topic"',
    ];
    const rots = [-2, 1.5, -1, 2, 1, -2.5, 2, -1];
    const boardX = 155, boardY = 210, boardW = 930, boardH = 450;
    const gapX = 18, gapY = 28, cols = 4;
    const cardW = Math.floor((boardW - gapX * 3) / 4);
    const cardH = Math.floor((boardH - gapY) / 2);
    return terms.map((term, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = boardX + col * (cardW + gapX);
      const y = boardY + row * (cardH + gapY);
      return {
        id: `term_${i}`, term, x, y, w: cardW, h: cardH, rot: rots[i],
        pin: { cx: x + cardW / 2, cy: y + 2, w: 36, h: 36 },
        pad_top_frac: 0.08,
      };
    });
  })(),
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export function loadLayouts() {
  if (ready) return ready;
  ready = (async () => {
    const [a, b] = await Promise.all([
      fetchJson(`${ART}s09/cards.json`),
      fetchJson(`${ART}keyterms/cards.json`),
    ]);
    s09 = a && Array.isArray(a.cards) && a.cards.length ? a : S09_FALLBACK;
    keyterms = b && Array.isArray(b.cards) && b.cards.length ? b : KT_FALLBACK;
    return { s09, keyterms };
  })();
  return ready;
}

export function s09Cards() {
  return (s09 || S09_FALLBACK).cards;
}

export function keytermsCards() {
  return (keyterms || KT_FALLBACK).cards;
}

export function layoutsSource() {
  return {
    s09: (s09 || S09_FALLBACK).source || "unknown",
    keyterms: (keyterms || KT_FALLBACK).source || "unknown",
  };
}

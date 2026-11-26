// Deck art ships packed: decks/<slug>/art-pack/<NN>.bin page packs listed in art-pack.json (tools/pack-art/pack-art.mjs).
// artExists() / artSize() answer for packed and loose art alike. Only page-pack headers are read.
import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join } from "node:path";

function header(file) {
  const fd = openSync(file, "r");
  try {
    const top = Buffer.alloc(8); readSync(fd, top, 0, 8, 0);
    if (top.toString("latin1", 0, 4) !== "PBAP") throw new Error(`${file}: not a page pack`);
    const head = Buffer.alloc(top.readUInt32LE(4)); readSync(fd, head, 0, head.length, 8);
    return JSON.parse(head.toString("utf8")).files;
  } finally { closeSync(fd); }
}
const indexes = new Map();
const index = (deck) => {
  if (!indexes.has(deck)) {
    const idx = {}, f = join(deck, "art-pack.json");
    if (existsSync(f)) for (const g of JSON.parse(readFileSync(f, "utf8")).pages) for (const [p, l] of header(join(deck, "art-pack", String(g).padStart(2, "0") + ".bin"))) idx[p] = l;
    indexes.set(deck, idx);
  }
  return indexes.get(deck);
};
const norm = (rel) => rel.split("\\").join("/").replace(/^\.\//, "");
// deck: absolute path of decks/<slug>; rel: path inside it, e.g. "v2/art/p01-bg.webp"
export const artExists = (deck, rel) => Object.hasOwn(index(deck), norm(rel)) || existsSync(join(deck, norm(rel)));
// byte length of a deck file (packed or loose), 0 when missing
export const artSize = (deck, rel) => { const r = norm(rel), l = index(deck)[r]; return l ?? (existsSync(join(deck, r)) ? statSync(join(deck, r)).size : 0); };
export const artFiles = (deck) => Object.keys(index(deck));

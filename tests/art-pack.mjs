// Deck art ships packed (decks/<slug>/art-pack.bin + art-pack.json, tools/pack-art/pack-art.mjs).
// artExists() answers "is this deck file there?" for packed and loose art alike.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const indexes = new Map();
const index = (deck) => {
  if (!indexes.has(deck)) { const f = join(deck, "art-pack.json"); indexes.set(deck, existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).files : {}); }
  return indexes.get(deck);
};
// deck: absolute path of decks/<slug>; rel: path inside it, e.g. "v2/art/p01-bg.webp"
export const artExists = (deck, rel) => {
  const r = rel.split("\\").join("/").replace(/^\.\//, "");
  return Object.hasOwn(index(deck), r) || existsSync(join(deck, r));
};
// byte length of a deck file (packed or loose), 0 when missing
export const artSize = (deck, rel) => {
  const r = rel.split("\\").join("/").replace(/^\.\//, ""), e = index(deck)[r];
  return e ? e[1] : existsSync(join(deck, r)) ? statSync(join(deck, r)).size : 0;
};

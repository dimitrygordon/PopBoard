// Spoken copy drops APA citations like "(Wolpert-Gawron, 2016, p. 80)" or "(p. 7)" (Leo, Nov 7); on-screen text keeps them.
export function spoken(t) {
  return String(t)
    .replace(/\s*\((?:[^()]*\b(?:1[89]|20)\d{2}\b[^()]*|pp?\.\s*[\d\-–, ]+)\)/g, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1").trim();
}

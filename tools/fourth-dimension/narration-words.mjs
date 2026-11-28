// Turn the TTS character timestamps into the player's word times: [{ w, start, end }] where w is the
// caption's own word (split on whitespace), so the on-page highlight pairs one to one.
export function wordsFromChars(text, chars, times, duration) {
  const words = [];
  let ci = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    // The spoken stream echoes the input characters; walk to this word's first character.
    while (ci < chars.length && chars[ci] !== w[0]) ci++;
    const first = ci;
    const last = Math.min(chars.length - 1, first + w.length - 1);
    if (first >= chars.length) { words.push({ w, start: Math.max(0, duration - 0.2), end: duration }); continue; }
    ci = last + 1;
    words.push({ w, start: times[first][0], end: times[last][1] });
  }
  // Each word runs until the next one starts (no gaps), strictly increasing, inside the clip.
  for (let i = 0; i < words.length; i++) {
    const next = i + 1 < words.length ? words[i + 1].start : duration;
    words[i].start = Math.round(Math.min(words[i].start, duration) * 1000) / 1000;
    words[i].end = Math.round(Math.max(next, words[i].start + 0.05) * 1000) / 1000;
  }
  return words;
}

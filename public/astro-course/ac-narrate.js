// Storybook narration player: pre-rendered audio per page (audio/<deck>/s<N>.mp3 + s<N>.json word times).
// Hides itself when a page has no audio, so decks can ship before narration is rendered.
const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

export function createNarrator(host, base) {
  host.innerHTML = `<div class="narr sketch" role="group" aria-label="Listen to this page">
    <button type="button" data-k="back" aria-label="Back 10 seconds">&#8634;10</button>
    <button type="button" data-k="play" aria-label="Play narration">&#9654;</button>
    <button type="button" data-k="fwd" aria-label="Forward 10 seconds">10&#8635;</button>
    <label class="narr-bar"><span class="sr-only">Narration progress</span><input type="range" data-k="seek" min="0" max="1000" value="0"></label>
    <label class="narr-rate"><span class="sr-only">Speed</span><select data-k="rate">${[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => `<option value="${r}" ${r === 1 ? "selected" : ""}>${r}x</option>`).join("")}</select></label>
  </div>`;
  host.hidden = true;
  const q = (k) => host.querySelector(`[data-k="${k}"]`);
  const audio = new Audio(); audio.preload = "none";
  // audio/manifest.json lists the pages that have narration ({ "d01": [1, 2, ...] }); no probing for missing files.
  let manifest = null;
  const pagesWithAudio = async (deck) => { if (!manifest) { try { const r = await fetch(`${base}audio/manifest.json`); manifest = r.ok ? await r.json() : {}; } catch (e) { manifest = {}; } } return manifest[deck] || []; };
  let words = [], spans = [], map = [], cur = -1, token = 0, rate = 1;
  const playBtn = q("play"), seek = q("seek");
  const setPlay = (on) => { playBtn.innerHTML = on ? "&#10074;&#10074;" : "&#9654;"; playBtn.setAttribute("aria-label", on ? "Pause narration" : "Play narration"); };
  playBtn.addEventListener("click", () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  q("back").addEventListener("click", () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  q("fwd").addEventListener("click", () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });
  q("rate").addEventListener("change", (e) => { rate = +e.target.value; audio.playbackRate = rate; });
  seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration; });
  audio.addEventListener("play", () => setPlay(true));
  audio.addEventListener("pause", () => setPlay(false));
  audio.addEventListener("ended", () => { setPlay(false); mark(-1); });
  audio.addEventListener("error", () => { host.hidden = true; });
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
    const t = audio.currentTime; let i = cur >= 0 && words[cur] && words[cur].start <= t ? cur : 0;
    while (i + 1 < words.length && words[i + 1].start <= t) i++;
    mark(words[i] && words[i].start <= t ? i : -1);
  });
  function mark(i) {
    if (i === cur) return;
    if (cur >= 0 && map[cur] != null) spans[map[cur]].classList.remove("hl");
    cur = i;
    if (i >= 0 && map[i] != null) spans[map[i]].classList.add("hl");
  }
  // Wrap each word of the page text in a span, then pair spoken words with page words in order
  // (a short look-ahead tolerates spoken forms like "10 to the 9").
  function wrap(root) {
    spans = [];
    const walk = (el) => { for (const n of [...el.childNodes]) {
      if (n.nodeType === 3) { const f = document.createDocumentFragment(); for (const part of n.nodeValue.split(/(\s+)/)) { if (!part) continue; if (/^\s+$/.test(part)) f.appendChild(document.createTextNode(part)); else { const s = document.createElement("span"); s.className = "nw"; s.textContent = part; spans.push(s); f.appendChild(s); } } n.replaceWith(f); }
      else if (n.nodeType === 1) walk(n);
    } };
    walk(root);
    map = []; let j = 0;
    for (let i = 0; i < words.length; i++) {
      const w = fold(words[i].w); let hit = null;
      for (let k = j; k < Math.min(spans.length, j + 5); k++) if (fold(spans[k].textContent) === w) { hit = k; break; }
      if (hit != null) { map[i] = hit; j = hit + 1; } else map[i] = null;
    }
  }
  return {
    async load(deck, n, textRoot) {
      const my = ++token; audio.pause(); mark(-1); cur = -1; host.hidden = true; seek.value = 0;
      try {
        if (!(await pagesWithAudio(deck)).includes(+n) || my !== token) return;
        const r = await fetch(`${base}audio/${deck}/s${n}.json`);
        if (!r.ok || my !== token) return;
        const data = await r.json(); if (my !== token) return;
        words = data.words || [];
        audio.src = `${base}audio/${deck}/s${n}.mp3`; audio.playbackRate = rate;
        if (textRoot) wrap(textRoot);
        host.hidden = false;
      } catch (e) { host.hidden = true; }
    },
    stop() { token++; audio.pause(); host.hidden = true; }
  };
}

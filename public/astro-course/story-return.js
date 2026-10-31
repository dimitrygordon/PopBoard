// "Back to the story": when a study module is opened from an Astronomy Course storybook page
// (?story=<deck>-<page>), its Back button returns to that same storybook page instead of the Study library.
// Without ?story nothing changes.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";

const params = new URLSearchParams(location.search);
const m = /^([a-z0-9-]+?)-(\d{1,3})$/.exec(params.get("story") || "");
if (m) {
  const p = forwardStudyQuery(location.search);
  p.set("deck", m[1]); p.set("page", m[2]);
  const href = "study-astronomy-story.html?" + p.toString();
  const wire = () => {
    const btn = document.getElementById("studyBackBtn");
    if (!btn) return;
    btn.setAttribute("aria-label", "Back to the story");
    btn.dataset.storyReturn = "1";
    const label = btn.querySelector(".back-label");
    if (label) label.textContent = "Back to the story";
  };
  // capture phase, so the module's own Back handler (Study library) never runs
  addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("#studyBackBtn");
    if (!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    location.href = href;
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
}

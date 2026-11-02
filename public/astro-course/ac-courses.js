// Storybook courses that share this engine. A page names its course with <html data-course="...">;
// pages without it are the Astronomy Course. Each course has its own catalog, library page, story page,
// query parameter, saved-page keys and theme key, and the same reader, renderer and library UI.
export const COURSES = {
  astronomy: {
    id: "astronomy",
    name: "Astronomy Course",
    catalog: "./ac-catalog.js",
    root: "astro-course/",
    library: "study-astronomy-course.html",
    story: "study-astronomy-story.html",
    param: "deck",
    store: "popboard.astronomy-course",
    scenes: "js/astro-scenes/manifest.json",
    covers: true,
    group: (d) => `Q${d.q}`,
    label: (d) => d.key.replace(/^D0?/, "Deck "),
    strip: null,
    unit: "storybooks"
  },
  physics101: {
    id: "physics101",
    name: "Physics 101",
    catalog: "../physics101/p101-catalog.js",
    root: "physics101/",
    library: "study-physics101.html",
    story: "study-physics101-story.html",
    param: "lesson",
    store: "popboard.physics101",
    scenes: null,
    // 2D "Test it" scenes on hand-drawn pages: <pageScenes><slug>/pNN.js, listed by story.json testIt
    pageScenes: "physics101/scenes/",
    covers: true,
    // Leo's cover packs: physics101/covers/covers-mNN.json, {slug: {file, title, module, data: base64 webp 960x540}}
    // (packed so public/ stays under Cloudflare Pages' 20,000-file cap; no loose cover files)
    coverPack: (d) => `covers/covers-m${String(d.q).padStart(2, "0")}.json`,
    group: (d) => `Module ${d.q}`,
    label: (d) => `Lesson ${d.lesson}`,
    // short header strip on library cards ("M2 \u00b7 L2") so it never wraps; covers keep the long label
    strip: (d) => `M${d.q} \u00b7 L${d.lesson}`,
    unit: "lesson storybooks"
  }
};
export function courseId(doc = globalThis.document) {
  const id = doc && doc.documentElement && doc.documentElement.dataset.course;
  return COURSES[id] ? id : "astronomy";
}
export const course = () => COURSES[courseId()];
export const themeKey = (c = course()) => c.store + ".theme";
export const pageKey = (c, slug) => c.store + ".page." + slug;
export async function loadCatalog(c = course()) { return (await import(c.catalog)).DECKS; }
// The standards line under a cover title: codes joined with " \u00b7 " ("PH.1.2 \u00b7 PH.1.3"), or "" when none are listed.
export function standardsLine(d) {
  return (Array.isArray(d && d.standards) ? d.standards : []).map((c) => String(c).trim()).filter(Boolean).join(" \u00b7 ");
}

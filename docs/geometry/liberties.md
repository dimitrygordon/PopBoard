# Geometry course: liberties taken

The course follows `docs/geometry/progression.md` exactly for its order, titles, learning targets, hooks, and the interactives it flags. Where the plan gave only a title or a target, I wrote standard high school geometry. Every such choice is listed here so a teacher can check it.

## Content written beyond the plan
- **Lesson text.** The plan gives a title, an "I can" target and a hook for each lesson. The big idea, the worked examples and the check questions for the 141 regular lessons were written from standard Geometry content (Indiana and Common Core). They live in `tools/geometry/content/u01-u04.mjs`, `u05-u08.mjs` and `u09-u12.mjs`.
- **Review, quiz, assessment, midterm, project and final days.** The plan names these days but gives them no content. Their pages are generated from the targets of the lessons they cover: a list of those targets, a mixed set of practice prompts drawn from those lessons' check questions, and a short how-to-prepare page. They contain no new math. Reteach and flex days use the same "quiz" layout.
- **5.14 example.** The worked example was changed to a line through (4, 1), so the parallel and perpendicular answers come out to clean numbers (y = 3x − 11 and y = −(1/3)x + 7/3), and the check substitutes the point back in.
- **Standards.** Each lesson's standards come from the plan's coverage section, which maps standards to lessons, plus any "Assess G..." targets. Lessons the coverage section does not name show no standards chip. The plan's "Assess Semester 1" text is not treated as a standard code.
- **Spelling.** The plan and my drafts mixed in UK spellings (centre, centred). All learner-facing copy and code comments use US spelling (center, centered).
- **"Jasper HS" hooks.** The plan's hooks for 7.5 and 8.1 refer to Jasper High School. They stay as written, because that is the school, not the mascot. No Jasper character art or narration appears anywhere.

## Interactive design choices
The plan names each of the 44 interactives with a single line. The mechanics are mine:
- **Constructions (15)** are step-by-step compass-and-straightedge animations with Next, Back, Show all and Reset. Each step draws its arcs with a sweep and explains itself in one sentence.
- **Mini golf (u03.golf):** three holes, each with a wall. You aim with reflection buttons, and the ball path is the straight line to the mirror image of the hole. The hole layouts are invented.
- **Pentagon (u06.pentagon)** uses Ptolemy's construction (the midpoint of a radius, then an arc to find the side length). The plan does not say which construction to use.
- **Fractals and the Pythagoras tree** cap their depth (about 6 to 8 levels) so phones stay fast.
- **Napoleon's theorem** builds its equilateral triangles outward. **Cross sections** use the regular hexagon slice of a cube. **Cavalieri** compares a stack of slices that can be sheared.
- **Reduce motion:** sweeps and animations jump straight to their end state.

## Art
- Unit covers are rosettes and fractals drawn as SVG by `public/geometry/geo-covers.js`. The motif for each unit is my choice: Seed of Life, Flower of Life, Metatron's cube, and others. Covers and figures can be swapped per unit or lesson through `tools/geometry/art-map.json` (covers) and `public/geometry/art/manifest.json` (page images, keyed `unit.lesson/page`).

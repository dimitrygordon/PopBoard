# Dimitry's DIY Project Based Learning for Math and Science Bookshare

Friction Lesson style storyboard (18 pages). No audio. Script text sits in the side column as Dimitry's teleprompter. Hide text / Full screen collapses the side so only the looping art remains.

## Content source

Socrates' Book Share Content Package. Do not invent wording.

## Art drop-in (Leo)

Put files in `art/sNN/` where NN is `01`..`18`:

- `bg.webp` / `bg.png` full-bleed background
- `mid.webp` / `mid.png` middle layer (gentle drift)
- `fg.webp` / `fg.png` foreground (gentle bob)

Slide 1 also uses `art/book_cover.webp` (real Routledge cover). Course card uses `art/cover.webp`.

Until art lands, pages show a "Leo art pending" note plus CSS looping scene accents. Reloading the page picks up new files; no rebuild needed for layer images.

## Script

`script.md` and `narration/manifest.json` hold the per-slide narration text (audio is always null).

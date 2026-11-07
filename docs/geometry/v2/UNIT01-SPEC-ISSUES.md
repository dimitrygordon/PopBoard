# Unit 1 build: spec questions for Socrates and Euclid

Built from SPEC-unit01.md on feat/geometry-v2-u01. Nothing in the spec was silently changed; each item below is either rendered as written or handled as noted.

1. Words to know (all of 1.1 to 1.12, screen 4). The slide list asks for each word "with a one-line meaning and a small picture or example", but the spec gives only the word list. The build shows the bare list. Socrates: please supply the one-line meanings.
2. Try it (screen 7). Lessons 1.1, 1.3, 1.4 and 1.7 to 1.12 describe labs that do not exist yet (illusion lab, street-grid sketch, ray-length slider, and so on). As in Unit 4, those screens use the ordered-steps activity built from worked example 1. Lessons 1.2, 1.5 and 1.6 mount the existing interactives u01.chords, u01.sierpinski and u01.euclid.
3. Answer-key typesetting (Euclid, 1.13 and 1.14 keys). The key text has extraction artifacts: "43, 200", "1, 000", "m=4 r", "u 1=5", "onl, m", "Only(on, off)violates", "product-2". The exporter repairs only the spacing, through tools/geometry/u01-errata.json. No values or wording change. Please fix them at the source.
4. Learner and builder figure slots disagree. Each case follows the learner slot:
   - 1.9 worked example 1 (u01-l09-s05) and 1.9 practice 1 (s09): the learner slot asks for a sketch and the builder says no diagram. Both are drawn.
   - 1.14 A10 (u01-l14-s13) and B10 (s25): the learner slot says no drawing and the builder describes a dependency tree or branch diagram. No figure is shown.
5. 1.1 common-mistake correction uses ruler marks 0, 5 and 7, 12, while worked example 1 uses 0, 3 and 5, 8. Both are correct, but they don't match. 1.13 item 3 uses 0, 5 and 7, 12.
6. 1.14 B12 learner prompt carries an inline "[Sign-off patch U1]" tag. The exporter strips it.
7. Earth-model figures (1.4, 1.13 item 6, 1.14 A4 and B4) draw the small center angles wider than true and carry "Not to scale."

Math spot checks, all correct: 600 · 360 / 6 = 36000; 800 · 360 / 8 = 36000; 835 · 360 / 7.5 = 40,080; 360 · 900 / 43,200 = 7.5; f(40) = 1681 = 41²; g(6) = 133; u3 = 11; 40,000 and 60,000 km; 6-point circle gives 31 regions; 2 diagonals from one vertex of a pentagon; 4 lines in 1.3 worked example 2. The coordinate certificates also check out: the bow-tie X is the midpoint of both crossing sides, W = (4, 2) is outside the dented pentagon, the equal circles cross at (0, sqrt(7)/2), the B3 markers have no collinear triple, and the 1.5 rhombus has side 5 with a 60 degree angle.

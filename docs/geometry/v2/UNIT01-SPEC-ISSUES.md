# Unit 1 build: spec questions for Socrates and Euclid

Built from SPEC-unit01.md on feat/geometry-v2-u01. Nothing in the spec was silently changed; each item below is either rendered as written or handled as noted.

1. Words to know (all of 1.1 to 1.12, screen 4). The slide list asks for each word "with a one-line meaning and a small picture or example", but the spec gives only the word list. The build shows the bare list. Socrates: please supply the one-line meanings.
   - Resolved: Socrates supplied all 72 meanings in docs/geometry/v2/VOCAB-unit01.json. The build renders each term in bold followed by its meaning, and a test fails if any term or built meaning is missing.
2. Try it (screen 7). Lessons 1.1, 1.3, 1.4 and 1.7 to 1.12 describe labs that do not exist yet (illusion lab, street-grid sketch, ray-length slider, and so on). As in Unit 4, those screens use the ordered-steps activity built from worked example 1. Lessons 1.2, 1.5 and 1.6 mount the existing interactives u01.chords, u01.sierpinski and u01.euclid.
   - Resolved: Interim ordered-steps activity stays. Wanted labs are listed under "Labs wanted" below.
3. Answer-key typesetting (Euclid, 1.13 and 1.14 keys). The key text has extraction artifacts: "43, 200", "1, 000", "m=4 r", "u 1=5", "onl, m", "Only(on, off)violates", "product-2". The exporter repairs only the spacing, through tools/geometry/u01-errata.json. No values or wording change. Please fix them at the source.
4. Learner and builder figure slots disagree. Each case follows the learner slot:
   - 1.9 worked example 1 (u01-l09-s05) and 1.9 practice 1 (s09): the learner slot asks for a sketch and the builder says no diagram. Both are drawn.
   - 1.14 A10 (u01-l14-s13) and B10 (s25): the learner slot says no drawing and the builder describes a dependency tree or branch diagram. No figure is shown.
   - Resolved: Socrates confirmed: keep following the learner (student) notes. No change.
5. 1.1 common-mistake correction uses ruler marks 0, 5 and 7, 12, while worked example 1 uses 0, 3 and 5, 8. Both are correct, but they don't match. 1.13 item 3 uses 0, 5 and 7, 12.
   - Resolved: Socrates confirmed the different ruler marks are intentional. No change.
6. 1.14 B12 learner prompt carries an inline "[Sign-off patch U1]" tag. The exporter strips it.
7. Earth-model figures (1.4, 1.13 item 6, 1.14 A4 and B4) draw the small center angles wider than true and carry "Not to scale."

Math spot checks, all correct: 600 · 360 / 6 = 36000; 800 · 360 / 8 = 36000; 835 · 360 / 7.5 = 40,080; 360 · 900 / 43,200 = 7.5; f(40) = 1681 = 41²; g(6) = 133; u3 = 11; 40,000 and 60,000 km; 6-point circle gives 31 regions; 2 diagonals from one vertex of a pentagon; 4 lines in 1.3 worked example 2. The coordinate certificates also check out: the bow-tie X is the midpoint of both crossing sides, W = (4, 2) is outside the dented pentagon, the equal circles cross at (0, sqrt(7)/2), the B3 markers have no collinear triple, and the 1.5 rhombus has side 5 with a 60 degree angle.

## Labs wanted

These lessons use the ordered-steps activity until a lab is built. Each line quotes the spec's Try it description.

- 1.1: Illusion lab: drag the arrow fins on two segments. The segments seem to change length, but the length readout never moves. Write one sentence on what changed and what stayed the same.
- 1.3: Street-grid sketch: draw streets as lines and drag two corners. The panel always shows exactly one straight street through them. Mark three corners on one street (collinear) and one corner that is not.
- 1.4: Ray-length slider: drag the length of each ray. The angle readout stays the same until you change a ray's direction.
- 1.7: Dictionary chase: follow the chain from 'point' in a real dictionary. Draw each word as a box with an arrow to the words its definition uses. Stop when an arrow loops back.
- 1.8: Truth-table panel: set P and Q to true or false. Watch 'if P then Q', its converse, its inverse and its contrapositive update.
- 1.9: Definition tester: type a definition of 'kite' and drag the corners of a quadrilateral. The panel says whether each shape passes your test. Hunt for a shape that passes but isn't a kite, and a kite that fails. (A rhombus counts as a kite.)
- 1.10: Proof shuffle: drag scrambled proof lines into order. A line locks in only when every reason it needs is above it.
- 1.11: Suspect puzzle: three statements, one liar. Tap 'Assume this suspect lies' for each suspect in turn. The panel shows which assumption leads to a clash.
- 1.12: Axiom wall: drag a statement card onto the wall. A theorem card can go up only after you draw arrows to the cards it uses. A loop of arrows gets the label LOOP and the card won't stick.

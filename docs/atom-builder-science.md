# Atom Builder: science notes

Status: Cleared by Tesla 2026-10-29. Every claim below has Tesla's sign-off.

## What the module models
- An atom's element is set only by its proton count (atomic number Z). Cleared by Tesla 2026-10-29
- Mass number A = protons + neutrons. Electrons are left out of A because their mass is tiny (about 1/1836 of a proton). Cleared by Tesla 2026-10-29
- Charge = protons minus electrons. A positive ion has lost electrons and a negative ion has gained them. Cleared by Tesla 2026-10-29
- Isotopes are atoms of the same element with different neutron counts. Cleared by Tesla 2026-10-29

## Stability
- "Stable" means the nuclide appears in the table of stable (observationally stable) nuclides for Z = 1 to 20. The list in `ab-model.js` (ELEMENTS) is checked per entry against NNDC NuDat (https://www.nndc.bnl.gov/nudat3/) and the IUPAC table of isotopic compositions (CIAAW, https://www.ciaaw.org/isotopic-abundances.htm). Ca-48 is listed as stable because it is observationally stable (its double beta decay half-life is far longer than the age of the universe). Cleared by Tesla 2026-10-29
- Anything else is shown as unstable: "Unstable nucleus: it would change by radioactive decay (some take seconds, some take billions of years)." We do not show half-lives or decay modes. Very long-lived nuclides (for example K-40) count as unstable here. Cleared by Tesla 2026-10-29
- Unstable nuclei wobble gently. This is a visual cue only; real nuclei do not visibly shake. Cleared by Tesla 2026-10-29

## Electrons
- Electrons are drawn as clouds (probability regions), never as orbits. The 1s cloud is a filled disk that fades outward; outer clouds are fuzzy bands (Leo). Cleared by Tesla 2026-10-29
- Electron tokens appear at likely spots inside their cloud and now and then reappear somewhere else. They never move along a path. Cleared by Tesla 2026-10-29
- Clouds fill 2, 8, 8, then the 4th cloud holds up to 4. This cap is simplified (real 4s holds 2; K is 2,8,8,1 and Ca is 2,8,8,2). K and Ca fill 4s before 3d. We stop at 22 electrons, so calcium can take a couple of extra electrons in Sandbox. Cleared by Tesla 2026-10-29
- The electron token is about 1/4 of a proton's width. Real electrons are far smaller still; this is a teaching size. Cleared by Tesla 2026-10-29

## Scale
- Live caption: "Not to scale: the real nucleus is far tinier." A real nucleus is about 1/100,000 of the atom's width. Cleared by Tesla 2026-10-29

## Limits
- Z up to 20, N up to 30, electrons up to 22. Big negative ions (for example C with 10 extra electrons) are allowed in Sandbox though they would not exist in nature. Cleared by Tesla 2026-10-29

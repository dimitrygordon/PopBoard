# Atom Builder: science notes

Status: TODO-TESLA (science review pending). Every claim below needs Tesla's sign-off.

## What the module models
- An atom's element is set only by its proton count (atomic number Z). TODO-TESLA
- Mass number A = protons + neutrons. Electrons are left out of A because their mass is tiny (about 1/1836 of a proton). TODO-TESLA
- Charge = protons minus electrons. A positive ion has lost electrons and a negative ion has gained them. TODO-TESLA
- Isotopes are atoms of the same element with different neutron counts. TODO-TESLA

## Stability
- "Stable" means the nuclide appears in the table of stable (observationally stable) nuclides for Z = 1 to 20. The list in `ab-model.js` (ELEMENTS) needs a per-entry check. TODO-TESLA
- Anything else is shown as unstable ("it would change by radioactive decay"). We do not show half-lives or decay modes. Very long-lived nuclides (for example K-40) count as unstable here. TODO-TESLA
- Unstable nuclei wobble gently. This is a visual cue only; real nuclei do not visibly shake. TODO-TESLA

## Electrons
- Electrons are drawn as clouds (probability regions), never as orbits. The 1s cloud is a filled disk that fades outward; outer clouds are fuzzy bands (Leo). TODO-TESLA
- Electron tokens appear at likely spots inside their cloud and now and then reappear somewhere else. They never move along a path. TODO-TESLA
- Clouds fill 2, 8, 8, then the 4th cloud holds up to 4 (K and Ca fill 4s before 3d). We stop at 22 electrons, so calcium can take a couple of extra electrons in Sandbox. TODO-TESLA
- The electron token is about 1/4 of a proton's width. Real electrons are far smaller still; this is a teaching size. TODO-TESLA

## Scale
- Live caption: "Not to scale: the real nucleus is far tinier." A real nucleus is about 1/100,000 of the atom's width. TODO-TESLA

## Limits
- Z up to 20, N up to 30, electrons up to 22. Big negative ions (for example C with 10 extra electrons) are allowed in Sandbox though they would not exist in nature. TODO-TESLA

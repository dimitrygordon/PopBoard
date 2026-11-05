# Periodic Table Studio

Study library module: `public/study-periodic-table-studio.html`. Atom Builder links to it from its header (`#ptLink`), and it links back (`#atomLink`).

## Files
- `public/periodic-table/pt-core.js`: pure helpers (phase at a temperature, trend ranges, discovery year, subshells, orbital point clouds).
- `public/periodic-table/pt-app.js`: `mountPeriodicTable(root)` builds the table, mode panels, hover inspector, isotope flyout and the detail drawer (Bohr 2D, Bohr 3D, QM orbitals).
- `public/periodic-table/pt-ui.js`: page glue (theme, back, Atom Builder link).
- `public/periodic-table/pt.css`: dark (charcoal/cream) and light (paper) themes. Leo hooks: `--c-*`, `--s-*`, `--tr-*`, `--pt-*` tokens and `.cat-*`, `[data-k]` classes.
- `public/periodic-table/pt-elements.json`: data, 118 elements.

## Data sources (no hand-entered values)
- PubChem Periodic Table (NIH/NCBI), https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON : mass, category, electronegativity, atomic radius, ionization energy (eV), electron affinity, standard state, melting and boiling points, density, discovery year.
- Periodic-Table-JSON (Bowserinator, CC BY-SA, from Wikipedia), https://github.com/Bowserinator/Periodic-Table-JSON : grid position, shells, configurations, summary text, covalent and van der Waals radii, first ionization energy (kJ/mol).
- IAEA Nuclear Data Services LiveChart ground states (ENSDF), https://nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all : isotopes, abundance, half-life, decay mode. Each element lists all stable isotopes plus the longest-lived radioactive ones (half-life of at least 1 s), up to 10. The decay color is the primary mode of the longest-lived isotope, or stable.

## Modelling choices for Tesla to review
- Phase at T is at 1 atm: solid below the melting point, liquid between, gas at or above the boiling point. Elements whose listed boiling point is below the melting point (arsenic) sublime. No melting point, or no boiling point above the melting point, shows Unknown.
- Helium shows solid near 0 K because PubChem lists 0.95 K (that needs pressure).
- Neutron count in the drawer uses the rounded standard atomic mass.
- QM view draws the angular shape of each real orbital (s, p, d, f) as a probability cloud colored by sign; radial nodes are not drawn.
- Electrical conductivity is not in the sources, so that trend is not offered yet.

## Data and views (Leo pack, 2026-11-02)
- pt-elements.json is converted from Leo's physics101/periodic-table/data/elements.json (PubChem, mendeleev, IAEA LiveChart; see Leo's SOURCES.md) by tools/periodic-table/convert.py. Tesla rulings (tesla-rulings.md) are applied in Leo's data, then re-converted.
- Atom views: 2D Bohr (canvas), 3D Bohr and Orbitals (Three.js, pt-three.js, vendored three.module.min.js). Orbitals are simplified hydrogen-like pictures.
- Deep link: study-periodic-table-studio.html?z=N opens element N.

## Atom Builder living atom
- ab-decay.json: Leo's atom-builder/data/decay.json (IAEA LiveChart ground states, ENSDF/NUBASE2020) for Z 1 to 22 plus the U-238, Th-232 and U-235 chains, built by tools/periodic-table/convert_ab_decay.py.
- Stability is still ab-model.js isStable (Tesla-cleared lists). Decay runs only when the student presses Allow decay; electrons are kept, so the charge badge shows the ion left behind.

## Tesla re-stamp (2026-11-02)
- Studio: Hs/Bh/Mt/Rg AME2020 systematics masses (estimated label), Ce EA approximate (~). Bk-248 stays radioactive.
- Atom Builder: Be-6 single 2p breakup to He-4; Ca-48 2B- to Ti-48, no branch %, 6.4e19 y NEMO-3 default; U-238 chain via Pa-234m; branches under 0.01% hidden in display; "branch not measured"; unbound label; charge carries forward with caption; Be-8 label; K-40 random by % with both routes listed. Sandbox branch choice built but off (BRANCH_CHOICE) until Dimitry decides.
- Leo pack: full reskin (colored pencil, both themes), ion stubs Z<=20, SVG particles, dashed empty electron slots, meter .35/.7, Step back.

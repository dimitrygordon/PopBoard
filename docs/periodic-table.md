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

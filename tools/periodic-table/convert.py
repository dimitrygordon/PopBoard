# Leo's data/elements.json -> compact public/periodic-table/pt-elements.json (no new values).
import json,sys
src=json.load(open('/workspace/physics101/periodic-table/data/elements.json'))
CAT={'alkali_metal':'Alkali metal','alkaline_earth_metal':'Alkaline earth metal','transition_metal':'Transition metal','post_transition_metal':'Post-transition metal','metalloid':'Metalloid','nonmetal':'Nonmetal','halogen':'Halogen','noble_gas':'Noble gas','lanthanide':'Lanthanide','actinide':'Actinide'}
DEC={'stable':'stable','alpha':'alpha','beta_minus':'beta-','ec_beta_plus':'ec','sf':'sf'}
out=[]
for e in src:
  z=e['z']
  if 57<=z<=71: x,y=z-54,9
  elif 89<=z<=103: x,y=z-86,10
  else: x,y=e['group'],e['period']
  dy=e['discovery_year']
  out.append(dict(z=z,sym=e['symbol'],name=e['name'],mass=e['atomic_mass'],cat=CAT[e['category']],config=e['electron_configuration'],shells=e['shells'],x=x,y=y,block=e['block'],
    phase=(e['phase_at_298K'] or '').capitalize() or None,expected=e['phase_source_expected'],mp=e['melting_point_K'],bp=e['boiling_point_K'],density=e['density_g_cm3'],en=e['electronegativity_pauling'],
    radius=e['atomic_radius_pm'],ie=e['ionization_potential_eV'],ea=e['electron_affinity_eV'],ie1kj=e['ionization_energy_kJmol'],cov=e['covalent_radius_pm'],vdw=e['van_der_waals_radius_pm'],
    year=None if dy in (None,'ancient') else int(dy),ancient=dy=='ancient',summary=e['description'],decay=DEC.get(e['primary_decay_bucket'],'unknown'),nStable=e['stable_isotope_count'],
    neutrons=e['neutrons_most_stable'],mostStable=e['most_stable_isotope'],
    orbs=[dict(label=o['label'],n=o['n'],l='spdf'[o['l']],e=o['electrons'],cap=o['capacity'],status=o['status'],shapes=o['shapes']) for o in e['orbitals']],
    iso=[dict(A=i['mass_number'],ab=i['abundance_pct'],hl='Stable' if i['is_stable'] else i['half_life'],hh=i.get('half_life_human'),dm=i['decay_mode']) for i in e['isotopes']]))
assert len(out)==118 and len({(o['x'],o['y']) for o in out})==118
json.dump(dict(sources={"properties":"PubChem Periodic Table (NIH/NCBI), https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON","radii_descriptions":"mendeleev Python package (MIT), https://github.com/lmmentel/mendeleev","isotopes":"IAEA Nuclear Data Section LiveChart ground states, https://www-nds.iaea.org/relnsd/v1/data?fields=ground_states&nuclides=all","built_by":"Leo, data/elements.json (Nov 2, 2026), converted by tools/periodic-table/convert.py"},elements=out),open(sys.argv[1],'w'),separators=(',',':'))

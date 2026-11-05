# Leo's atom-builder/data/decay.json (IAEA LiveChart) -> public/atom-builder/ab-decay.json for Z 1..22.
# Keeps every mode as IAEA gives it; daughter from Leo's data, else derived from the IAEA code.
import json,re,sys
d=json.load(open('/workspace/physics101/atom-builder/data/decay.json'))
def derive(z,a,code):
  m=re.fullmatch(r'(2B-|B-|EC\+B\+|EC|B\+)?(\d?)(N|P|A)?',code or '')
  if not m: return None
  b,k,em=m.groups(); k=int(k) if k else 1
  dz={'2B-':2,'B-':1,'EC+B+':-1,'EC':-1,'B+':-1,None:0}[b]
  if em=='N': return z+dz,a-k
  if em=='P': return z+dz-k,a-k
  if em=='A': return z+dz-2,a-4
  return (z+dz,a) if b else None
iso={}
for i in d['isotopes']:
  if i['z']>22: continue
  modes=[]
  for m in i['modes']:
    dz,da=m['daughter_z'],m['daughter_a']
    if dz is None:
      r=derive(i['z'],i['a'],m['iaea_code']); dz,da=(r if r else (None,None))
    modes.append([m['iaea_code'],m['branch_pct'],dz,da])
  modes.sort(key=lambda x:-(x[1] or 0))
  iso[f"{i['z']}-{i['a']}"]=[i['half_life_s'],i['half_life'] or None,i['half_life_human'],modes]
# Tesla re-stamp 2026-11-02 (atom-builder/data/tesla-restamp.md).
YR=365.2422*86400
iso['4-6'][3]=[['2P',100.0,2,4]]  # three-body breakup Be-6 -> He-4 + p + p; He-2 is not bound
iso['20-48']=[6.4e19*YR,'6.4E19 Y','6.4e19 yr',[['2B-',None,22,48]]]  # IAEA row sums 174%; NEMO-3 half-life, no branch %
labels={'4-6':'breaks into helium-4 + 2 protons','4-8':'splits into two helium-4 nuclei in about 1e-16 s'}
notes={'20-48':'Half-life 6.4e19 y from NEMO-3 (Arnold et al. 2016, Phys. Rev. D 93, 112008). IAEA lists 2.9e19 y with a large uncertainty. Single beta decay to Sc-48 has never been seen.'}
band={k:[v['n_min'],v['n_max']] for k,v in d['stability_band']['per_z'].items() if int(k)<=22}
CODE={'alpha':'A','beta_minus':'B-'}
chains={}
for name,c in d['chains'].items():
  steps=[]
  for x in c['steps']:
    steps.append([x['z'],x['a'],x['nuclide'],CODE.get(x.get('mode'),'stable' if not x.get('mode') else x['mode']),x.get('half_life') if x.get('half_life_s') else None,x.get('branch_pct'),[[m[0],m[1]] for m in (x.get('all_modes') or []) if m[1]] if len([1 for m in (x.get('all_modes') or []) if m[1]])>1 else [],x.get('charge_after'),x.get('source','')])
  chains[name.split(' to ')[0]]=steps
json.dump(dict(source=d['meta']['source'],built=d['meta']['built'],accessed='2026-11-02',band=band,iso=iso,labels=labels,notes=notes,chains=chains),open(sys.argv[1],'w'),separators=(',',':'))
print(len(iso))

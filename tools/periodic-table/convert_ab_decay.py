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
band={k:[v['n_min'],v['n_max']] for k,v in d['stability_band']['per_z'].items() if int(k)<=22}
json.dump(dict(source=d['meta']['source'],built=d['meta']['built'],band=band,iso=iso),open(sys.argv[1],'w'),separators=(',',':'))
print(len(iso))

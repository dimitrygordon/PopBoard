"""Export only learner fields. Builder proofs and certificates stay outside public/."""
import sys, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/geometry/spec-src'))
from data import J,M

def write(name,data):
 p=ROOT/'tools/geometry'/name;text=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 if '--check' in sys.argv:
  if p.read_text()!=text:raise ValueError('Stale export: '+name)
 else:p.write_text(text)
refs={}
review={1:['1R','2R'],2:['3R'],3:['8R'],4:['4R'],5:['5R','6R'],6:['7R'],7:['9R'],8:['10R'],9:['11R'],10:['12R','13R'],11:['14R'],12:['15R','16R']}
plan=(ROOT/'docs/geometry/progression.md').read_text()
for lid,title in re.findall(r'^\| (\d+\.\d+) \| ([^|]+)',plan,re.M):
 keys,note,mis=M.get(lid,(review[int(lid.split('.')[0])],'Related review scope',''))
 if 'Midterm' in title:keys=['MR']
 if 'Final' in title:keys=['FR']
 relationship='related review scope' if lid not in M or keys in [['MR'],['FR']] else ''
 if lid in ['6.1','6.6']:relationship='adapted convention'
 if lid=='10.7':relationship='derived corollary'
 if lid=='12.12':keys=['15.2','15.3','15.4','15.6'];relationship='related review scope';note='Original design application; related background'
 refs[lid]=dict(relationship=relationship,section='; '.join(keys) or 'Supplement',pages='; '.join(f'{J[k][0]} to {J[k][1]}' for k in keys) or 'No direct Jacobs section',note=note,references=[dict(section=k,pages=list(J[k])) for k in keys],misconception=mis)
write('jacobs-map.json',refs)

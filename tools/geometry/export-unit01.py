"""Export final Unit 1 from SPEC-unit01.md with an explicit learner-field allowlist, never a builder blob."""
import sys, json, re, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def write(file,text):
 if '--check' in sys.argv:
  if not file.exists() or file.read_text()!=text:raise ValueError('Stale export: '+str(file))
 else:file.write_text(text)
spec=(ROOT/'docs/geometry/v2/SPEC-unit01.md').read_text()
sections={m[1]:m[2] for m in re.finditer(r'^## (1\.\d+) [^\n]+\n(.*?)(?=^## |\Z)',spec,re.M|re.S)}
if len(sections)!=14:raise ValueError('Expected 14 Unit 1 sections')
# Typesetting repairs (regex, replacement) for extraction artifacts in the answer-key text, such as '43, 200' and 'onl'. Values and wording are unchanged.
ERRATA=json.loads((ROOT/'tools/geometry/u01-errata.json').read_text())
def clean(s):
 s=re.sub(r'\s*\[(?:Sign-off patch|Socrates fix|Socrates audit note)[^\]]*\]','',s)
 s=re.sub(r'\s+',' ',s).strip().replace(chr(0x2014),'-').replace(chr(0x2013),'-')
 for a,b in ERRATA:s=re.sub(a,b,s)
 return s
def strip_quotes(s):return re.sub(r'^\s*> ?','',s,flags=re.M).strip()
def field(body,name):
 m=re.search(r'^- '+re.escape(name)+r'[^\n]*:[ \t]*\n(.*?)(?=^- )',body,re.M|re.S)
 if not m:raise ValueError('Missing field '+name)
 return m[1]
def builder(body):return strip_quotes(body.split('**Builder and answer-key layer**',1)[1])
def diagrams(text,prefix):
 out={}
 for m in re.finditer(r'\*\*'+re.escape(prefix)+r'\.? ?([A-Za-z]*\s?\d+)\. Prompt:\*\*.*?\*\*Diagram, B&W line art:\*\* (.*?)(?=\n\n|\n- |\Z)',text,re.S):out[re.sub(r'\s','',m[1])]=clean(m[2])
 return out
unit={}
for lid in [f'1.{n}' for n in range(1,13)]:
 body=sections[lid]
 goals=[clean(g) for g in re.findall(r'^  \d+\. (.*)',field(body,'Learning goals'),re.M)]
 hook=clean(re.search(r'^- Hook: (.*)',body,re.M)[1])
 slides=dict((int(a),b) for a,b in re.findall(r'^  (\d+)\. (.*)',field(body,'Slide list'),re.M))
 idea=clean(slides[3].split(': ',1)[1])
 words=slides[4].split(': ',1)[1].split('. Each word')[0]
 tryit=clean(re.sub(r'\s*Figure slot: the live panel\.?','',slides[7].split(': ',1)[1]))
 exit_items=[clean(x) for x in re.findall(r'^  \d+\. (.*)',field(body,'Exit ticket'),re.M)]
 if not exit_items[-1].startswith("What's confusing"):raise ValueError('Exit must end with confusing: '+lid)
 learner=body.split('**Learner layer**',1)[1].split('**Builder and answer-key layer**',1)[0]
 examples=[]
 for m in re.finditer(r'^  - Worked example (\d+): (.*?)\n(.*?)(?=^  - |\Z)',learner,re.M|re.S):
  fig=re.search(r'^    - Figure slot: (.*)',m[3],re.M)
  rows=[]
  for row in re.findall(r'^    \| (.*?) \|$',m[3],re.M):
   step,reason=row.split(' | ',1)
   if step not in('Step','---'):rows.append(dict(step=clean(step),reason=clean(reason)))
  if not rows:raise ValueError('No learner proof rows: '+lid)
  examples.append(dict(title=clean(m[2]),steps=rows,slot=clean(fig[1]) if fig else ''))
 if len(examples)!=2:raise ValueError('Expected 2 worked examples: '+lid)
 practice=[dict(prompt=clean(a),slot=clean(f),solution=clean(b),check=clean(c)) for a,f,b,c in re.findall(r'^    \d+\. (.*?)\n       - Figure slot: (.*?)\n       - Reveal 1 \(worked solution\): (.*?)\n       - Reveal 2 \(second check\): (.*)',learner,re.M)]
 if len(practice)!=3:raise ValueError('Expected 3 practice: '+lid)
 mm=re.search(r'^  - Common mistake: (.*?)\n    - Figure slot: (.*)',learner,re.M)
 prompt,correction=mm[1].split(' Fix it: ',1)
 ck=re.search(r'^  - Check yourself: (.*)',learner,re.M)[1]
 q,a=ck.split(' Answer: ',1)
 b=builder(body)
 jac=clean(re.search(r'^- Jacobs: (.*)',body,re.M)[1]);mis=clean(re.search(r'^- Misconception and how to surface it: (.*?) Surface it:',body,re.M)[1])
 unit[lid]=dict(jacobs=jac,misconception=mis,goals=goals,hook=hook,idea=idea,words=[clean(w) for w in re.split(r',\s*',words)],tryit=tryit,examples=examples,mistake=dict(prompt=clean(prompt),correction=clean(correction)[:1].upper()+clean(correction)[1:],slot=clean(mm[2])),practice=practice,check=[clean(q),clean(a)],exit=exit_items[:-1],builderDiagrams=diagrams(b,lid))
def bank(body,pattern,ids):
 learner=body.split('- Builder and answer-key layer',1)[0]
 keys=strip_quotes(body.split('- Builder and answer-key layer',1)[1])
 items=[]
 prompts=re.findall(r'^    \d+\. (.*?)\n       - Figure slot: (.*)',learner,re.M)
 if len(prompts)!=len(ids):raise ValueError(('prompt count',len(prompts),len(ids)))
 for (prompt,slot),iid in zip(prompts,ids):
  m=re.search(pattern(iid)+r'\. Prompt:\*\* .*?\*\*Full solution:\*\* (.*?)\n\n\*\*Independent check:\*\* (.*?)\n\n\*\*Diagram, B&W line art:\*\* (.*?)(?=\n\n|\Z)',keys,re.S)
  if not m:raise ValueError('Missing key '+iid)
  items.append(dict(id=iid,prompt=clean(prompt),slot=clean(slot),solution=clean(m[1]),check=clean(m[2]),diagram=clean(m[3])))
 return items
s13=sections['1.13'];s14=sections['1.14']
unit['1.13']=dict(practice=bank(s13,lambda i:r'\*\*1\.13\. ?Bank ?'+i.split('-')[1],[f'1.13-{n}' for n in range(1,17)]))
learner14=s14.split('- Builder and answer-key layer',1)[0];keys14=s14[len(learner14):]
unit['1.14']=dict(forms={f:bank(learner14.split('  - Form '+f+':',1)[1].split('  - Form ',1)[0]+keys14,lambda i:r'\*\*1\.14\.'+i,[f'{f}{n}' for n in range(1,13)]) for f in 'AB'})

def apply_student_overrides(unit):
 # Tesla wording suggestions, pending Socrates. SPEC is unchanged; this file is the review list's source of truth with SOCRATES-REVIEW-unit01.md.
 ov=json.loads((ROOT/'tools/geometry/u01-student-overrides.json').read_text())
 for lid,patch in ov.get('lessons',{}).items():
  u=unit[lid]
  if 'hook' in patch:u['hook']=patch['hook']
  if 'idea' in patch:u['idea']=patch['idea']
  if 'words' in patch:u['words']=list(patch['words'])
  if 'exit' in patch:
   exit=list(u['exit'])
   for i,val in enumerate(patch['exit']):
    if val is not None:exit[i]=val
   u['exit']=exit
  if 'mistakeCorrection' in patch:u['mistake']['correction']=patch['mistakeCorrection']
  if 'check' in patch:u['check']=list(patch['check'])
  for i,ep in (patch.get('examples') or {}).items():
   e=u['examples'][int(i)]
   if 'title' in ep:e['title']=ep['title']
   for si,sp in (ep.get('steps') or {}).items():
    if 'step' in sp:e['steps'][int(si)]['step']=sp['step']
    if 'reason' in sp:e['steps'][int(si)]['reason']=sp['reason']
  for i,pp in (patch.get('practice') or {}).items():
   p=u['practice'][int(i)]
   p.update(pp)
 def find(iid):
  if iid.startswith('1.13'):
   return next(p for p in unit['1.13']['practice'] if p['id']==iid)
  return unit['1.14']['forms'][iid[0]][int(iid[1:])-1]
 for iid,fields in ov.get('items',{}).items():
  item=find(iid)
  for k,val in fields.items():item[k]=val
apply_student_overrides(unit)
write(ROOT/'tools/geometry/u01-v2.json',json.dumps(unit,ensure_ascii=False,indent=2)+'\n')

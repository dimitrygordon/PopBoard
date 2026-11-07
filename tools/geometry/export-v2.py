"""Export only learner fields. Builder proofs and certificates stay outside public/."""
import sys, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/geometry/spec-src'))
from data import J,M
from learner_u04 import L,MOVED,BANK
from ovr_u04 import O

def write(name,data):
 (ROOT/'tools/geometry'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
refs={}
review={1:['1R','2R'],2:['3R'],3:['8R'],4:['4R'],5:['5R','6R'],6:['7R'],7:['9R'],8:['10R'],9:['11R'],10:['12R','13R'],11:['14R'],12:['15R','16R']}
plan=(ROOT/'docs/geometry/progression.md').read_text()
for lid,title in re.findall(r'^\| (\d+\.\d+) \| ([^|]+)',plan,re.M):
 keys,note,mis=M.get(lid,(review[int(lid.split('.')[0])],'Review and assessment scope',''))
 if 'Midterm' in title:keys=['MR']
 if 'Final' in title:keys=['FR']
 refs[lid]=dict(section='; '.join(keys) or 'Supplement',pages='; '.join(f'{J[k][0]} to {J[k][1]}' for k in keys) or 'No direct Jacobs section',note=note,references=[dict(section=k,pages=list(J[k])) for k in keys],misconception=mis)
write('jacobs-map.json',refs)
unit={}
errors={
'4.1':'Given A matches D, B matches E and C matches F, Jordan writes triangle ABC ≅ triangle FED. Find the mismatch.',
'4.2':'Jordan says: any three matching parts, even AAA, guarantee congruence. Find a counterexample.',
'4.3':'Jordan says angle B is included between sides AB and AC. Find the error.',
'4.4':'Jordan marks angles A and B and side AC, then writes ASA. Find the error.',
'4.5':'Jordan starts the proof of AC = AD with the reason AC = AD. Find the circular step.',
'4.6':'Jordan writes CPCTC before the line proving the triangles congruent. Fix the order.',
'4.7':'Jordan calls whichever angles are at the bottom of the drawing the base angles. Test that claim on a turned triangle.',
'4.8':'Jordan says Theorem 9 is true, so reversing its if and then proves Theorem 10. Find the logic error.',
'4.10':'Jordan proves SSS only when CG crosses inside AB, then claims all cases are finished. What is missing?',
'4.11':'Jordan says SSA becomes a valid test if every length is doubled. Use the doubled example to check.',
'4.12':'Jordan measures a copy with a ruler and calls it an exact compass-and-straightedge construction. What is wrong?',
'4.13':'Jordan writes angle APM = angle BPM without ever defining M. Repair the proof.',
'4.14':'Jordan uses SSS with only two sides and a non-included angle known. Which fact is missing?'
}
for lid,lr in L.items():
 ov=O[lid];examples=[dict(title=lr[k][0],steps=[dict(step=a,reason=b) for a,b in lr[k][1]],optional=lid=='4.13' and k=='we1') for k in ['we1','we2'] if k in lr]
 # Main-case proof split across three readable screens. Other cases stay in review.
 if lid=='4.10':
  base=examples[0];examples=[dict(title=base['title']+f' (part {i+1} of 3)',steps=st,optional=False) for i,st in enumerate([base['steps'][:3],base['steps'][3:5],base['steps'][5:]])]
 if lid=='4.13':examples.reverse()
 practice=list(lr['practice'])
 if lid=='4.14':
  t,st=MOVED['4.14_we3'];examples.append(dict(title=t,steps=[dict(step=a,reason=b) for a,b in st],optional=False));practice.append(MOVED['4.14_p4'])
 if lid=='4.13':
  examples[1]['steps'][0]['reason']='Define M before using it. Equal-radius crossings P and Q on opposite sides make PQ meet AB between A and B.'
 # Only explicit approved student fields cross this boundary, never builder_only/moved_out.
 idea=next(s for s in ov['slides'] if s.startswith('The big idea:')).split(': ',1)[1]
 unit[lid]=dict(goals=ov['goals'],hook=ov['hook'],idea=idea,examples=examples,practice=[dict(prompt=a,solution=b,check=c) for a,b,c in practice],mistake=lr['mistake'],mistakePrompt=errors[lid],exit=ov['exit'],answerSource=f'Euclid UNIT04-FILL.md {lid}, learner wording by Socrates')
# Extract reviewed solutions for review and Form A, not raw builder prose.
fill=(ROOT/'docs/geometry/v2/UNIT04-FILL.md').read_text()
reviewbody=fill.split('## 4.15 Review')[1].split('## 4.16')[0]
bank=[]
for num,prompt,key in re.findall(r'^(\d+)\. \*\*Prompt:\*\* (.*?)\n\s+\*\*Worked solution and second check:\*\* (.*)',reviewbody,re.M):
 sol,chk=key.split(' Check: ',1)
 # Learner alternatives prevent backend coordinate checks leaking into the UI.
 if num=='14':chk='M is the point on both PQ and AB; P and Q must be on opposite sides of AB.'
 bank.append(dict(prompt=BANK['Q'+num],solution=sol,check=chk))
unit['4.15']=dict(practice=bank,clinic=dict(title=MOVED['4.15_clinic'][0],steps=[dict(step=a,reason=b) for a,b in MOVED['4.15_clinic'][1]]))
unit['4.16']=dict(practice=bank[:12])
unit['4.9']=dict(placeholder='Quiz and reteach: awaiting replacement from Euclid. This is not an assessment.')
write('drafts/u04-v2.json',unit)

"""Export final Unit 4 with an explicit learner-field allowlist, never a builder blob."""
import sys, json, re, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def write(file,text):
 if '--check' in sys.argv:
  if not file.exists() or file.read_text()!=text:raise ValueError('Stale export: '+str(file))
 else:file.write_text(text)
sys.path.insert(0,str(ROOT/'tools/geometry/spec-src'))
from learner_u04 import L, MOVED
from ovr_u04 import O
spec=(ROOT/'docs/geometry/v2/SPEC-unit04.md').read_text()
sections={m[1]:m[2] for m in re.finditer(r'^## (4\.\d+) [^\n]+\n(.*?)(?=^## |\Z)',spec,re.M|re.S)}
prompts=json.loads((ROOT/'tools/geometry/spec-src/bank-u04.json').read_text())
art_prompts=json.loads((ROOT/'tools/geometry/spec-src/art-prompts-u04.json').read_text())
def clean(s):
 s=re.sub(r'\s*\[Sign-off patch[^\]]*\]','',s)
 s=re.sub(r'; (?:copy rows|wording) from UNIT04-SIGNOFF\.md \([a-z]\)','',s)
 return s.strip().replace(chr(0x2014),'-').replace(chr(0x2013),'-')
def strip_quotes(s):
 return re.sub(r'^\s*> ?', '',s,flags=re.M).strip()
unit={}
for lid,lr in L.items():
 ov=O[lid]
 # Read only the signed-off learner section. Builder prose cannot enter these tables.
 learner=sections[lid].split('**Learner layer**',1)[1].split('**Builder and answer-key layer**',1)[0]
 examples=[]
 for m in re.finditer(r'  - Worked example (\d+)[^\n]*:\n(.*?)(?=^  - |\Z)',learner,re.M|re.S):
  title=re.search(r'^    \*(.*?)\*',m[2],re.M)[1]
  rows=[]
  for row in re.findall(r'^    \| (.*?) \|$',m[2],re.M):
   step,reason=row.split(' | ',1)
   if step!='Step':rows.append(dict(step=clean(step),reason=clean(reason)))
  if not rows:raise ValueError('No learner proof rows: '+lid)
  examples.append(dict(title=clean(title),steps=rows,optional=lid=='4.13' and m[1]=='1'))
 if len(examples)<2:raise ValueError('Missing learner examples: '+lid)
 if lid=='4.13':examples.reverse()
 practice=[dict(prompt=clean(a),solution=clean(b),check=clean(c)) for a,b,c in re.findall(r'^    \d+\. (.*?)\n       - Reveal 1 \(worked solution\): (.*?)\n       - Reveal 2 \(second check\): (.*)',learner,re.M)]
 if not practice:raise ValueError('Missing learner practice: '+lid)
 misconception=re.search(r'^  - Common mistake: (.*)',learner,re.M)[1]
 idea=next(s for s in ov['slides'] if 'big idea:' in s.lower()).split(': ',1)[1]
 unit[lid]=dict(goals=ov['goals'],hook=ov['hook'],idea=clean(idea),examples=examples,practice=practice,mistake=clean(misconception),exit=ov['exit'],days=lr.get('days',1))
 if lid in art_prompts:unit[lid]['mistakePrompt']=clean(art_prompts[lid])
# Bank solutions are selected individually from Euclid, paired to Socrates' exact prompt ids.
def parse_bank(body,prefix,count):
 body=strip_quotes(body)
 matches=list(re.finditer(r'^([0-9]+)\. \*\*Prompt:\*\* (.*?)(?=^\d+\. \*\*Prompt:|^Reteach links:|^### |\Z)',body,re.M|re.S))
 out=[]
 for m in matches:
  n=int(m[1]);item=m[2]
  combined=re.search(r'\*\*Worked solution and second check:\*\* (.*)',item,re.S)
  if combined:
   sol,chk=combined[1].strip().split(' Check: ',1)
  else:
   sol=re.search(r'\*\*Worked solution:\*\* (.*?)(?=\*\*Independent second check:)',item,re.S)[1].strip()
   chk=re.search(r'\*\*Independent second check:\*\* (.*?)(?=\*\*B&W diagram spec:|\Z)',item,re.S)[1].strip()
  # Backend certificates inform the builder, not the assigned calculation.
  chk=chk.split(' Backend:')[0].split(' Backend radius squared:')[0]
  if prefix=='4.15' and n==14:chk='A half-turn about the midpoint of AB exchanges P and Q, so the midpoint is also on PQ.'
  out.append(dict(id=f'{prefix}-{n}',prompt=clean(prompts[f'{prefix}-{n}']),solution=clean(sol),check=clean(chk)))
 if len(out)!=count:raise ValueError((prefix,len(out),count))
 return out
unit['4.9']=dict(practice=parse_bank(sections['4.9'].split('- Builder and answer-key layer',1)[1],'4.9',10))
unit['4.15']=dict(practice=parse_bank(sections['4.15'].split('- Builder and answer-key layer',1)[1],'4.15',16),clinic=dict(title=clean(MOVED['4.15_clinic'][0]),steps=[dict(step=clean(a),reason=clean(b)) for a,b in MOVED['4.15_clinic'][1]],optional=True))
assessment=sections['4.16'].split('- Builder and answer-key layer',1)[1]
unit['4.16']=dict(forms={form:parse_bank(assessment.split('### Form '+form,1)[1].split('### ',1)[0],form,12) for form in ['A','B']})
write(ROOT/'tools/geometry/u04-v2.json',json.dumps(unit,ensure_ascii=False,indent=2)+'\n')
# Current art handoff is staff-only, with exact figures quoted from the final spec.
lines=['# Unit 4: current figure commission from the final spec','', 'Student wording: Socrates. Math: Euclid. Build: PR 170. No builder text or coordinate certificates should be drawn as learner labels. All art is editable SVG, black strokes on white, live labels, separate given and conclusion layers.','', 'Source SHA-256: '+hashlib.sha256(spec.encode()).hexdigest(),'', 'Figure slots exist on every worked-example, practice, check and common-mistake screen. Slots without a supplied SVG are omitted from the student DOM until art arrives; text uses the full width. See PLACEHOLDER-SLIDES.md for the missing-art inventory. Fill each planned slot with its own correct givens, not a reused diagram with different letters.','']
for lid,body in sections.items():
 lines+=['## '+lid,'']
 regular=unit[lid].get('examples',[])
 if regular:
  lines+=['Slots: get-started / big-idea art; '+', '.join(e['title'] for e in regular)+'; common mistake; '+str(len(unit[lid]['practice']))+' practice figures; check-yourself.','']
  if lid=='4.10':lines+=['Day 1: interior only. Day 2: exterior plus endpoint, including the A/B and D/E representative relabeling. Do not reveal SSS as a postulate.','']
  if lid=='4.14':lines+=['Include the convex kite moved from 4.10. Review bank is launched here, not a separate class day.','']
  art_holds={
   '4.4':'Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): A=(0,0), B=(18.3051,0), C=(6.1017,9.1526), D=(12.2034,-9.1526); CA=DB=11. Practice 3, u04-l04-s10, states DB=11. Do not reuse the unscaled shared-side model whose CA=DB=sqrt(13). Ready to draw. The slot stays omitted from the student DOM until the SVG lands.',
   '4.7':'Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): A=(0,2.3439), B=(-3,0), C=(3,0); base angles 38 degrees, apex 104. Worked example 2, u04-l07-s05, solves both base angles as 38 degrees. Do not reuse the rotated 3-4-5 model, whose base angles are about 53.13 degrees. Ready to draw. The slot stays omitted from the student DOM until the SVG lands.',
   '4.14':'Corrected coordinates (Euclid, U4-FIGURE-COORDS.md): kite A=(0,8.8), B=(-6.6,0), C=(0,-4.4), D=(6.6,0); AB=AD=11, CB=CD=7.932. Practice 4, u04-l14-s12, states AD=11. Do not reuse the unscaled kite with AB=AD=5. Ready to draw. The slot stays omitted from the student DOM until the SVG lands.',
   '4.11':'PR170 Euclid re-review R2: Worked example 2 uses A=(0,0), B=(8,6), C1=(6,0), C2=(10,0), AB=10, AC1=6, AC2=10, with the common circle centered at B. Round 5 caption: Not to scale. Both examples are fitted to the same screen bounds. The common-mistake figure is separate: A=(0,0), B=(4,3), C=(4,0), circle radius 3 at B, one contact C strictly beyond A, and an explicit right-angle mark at C. Never reuse the two-crossing figure for this pictured tangent correction.'
  }
  if lid in art_holds:lines += [art_holds[lid],'']

  m=re.search(r'- Diagram specs for Leo .*?:\n(.*?)(?=^- Interactive acceptance)',body,re.M|re.S)
  if m:lines += [strip_quotes(m[1]),'']
 else:
  lines+=['One independent inline figure per bank item, with prompt givens only. Solutions and second checks are separate reveals.','']
  bankbody=strip_quotes(body.split('Builder and answer-key layer',1)[1])
  for m in re.finditer(r'(?:^([0-9]+)\. \*\*Prompt:.*?\*\*B&W diagram spec:\*\* (.*?))(?=^\d+\. \*\*Prompt:|^Reteach links:|^### |\Z)',bankbody,re.M|re.S):
   label=('Form B' if bankbody.rfind('### Form B',0,m.start())>=0 else 'Form A')+' ' if lid=='4.16' else ''
   lines += [f'{label}item {m[1]}: {m[2].strip()}','']
  if lid=='4.15':lines += ['Use the named lesson diagram per item. Item 16 must have its own inline SSA figure with ray AC2, C1/C2, circle centered B, equal-radius ticks, AB=5, AC1=3, AC2=5 on separate dimension brackets, and angle A. No coordinate or radical labels.','']
  if lid=='4.16':lines += ['Forms A and B both have 12 new items. Both item-12 SSA figures are mandatory inline, including on printed learner forms; no lesson navigation dependency.','']
write(ROOT/'docs/geometry/v2/LEO-DIAGRAMS-unit04.md','\n'.join(lines).rstrip()+'\n')

keys=['# Unit 4: separate teacher keys','', 'Original items keyed by Euclid. Learner wording by Socrates. Backend certificates are retained in SPEC-unit04.md and are not rendered.','']
for lid in ['4.9','4.15','4.16']:
 keys+=['## '+lid,'']
 groups=unit[lid].get('forms',{'Items':unit[lid].get('practice',[])})
 for label,items in groups.items():
  keys+=['### '+label,'']
  for item in items:keys += [item['id']+': '+item['solution'],'Second check: '+item['check'],'']
write(ROOT/'docs/geometry/v2/UNIT04-KEYS.md','\n'.join(keys).rstrip()+'\n')

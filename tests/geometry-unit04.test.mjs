import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {rayTrianglePoints} from '../public/geometry/geo-invariants.js';
import {bankFigure,correspondenceFigure,motionFigure} from '../public/geometry/geo-u04-figures.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const deck=n=>JSON.parse(read(`public/geometry/decks/u04-l${String(n).padStart(2,'0')}/deck.json`));
const source=JSON.parse(read('tools/geometry/u04-v2.json'));
const prompts=JSON.parse(read('tools/geometry/spec-src/bank-u04.json'));
const noMarkup=s=>s.replace(/<[^>]*>/g,'');
test('final Unit 4 exporter and citation exporter are deterministic',()=>{
 for(const file of ['export-unit04.py','export-v2.py'])execFileSync('python3',['tools/geometry/'+file,'--check']);
});
test('regular Unit 4 lessons run 12 to 14 screens, with all required examples and checks',()=>{
 for(const n of [1,2,3,4,5,6,7,8,10,11,12,13,14]){
  const data=deck(n),v=source['4.'+n];assert.ok(data.slides.length>=12&&data.slides.length<=14,n);
  const worked=data.slides.filter(s=>s.geo.kind==='worked-example');assert.equal(worked.length,v.examples.length);
  assert.equal(data.slides.filter(s=>s.geo.kind==='practice').length,v.practice.length+1);
  const end=data.slides.at(-1);assert.match(end.geo.body,/<li>What's confusing\?<\/li><\/ol>$/);
 }
 assert.equal(deck(14).slides.filter(s=>s.geo.kind==='worked-example').length,3);
 assert.match(JSON.stringify(deck(14)),/Open the 4.15 review bank/);
});
test('4.10 has both class days, all three cases, and explicit representative relabeling before later SSS uses',()=>{
 const slides=deck(10).slides,all=JSON.stringify(slides);
 assert.match(all,/Two-day lesson/);assert.ok(slides.some(s=>s.title==='Day 1: exit check'));
 assert.ok(slides.some(s=>s.title==='Day 2: finish the theorem'));
 assert.equal(slides.filter(s=>s.geo.kind==='activity').length,2);
 for(const text of ['Protractor Postulate','Ruler Postulate','interior case','can cross outside the segment past A or past B','pass right through A or through B','exchanging A with B','Subtract: angle ACB','ray CB is ray CG'])assert.ok(all.includes(text),text);
});
test('4.13 uses the approved half-turn incidence argument and keeps the long proof optional',()=>{
 const examples=deck(13).slides.filter(s=>s.geo.kind==='worked-example');
 assert.equal(examples[0].geo.optional,false);assert.match(examples[0].geo.prompt,/In class: the angle bisector/);
 assert.equal(examples[1].geo.optional,true);assert.equal(examples[1].geo.steps.length,14);
 const all=JSON.stringify(examples[1]);for(const s of ['half-turn','midpoint','M is between A and B','ray PM is ray PQ'])assert.ok(all.includes(s));
});
test('new quiz and parallel forms use every exact learner prompt with its independently selected key',()=>{
 const quiz=deck(9).slides.filter(s=>s.geo.kind==='practice');assert.equal(quiz.length,10);
 const review=deck(15).slides.filter(s=>s.geo.kind==='practice');assert.equal(review.length,16);
 const assessed=deck(16).slides.filter(s=>s.geo.kind==='practice');assert.equal(assessed.length,24);
 for(const [label,items,slides] of [['4.9',source['4.9'].practice,quiz],['4.15',source['4.15'].practice,review],['A',source['4.16'].forms.A,assessed.slice(0,12)],['B',source['4.16'].forms.B,assessed.slice(12)]]){
  items.forEach((item,i)=>{assert.equal(item.prompt,prompts[`${label}-${i+1}`]);assert.equal(slides[i].geo.prompt,item.prompt);assert.equal(slides[i].geo.solution,item.solution);assert.equal(slides[i].geo.check,item.check);});
 }
 assert.equal(new Set([...quiz,...review,...assessed].map(s=>s.geo.prompt)).size,50);
 assert.ok(quiz.filter(s=>/Prove|Explain|proof/.test(s.geo.prompt)).length>=2);
});
test('all 24 learner print items have independent inline figures, no answer key or coordinate certificates',()=>{
 for(const form of ['A','B']){
  const html=read(`public/geometry/forms/unit04-${form.toLowerCase()}.html`);assert.equal((html.match(/class="item"/g)||[]).length,12);assert.equal((html.match(/<figure>/g)||[]).length,12);
  assert.doesNotMatch(noMarkup(html),/sqrt|Backend|Builder|Independent second check|Worked solution|\(6,8\)|\(8,15\)/i);
  for(const item of source['4.16'].forms[form])assert.ok(html.includes(item.prompt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')));
  const last=source['4.16'].forms[form].at(-1);assert.match(bankFigure(last.id),/<circle/);
  for(const label of form==='A'?['OP = 10','OQ1 = 2','OQ2 = 10']:['LM = 17','LN1 = 5','LN2 = 11'])assert.ok(bankFigure(last.id).includes(label));
  assert.ok(!html.includes(last.solution));
 }
 assert.match(bankFigure('4.15-16'),/<circle/);
});
test('SSA ray counts reject duplicate tangency, the vertex, backward roots and flat triangles',()=>{
 const A={x:0,y:0},B={x:4,y:3},ray={x:1,y:0};
 for(const [r2,count] of [[4,0],[9,1],[10,2],[25,1],[36,1]])assert.equal(rayTrianglePoints(A,B,Math.sqrt(r2),ray).length,count,r2);
 assert.deepEqual(rayTrianglePoints(A,{x:4,y:0},2,ray),[]);
 assert.deepEqual(rayTrianglePoints(A,B,3,A),[]);
 assert.deepEqual(rayTrianglePoints(A,{x:-4,y:3},Math.sqrt(10),ray),[]);
});
test('4.1 corrected triangles are scalene and the rigid correspondence preserves squared lengths',()=>{
 const a=[[0,0],[5,0],[1,2]],b=[[9,1],[9,6],[7,2]],sq=(p,q)=>(p[0]-q[0])**2+(p[1]-q[1])**2;
 assert.deepEqual(a.map(([x,y])=>[9-y,1+x]),b);assert.deepEqual([sq(a[0],a[1]),sq(a[0],a[2]),sq(a[1],a[2])],[25,5,20]);
 assert.match(correspondenceFigure(),/>A<|>B<|>C</);assert.doesNotMatch(noMarkup(correspondenceFigure()),/25|20|coordinate/);
 for(let step=0;step<5;step++)assert.ok(motionFigure(step).includes('>F</text>'));
});
test('only learner fields cross the export boundary; parked drafts are never activated',()=>{
 const all=JSON.stringify(Array.from({length:16},(_,i)=>deck(i+1)));
 assert.doesNotMatch(all,/BUILDER_SENTINEL|builder_only|builderOnly|Backend|B&W diagram spec|Sign-off patch|sqrt\(10\)|sqrt\(234\)|UNIT04-SIGNOFF/i);
 assert.ok(!read('tools/geometry/build.mjs').includes('drafts/'));
 assert.ok(read('docs/geometry/v2/UNIT04-KEYS.md').includes('A-12:'));
});

test('every signed-off R2 student paraphrase is exported verbatim without its staff tag',()=>{
 const spec=read('docs/geometry/v2/SPEC-unit04.md');let count=0;
 for(const section of spec.split(/^## /m).slice(1)){
  const match=section.match(/^(4\.\d+)/);if(!match)continue;const lid=match[1];
  const learner=(section.split('**Learner layer**')[1]||'').split('**Builder and answer-key layer**')[0];
  const rows=Object.values(source[lid].examples||[]).flatMap(e=>e.steps);
  for(const line of learner.split('\n').filter(l=>l.includes('[Sign-off patch R2, student paraphrase]'))){
   const [step,reason]=line.trim().slice(2,-2).split(' | ').map(t=>t.replace(/\s*\[Sign-off patch[^\]]*\]/g,'').trim());
   assert.ok(rows.some(r=>r.step===step&&r.reason===reason),`${lid}: ${step}`);count++;
  }
 }
 assert.equal(count,8);
 assert.match(source['4.10'].examples[1].steps[0].step,/swap the names A and B/);
});
test('missing art is inventoried and cannot generate student placeholder markup',()=>{
 execFileSync('node',['tools/geometry/figure-inventory.mjs','--check']);
 const inventory=read('docs/geometry/v2/PLACEHOLDER-SLIDES.md');
 assert.match(inventory,/\| 4.13 \| 4: Worked example/);
 const renderer=read('public/geometry/geo-page.js');assert.ok(!renderer.includes('Figure coming'));
 assert.match(renderer,/includes\(G.kind\) && \(G.figure\?\.svg \|\| G.figure\?\.src\)/);
 for(let n=1;n<=16;n++)assert.ok(!JSON.stringify(deck(n)).includes('Figure coming'));
});

test('4.14 art-slot prompt and current learner correction describe the same vertical-angle mistake',()=>{
 const edits=JSON.parse(read('tools/geometry/spec-src/art-prompts-u04.json'));
 const slide=deck(14).slides.find(s=>s.geo.kind==='common-mistake').geo;
 assert.equal(slide.prompt,edits['4.14']);assert.match(slide.prompt,/vertical angles already give/);
 assert.match(slide.correction,/Vertical angles alone give that angle in one step/);
 assert.ok(!slide.prompt.includes('non-included angle'));
});

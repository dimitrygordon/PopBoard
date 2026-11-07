import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {worked,practice} from '../tools/geometry/template-v2.mjs';
import {DECKS} from '../public/geometry/geo-catalog.js';
import {isDiameter,circleRegime,starMax,starCycles} from '../public/geometry/geo-invariants.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const deck=d=>JSON.parse(read(`public/geometry/decks/${d.slug}/deck.json`));
const text=s=>s.replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const all=DECKS.map(deck);

test('180 citations match the checked-in Jacobs source map, including every cover',()=>{
 const refs=JSON.parse(read('tools/geometry/jacobs-map.json'));
 const source=execFileSync('python3',['-c',`import sys,json;sys.path.insert(0,'tools/geometry/spec-src');from data import M,J;print(json.dumps({k:{'section':'; '.join(v[0]) or 'Supplement','pages':'; '.join(f'{J[x][0]} to {J[x][1]}' for x in v[0]) or 'No direct Jacobs section'} for k,v in M.items()}))`],{cwd:new URL('..',import.meta.url)});
 const sourceMap=JSON.parse(source);
 for(const [i,d] of DECKS.entries()){
  const ref=refs[`${d.q}.${d.lesson}`];assert.ok(ref.section&&ref.pages,d.slug);
  const expectedRef={section:ref.section,pages:ref.pages,references:ref.references,relationship:ref.relationship};
  assert.deepEqual(all[i].jacobs,expectedRef);assert.deepEqual(all[i].slides[0].geo.jacobs,expectedRef);
  const expected=sourceMap[`${d.q}.${d.lesson}`];if(expected){assert.equal(ref.section,expected.section);assert.equal(ref.pages,expected.pages);}
 }
});
test('all regular lessons have common mistakes and exits ending with the fixed question',()=>{
 for(const d of DECKS.filter(d=>d.kind==='lesson')){
  const slides=deck(d).slides;assert.ok(slides.some(s=>s.geo.kind==='common-mistake'),d.slug);
  const exit=slides.at(-1);assert.equal(exit.geo.kind,'exit-ticket');assert.equal((exit.geo.body.match(/<li>/g)||[]).length,3);assert.ok(text(exit.geo.body).trim().endsWith("What's confusing?"),d.slug);
 }
});
test('existing lesson 1.10 exercises every template type and complete step/reason schema',()=>{
 const slides=deck(DECKS.find(d=>d.slug==='u01-l10')).slides;
 for(const kind of ['worked-example','common-mistake','practice','exit-ticket'])assert.ok(slides.some(s=>s.geo.kind===kind),kind);
 assert.ok(slides.find(s=>s.geo.kind==='worked-example').geo.steps.every(s=>s.step&&s.reason));
 assert.ok(slides.filter(s=>s.geo.kind==='practice').every(s=>s.geo.solution&&s.geo.check));
});
test('builder metadata and raw coordinate certificates are absent from exported learner data',()=>{
 const serialized=JSON.stringify(all);assert.doesNotMatch(serialized,/builder_only|builderOnly|Builder and answer-key layer|Original exact coordinate certificate|Backend check|backend coordinate|sqrt\(10\)|sqrt\(40\)|\(x-4\)/i);

});
test('E01 to E17: corrected learner text present and superseded text gone from every deck',()=>{
 const errata=JSON.parse(read('tools/geometry/errata.json'));
 const joined=text(all.map(d=>JSON.stringify(d)).join('\n'));
 const witnesses={E06:'The half-turn also flips the two sides of line AB',E09:"Under this course's inclusive trapezoid convention",E11:'Postulate (assumed here, not proved by proportional sides)'};
 for(const e of errata.slice(0,17)){
  const old=e.id==='E14'?'Cone, πr2 + πrℓ.':e.old;
  assert.ok(!joined.includes(old),`${e.id}: old text remains`);
  const expected=witnesses[e.id]||e.replacement;
  assert.ok(joined.includes(expected),`${e.id}: replacement missing`);
 }
 assert.ok(all.some(d=>d.slides.some(s=>text(s.geo.body||'').includes('For 1≤k<n/2 and a single circuit with gcd(n,k)=1'))));
});
test('E18: diameter equality uses unrounded model values',()=>{
 assert.equal(isDiameter(179),false);assert.equal(isDiameter(179.999),false);assert.equal(isDiameter(180),true);assert.equal(isDiameter(180+1e-10),true);
 assert.ok(!read('public/geometry/gx/u10.js').includes('Math.abs(arc - 180) < 1.5'));
});
test('E19: radius+6 is outside at all ordinary scales, exact circle has a separate constrained mode',()=>{
 for(const r of [1,10,300,10000]){assert.equal(circleRegime(r+6,r),'outside');assert.equal(circleRegime(r-0.01,r),'inside');assert.equal(circleRegime(r,r),'on');}
 const src=read('public/geometry/gx/u10.js');assert.doesNotMatch(src,/Math.abs\(d - r\) < 12/);assert.match(src,/mode === "on" \? on\(q\)/);assert.match(src,/Separate tangent construction/);
});
test('E20: every selectable skip is strictly below n/2 and compounds are identified',()=>{
 for(let n=5;n<=12;n++)for(let k=1;k<=starMax(n);k++){assert.ok(k<n/2);assert.ok(starCycles(n,k)>=1);}
 assert.equal(starCycles(5,5),null);assert.equal(starCycles(6,3),null);assert.equal(starCycles(6,2),2);assert.equal(starCycles(7,3),1);
 assert.ok(!read('public/geometry/gx/u06.js').includes('min: 1, max: 5, value: sk'));
});

test('content schema rejects missing reason rows or incomplete two-stage practice solutions',()=>{
 assert.throws(()=>worked(()=>{}, {title:'Bad',steps:[{step:'A = B'}]}),/step\/reason/);
 assert.throws(()=>practice(()=>{}, {prompt:'Question',solution:'Answer'}),/second check/);
 const output=[];worked((...args)=>output.push(args),{title:'Proof',steps:[{step:'A = A',reason:'Reflexive'}],builder_only:'private'});
 assert.ok(!JSON.stringify(output).includes('private'));
});

test('Socrates: figure schema on every proof, practice and mistake and numbered exit question',()=>{
 for(const data of all)for(const slide of data.slides){
  if(['worked-example','practice','common-mistake'].includes(slide.geo.kind))assert.ok(slide.geo.figure && 'svg' in slide.geo.figure);
  if(slide.geo.kind==='exit-ticket')assert.match(slide.geo.body,/<li>What's confusing\?<\/li><\/ol>$/);
 }
 const slides=deck(DECKS.find(d=>d.slug==='u01-l10')).slides;
 for(const slide of slides.filter(s=>['worked-example','practice','common-mistake'].includes(s.geo.kind))){
  assert.match(slide.geo.figure.svg,/M20 80H460M125 70V90M355 70V90/);assert.match(slide.geo.figure.alt,/AB = CD/);
 }
});

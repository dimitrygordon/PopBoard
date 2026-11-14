import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {unit01Figure} from '../public/geometry/geo-u01-figures.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const deck=n=>JSON.parse(read(`public/geometry/decks/u01-l${String(n).padStart(2,'0')}/deck.json`));
const source=JSON.parse(read('tools/geometry/u01-v2.json'));
const studentFiles=()=>[...Array.from({length:14},(_,i)=>`public/geometry/decks/u01-l${String(i+1).padStart(2,'0')}/deck.json`),'public/geometry/forms/unit01-a.html','public/geometry/forms/unit01-b.html'];
test('final Unit 1 exporter and build are deterministic',()=>{
 execFileSync('python3',['tools/geometry/export-unit01.py','--check']);
 execFileSync('node',['tools/geometry/build.mjs','--check']);
});
test('regular Unit 1 lessons follow the 13-screen spec order with full examples and checks',()=>{
 const order=['cover','text','text','text','worked-example','worked-example',null,'common-mistake','practice','practice','practice','practice','exit-ticket'];
 for(let n=1;n<=12;n++){
  const s=deck(n).slides,v=source['1.'+n];assert.equal(s.length,13,n);
  order.forEach((k,i)=>{if(k)assert.equal(s[i].geo.kind,k,`1.${n} screen ${i+1}`);});
  assert.ok(['gx','activity'].includes(s[6].geo.kind));
  assert.equal(s[3].title,'Words to know');
  s.filter(x=>x.geo.kind==='worked-example').forEach((x,i)=>{assert.equal(x.geo.prompt,v.examples[i].title);assert.deepEqual(x.geo.steps,v.examples[i].steps);});
  s.slice(8,11).forEach((x,i)=>{assert.equal(x.geo.solution,v.practice[i].solution);assert.equal(x.geo.check,v.practice[i].check);});
  assert.equal(v.goals.length,3);assert.match(s.at(-1).geo.body,/^<ol>(<li>[^<]+<\/li>){2}<li>What's confusing\?<\/li><\/ol>$/);
 }
 for(const n of [1,2,3,4,5,6,8])assert.equal(deck(n).slides[6].geo.kind,'gx');
});
test('1.13 review has 16 keyed items and 1.14 has two parallel 12-item forms',()=>{
 const r=deck(13).slides.filter(s=>s.geo.kind==='practice');assert.equal(r.length,16);r.forEach(s=>assert.ok(s.geo.solution&&s.geo.check));
 const a=deck(14).slides.filter(s=>s.geo.kind==='practice');assert.equal(a.length,24);
 for(const f of ['a','b']){const html=read(`public/geometry/forms/unit01-${f}.html`);assert.equal((html.match(/<section class="item">/g)||[]).length,12);
  for(const item of source['1.14'].forms[f.toUpperCase()]){assert.ok(html.includes(item.prompt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,40)));assert.ok(!html.includes(item.solution.slice(0,40)));}}
});
test('Unit 1 student-facing output carries no internal builder labels',()=>{
 for(const f of studentFiles()){const text=read(f).toLowerCase();for(const bad of ['original problem','.md','signoff','in class:','student version','builder','sign-off patch','socrates fix'])assert.ok(!text.includes(bad),`${f}: ${bad}`);}
});
test('Unit 1 angle arcs are at most 20% (never past 25%) of the shorter adjacent side',()=>{
 let count=0;
 for(const f of studentFiles()){
  const text=read(f).replace(/\\"/g,'"');
  for(const m of text.matchAll(/<path d="M([-\d.]+),([-\d.]+)A([\d.]+) [\d.]+ 0 0 0 ([-\d.]+),([-\d.]+)" fill="none" stroke="black" stroke-width="1.6" data-arc-r="([\d.]+)" data-arc-side="([\d.]+)"\/>/g)){
   const r=Number(m[3]),dr=Number(m[6]),side=Number(m[7]);assert.equal(r,dr);assert.ok(r<=0.25*side+1e-9,`${f}: ${r/side}`);assert.ok(r<=0.2*side+0.01,`${f}: ${r/side}`);count++;
  }
  assert.ok(!/data-arc-r/.test(text.replace(/<path d="M[-\d.]+,[-\d.]+A[^>]*data-arc-r="[\d.]+" data-arc-side="[\d.]+"\/>/g,'')),`${f}: arc not matched by the checker`);
 }
 assert.ok(count>=15,count);
});
test('every Unit 1 figure slot is drawn, live text only, or a tracked Leo placeholder',()=>{
 const list=read('docs/geometry/v2/LEO-DIAGRAMS-unit01.md');const pending=[...list.matchAll(/^- \[ \] (u01-l\d\d-s\d\d):/gm)].map(m=>m[1]);
 const counts=list.match(/Counts: (\d+) figure slots\. (\d+) drawn by the generator, (\d+) supplied by Leo, (\d+) live text only, (\d+) NEED LEO ART\./).slice(1).map(Number);
 assert.equal(counts[0],counts[1]+counts[2]+counts[3]+counts[4]);assert.equal(counts[4],pending.length);
 for(const id of pending){const [,l,s]=id.match(/l(\d\d)-s(\d\d)/);const slide=deck(+l).slides[+s-1];assert.ok(['worked-example','practice','common-mistake'].includes(slide.geo.kind),id);assert.ok(slide.geo.figure.svg.includes('gx-slot-pending'),id);assert.doesNotMatch(slide.geo.figure.svg,/PLACEHOLDER|TODO|lorem|u01-l\d\d-s\d\d/i,id);}
 for(const s of deck(1).slides.filter(s=>s.geo.figure?.svg))assert.ok(s.geo.figure.alt.length>10);
 assert.doesNotMatch(JSON.stringify(studentFiles().map(read)),/PLACEHOLDER|TODO|lorem/i);
});
test('exact figures keep the spec geometry',()=>{
 const pts=svg=>[...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)" r="5" fill="black"\/>/g)].map(m=>[+m[1],+m[2]]);
 const close=(a,b)=>Math.abs(a-b)<0.02;
 // 1.5 WE2 bow-tie: X is the midpoint of AB and of CD.
 {const [A,B,C,D,X]=pts(unit01Figure('u01-l05-s06'));assert.ok(close((A[0]+B[0])/2,X[0])&&close((A[1]+B[1])/2,X[1])&&close((C[0]+D[0])/2,X[0])&&close((C[1]+D[1])/2,X[1]));}
 // 1.14 A6: X is on both equal circles, radius 2 with centers 3 apart.
 {const [M,N,X]=pts(unit01Figure('u01-l14-s09'));const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);assert.ok(close(d(M,X),d(N,X)));assert.ok(close(d(M,N)/d(M,X),1.5));}
 // 1.14 B5: W is the midpoint of BD and lies outside the dented pentagon.
 {const [B,D,W]=pts(unit01Figure('u01-l14-s20'));assert.ok(close((B[0]+D[0])/2,W[0])&&close((B[1]+D[1])/2,W[1]));}
 // 1.14 B3: no three markers collinear.
 {const P=pts(unit01Figure('u01-l14-s18'));for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)for(let k=j+1;k<4;k++){const [a,b,c]=[P[i],P[j],P[k]];assert.ok(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))>1);}}
 // Reveal-only parts sit in conclusion layers.
 for(const id of ['u01-l01-s10','u01-l13-s05'])assert.match(unit01Figure(id),/<g class="conclusion">/);
});
test('Unit 1 reasons are shown verbatim, with no added Because prefix',()=>{
 for(let n=1;n<=12;n++)for(const s of deck(n).slides.filter(s=>s.geo.kind==='worked-example'))for(const r of s.geo.steps)assert.doesNotMatch(r.reason,/^because\b/i);
 assert.match(read('public/geometry/geo-activities.js'),/id\.startsWith\('1\.'\)\?row\.step\+' '\+row\.reason/);
});
test('Unit 1 generator labels are at least 16px when the figure renders 300px wide',()=>{
 for(const f of studentFiles())for(const m of read(f).matchAll(/<svg[^>]*viewBox=\\?"0 0 (\d+) \d+\\?"[\s\S]*?<\/svg>/g)){const w=+m[1];for(const t of m[0].matchAll(/font-size=\\?"(\d+)/g))assert.ok(+t[1]*300/w>=16,`${f}: ${t[1]}`);}
});
test('every Words to know term has a meaning, rendered bold term then meaning on the built page',()=>{
 const vocab=JSON.parse(read('docs/geometry/v2/VOCAB-unit01.json'));
 const key=w=>String(w).replace(/^'(.*)'$/,'$1');
 const h=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 let n=0;
 for(let i=1;i<=12;i++){
  const k=`1.${i}`,words=source[k].words;
  assert.ok(words.length>0,`${k} has terms`);
  const page=deck(i).slides.find(p=>JSON.stringify(p).includes("Words to know"));
  assert.ok(page,`${k} Words to know page`);
  const html=JSON.stringify(page);
  for(const w of words){
   const m=vocab[k]?.[key(w)];
   assert.ok(typeof m==='string'&&m.trim(),`${k} "${w}" lacks a meaning in VOCAB-unit01.json`);
   assert.ok(html.includes(JSON.stringify(`<strong>${h(key(w))}</strong> ${h(m)}`).slice(1,-1)),`${k} "${w}" meaning missing on built page`);
   n++;
  }
 }
 assert.equal(n,72);
});
test('Unit 1 animation hooks keep the Leo wiring path and step-layer convention',()=>{
 const draw=read('public/geometry/geo-draw.js');
 const page=read('public/geometry/geo-page.js');
 const hook=read('tools/geometry/u01-art-wiring.json');
 assert.match(page,/from "\.\/geo-draw\.js"/);
 assert.match(draw,/data-step/);
 assert.match(draw,/class="given"/);
 assert.match(draw,/class="conclusion"/);
 assert.equal(JSON.parse(hook).length>=0,true);
 assert.match(read('docs/geometry/v2/LEO-LAYER-CONVENTION.md'),/data-step="N"/);
});

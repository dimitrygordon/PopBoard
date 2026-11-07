import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DECKS} from '../../public/geometry/geo-catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const rows=[];
for(const d of DECKS){
 const data=JSON.parse(fs.readFileSync(path.join(root,'public/geometry/decks',d.slug,'deck.json')));
 let example=0,practice=0;
 for(const [i,s] of data.slides.entries()){
  const g=s.geo;if(g.kind==='worked-example')example++;if(g.kind==='practice')practice++;
  if(!['worked-example','practice','common-mistake'].includes(g.kind)||g.figure?.svg||g.figure?.src)continue;
  const lid=`${d.q}.${d.lesson}`;
  const slot=g.kind==='worked-example'?`Worked example ${lid==='4.13'?3-example:example}`:g.kind==='practice'?s.title:`Common mistake`;
  const ref=d.q===1?`LEO-DIAGRAMS-unit01.md, slot u01-l${String(d.lesson).padStart(2,'0')}-s${String(i+1).padStart(2,'0')}`:d.q===4?`SPEC-unit04.md §${lid}, Learner layer / ${slot}; Diagram specs for Leo`:'No figure-specific spec commissioned; lesson '+lid+' / '+slot;
  rows.push(`| ${lid} | ${i+1}: ${s.title.replaceAll('|','/')} | ${ref} |`);
 }
}
const text=['# Missing student figures','', 'Planned worked-example, practice and common-mistake art across the current course. Missing art is not rendered: no empty column, placeholder text or substitute geometry. Unit 4 references the current signed-off spec; other units have no figure-specific commission yet. Screen numbers include the cover.','',`Total: ${rows.length} missing figures. Unit 4: ${rows.filter(r=>r.startsWith('| 4.')).length}.`,'','| Lesson | Slide | Spec figure reference |','|---|---|---|',...rows,''].join('\n');
const dest=path.join(root,'docs/geometry/v2/PLACEHOLDER-SLIDES.md');
if(process.argv.includes('--check')){if(fs.readFileSync(dest,'utf8')!==text)throw new Error('Stale missing-art inventory');}else fs.writeFileSync(dest,text);
console.log(`${rows.length} planned figures inventoried`);

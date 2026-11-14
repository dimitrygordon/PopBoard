import fs from 'node:fs';
import {worked,practice,mistake,exitBody} from './template-v2.mjs';
import {unit01Figure} from '../../public/geometry/geo-u01-figures.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p=s=>`<p>${esc(s)}</p>`;
const text=(page,title,body,extra={})=>page(title,{kind:'text',v2:true,body,...extra},{html:body});
const exit=(page,items,title='Exit ticket')=>{const body=exitBody(items);page(title,{kind:'exit-ticket',body},{html:body});};
const NO_DRAWING=/^(No drawing needed|Figure slot: none needed|None needed)/i;
// Leo's supplied SVGs override generator figures slot by slot: [{slot, file, alt}] under public/geometry/figures/u01/.
const wiring=JSON.parse(fs.readFileSync(new URL('./u01-art-wiring.json',import.meta.url),'utf8'));
const supplied=new Map(wiring.map(({slot,file,alt})=>[slot,{svg:fs.readFileSync(new URL(`../../public/geometry/figures/u01/${file}`,import.meta.url),'utf8'),alt}]));
// Every figure slot is classified once: drawn (generator or Leo), none (live text only) or pending (Leo art needed; omitted from the student DOM).
// Socrates' one-line meanings for every Words to know term, keyed by lesson then term (quotes stripped).
export const unit01Vocab=JSON.parse(fs.readFileSync(new URL('../../docs/geometry/v2/VOCAB-unit01.json',import.meta.url),'utf8'));
export const vocabKey=w=>String(w).replace(/^'(.*)'$/,'$1');
const vocabItem=(lesson,w)=>{const m=unit01Vocab[lesson]?.[vocabKey(w)];if(!m)throw new Error(`VOCAB-unit01.json: no meaning for ${lesson} "${w}"`);return `<li class="gx-vocab"><strong>${esc(vocabKey(w))}</strong> ${esc(m)}</li>`;};
export const unit01Slots=[];
const slotFigure=(id,spec)=>{
 const art=supplied.get(id);if(art){unit01Slots.push({id,spec,status:'leo'});return art;}
 if(NO_DRAWING.test(spec||'')){unit01Slots.push({id,spec,status:'none'});return null;}
 const svg=unit01Figure(id);if(svg){unit01Slots.push({id,spec,status:'generator'});return {svg,alt:spec};}
 unit01Slots.push({id,spec,status:'pending'});return null;
};
const sid=(lesson,n)=>`u01-l${String(lesson).padStart(2,'0')}-s${String(n).padStart(2,'0')}`;
export function unit01(page,l,c,v,gx,all){
 const n=()=>0;let next=2;const id=()=>sid(l.lesson,next);
 const P=(title,geo,extra)=>{page(title,geo,extra);next++;};
 if(l.key==='1.13'){
  const lessons=Object.entries(all).filter(([k])=>!['1.13','1.14'].includes(k));
  text(P,'What to know','<p>Self-paced review of Unit 1. Original aligned items, with each lesson\'s Jacobs pages below.</p><ul>'+lessons.map(([k,x])=>`<li>${esc(k)}: ${esc(x.jacobs.replace(/ \(PDF[^)]*\)/g,''))}</li>`).join('')+'</ul>');
  v.practice.forEach((item,i)=>practice(P,{...item,figure:slotFigure(id(),item.slot)},`Review item ${i+1}`));
  text(P,'Common traps','<ul>'+lessons.map(([k,x])=>`<li>${esc(k)}: ${esc(x.misconception)}</li>`).join('')+'</ul>');
  exit(P,[]);return;
 }
 if(l.key==='1.14'){
  text(P,'Assessment targets',p('Two original parallel forms, 12 items each, covering lessons 1.1 to 1.12. Related scope: Jacobs Introduction and Chapters 1 and 2. Show every reason; an answer without a justification is not complete.'));
  text(P,'Printable forms','<p><a href="geometry/forms/unit01-a.html" target="_blank" rel="noopener">Print Form A</a></p><p><a href="geometry/forms/unit01-b.html" target="_blank" rel="noopener">Print Form B</a></p>'+p('The printable forms contain prompts and figures, not keys. Use the pages that follow only to review your completed work.'));
  for(const form of ['A','B'])v.forms[form].forEach((item,i)=>practice(P,{...item,figure:slotFigure(id(),item.slot)},`Form ${form}: item ${i+1}`));
  exit(P,[]);return;
 }
 text(P,'Get started',p(v.hook)+`<ul>${v.goals.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`);
 text(P,'The big idea',p(v.idea));
 text(P,'Words to know',`<ul class="gx-vocab-list">${v.words.map(w=>vocabItem(l.key,w)).join('')}</ul>`);
 v.examples.forEach(e=>worked(P,{...e,figure:slotFigure(id(),e.slot)}));
 if(gx)P('Try it',{kind:'gx',gx},{html:p(v.tryit)});
 else P('Try it',{kind:'activity',activity:l.key,task:{prompt:'Put the steps of the first worked example in order. Tap the step that comes next.',steps:v.examples[0].steps.map(s=>({step:s.step,reason:s.reason}))}},{html:p('Put the steps of the first worked example in order. Each step comes with its reason.')});
 mistake(P,v.mistake.prompt,p(v.mistake.correction),slotFigure(id(),v.mistake.slot));
 v.practice.forEach((item,i)=>practice(P,{...item,figure:slotFigure(id(),item.slot)},`Practice ${i+1}`));
 practice(P,{prompt:v.check[0],solution:v.check[1],check:'Name the given, measurement, assumption, definition or proof you used.'},'Check yourself');
 exit(P,v.exit);
}

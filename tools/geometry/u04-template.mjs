import {worked,practice,mistake,exitBody} from './template-v2.mjs';
import {bankFigure,correspondenceFigure,sssFigure,ssaFigure,leoPendingFigure,figure} from '../../public/geometry/geo-u04-figures.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const p=s=>`<p>${esc(s)}</p>`;
const text=(page,title,body,extra={})=>page(title,{kind:'text',v2:true,body,...extra},{html:body});
const exit=(page,items,title='Exit ticket',before='')=>{const body=before+exitBody(items);page(title,{kind:'exit-ticket',body},{html:body});};
const slot=(lid,index)=>{
 if(lid==='4.1'&&index===0)return figure(correspondenceFigure(),'Two scalene congruent triangles ABC and EFD, with matching side ticks.');
 if(lid==='4.10')return figure(sssFigure(index?4:0,!!index),index?'SSS exterior case: CG meets AB beyond B.':'SSS interior case: CG crosses between A and B.');
 if(lid==='4.11')return figure(ssaFigure(index?'double':'review'),index?'Doubled SSA model, fitted to the page, not drawn at twice the displayed size: A, B, C1 and C2; AB = 10, AC1 = 6, AC2 = 10. The circle centered at B passes through both C points.':'One ray from A, one circle at B and two possible triangles: AB = 5, AC1 = 3, AC2 = 5.');
 return null;
};
const bankItem=(page,item,title)=>practice(page,{...item,figure:figure(bankFigure(item.id),`Givens for ${title}.`)},title);
const backLink=(lid,label)=>`<p><a href="study-geometry-story.html?lesson=u04-l${lid.split('.')[1].padStart(2,'0')}&amp;page=4">${esc(label)}</a></p>`;
export function unit04(page,l,c,v,gx){
 if(l.key==='4.9'){
  text(page,'Quiz: original aligned items',p('Work each item on paper before opening its solution. These ten items cover 4.1 to 4.8 only. Related scope: Jacobs 4.2 to 4.5, pp. 139 to 162.'));
  v.practice.forEach((item,i)=>bankItem(page,item,`Quiz item ${i+1}`));
  const targets=[['4.1','Items 1 and 2: correspondence'],['4.2','Item 9: AAA counterexample'],['4.3','Item 3: SAS'],['4.4','Item 4: ASA'],['4.5','Items 5 and 10: proof order'],['4.6','Items 6 and 10: CPCTC'],['4.7','Item 7: base angles'],['4.8','Item 8: converse']];
  targets.forEach(([id,label])=>text(page,'Reteach: '+id,`<details><summary>${esc(label)}</summary>${backLink(id,'Return to the worked example in '+id)}</details>`));
  exit(page,[]);return;
 }
 if(l.key==='4.15'){
  text(page,'What to know',p('Self-paced review, launched during 4.14. Original aligned items; related scope: Jacobs Chapter 4 Summary and Review, pp. 176 to 180.')+'<ul>'+['4.2 Correspondence','4.3 SAS and ASA','4.4 Proofs and CPCTC','4.5 Isosceles theorems','4.6 SSS and SSA','4.7 Constructions'].map(s=>`<li>Jacobs ${esc(s)}</li>`).join('')+'</ul>');
  worked(page,v.clinic);v.practice.forEach((item,i)=>bankItem(page,item,`Review item ${i+1}`));
  text(page,'Common traps',p('Keep vertex order matched. Establish congruence before CPCTC. AAA and SSA are not tests. SSS is proved here, not assumed. Define every point and check that circles cross twice.'));
  exit(page,[]);return;
 }
 if(l.key==='4.16'){
  text(page,'Assessment targets',p('Two original parallel forms, 12 items each. Related scope: Jacobs 4.2 to 4.7, pp. 139 to 175, and Chapter 4 review, pp. 176 to 180. Show equations, full proof reasons and correct ordered correspondence.'));
  text(page,'Printable forms','<p><a href="geometry/forms/unit04-a.html" target="_blank" rel="noopener">Print Form A</a></p><p><a href="geometry/forms/unit04-b.html" target="_blank" rel="noopener">Print Form B</a></p>'+p('The printable learner forms contain givens and diagrams, not keys. Use the pages that follow only to review your completed work.'));
  for(const form of ['A','B'])v.forms[form].forEach((item,i)=>bankItem(page,item,`Form ${form}: item ${i+1}`));
  exit(page,[]);return;
 }
 text(page,l.key==='4.10'?'Day 1: get started':'Get started',p(v.hook)+`<ul>${v.goals.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`);
 text(page,l.key==='4.10'?'Day 1: the big idea':'The big idea',p(v.idea));
 if(l.key==='4.10'){
  worked(page,{...v.examples[0],figure:slot(l.key,0)});
  page('Day 1: Try it',{kind:'activity',activity:'sss-day1'},{html:p('Explore the interior case. C stays above the line and CG crosses inside AB.')});
  exit(page,['What did we build triangle ABG from, and why not the compass?'],'Day 1: exit check');
  text(page,'Day 2: finish the theorem',p('Two-day lesson. Today covers the exterior and endpoint cases before later lessons use SSS. The past-A and through-A cases follow by exchanging A with B and D with E.'));
  worked(page,{...v.examples[1],figure:slot(l.key,1)});
  page('Day 2: Try it',{kind:'activity',activity:'sss-day2'},{html:p('Explore interior, exterior and endpoint cases. Name when to add, subtract or use one isosceles triangle.')});
 }else{
  v.examples.forEach((e,i)=>worked(page,{...e,figure:slot(l.key,i)}));
  if(gx)page('Try it',{kind:'gx',gx},{html:p('Use the controls. A drawing suggests a result; it is not a proof.')});
  else page('Try it',{kind:'activity',activity:l.key,task:{steps:v.examples[0].steps.map(s=>({step:s.step,reason:s.reason}))}},{html:p('Try the guided task. Write a reason for each choice.')});
 }
 const errors={'4.1':'Jordan writes triangle ABC ≅ triangle FED for the cutouts. Find the mismatch.','4.2':'Jordan says any three matching parts guarantee congruence.','4.3':'Jordan calls angle B the included angle between AB and AC.','4.4':'Jordan calls a non-included side ASA.','4.5':'Jordan uses AC = AD to prove AC = AD.','4.6':'Jordan uses CPCTC before proving congruence.','4.7':'Jordan says the base angles are always the bottom ones.','4.8':'Jordan says reversing a true theorem proves its converse.','4.10':'Jordan says SSS is a postulate in this course.','4.11':'Jordan says that if you make the lengths bigger, SSA becomes a congruence test.','4.12':'Jordan measures a copy and calls it exact.','4.13':'Jordan uses M without defining it.'};
 mistake(page,v.mistakePrompt||errors[l.key],p(v.mistake),l.key==='4.1'?slot(l.key,0):l.key==='4.11'?figure(leoPendingFigure(),'Two triangles that share the angle at A, side AB, and side BC. The circle centered at B crosses the ray from A at two points.'):null);
 v.practice.forEach((item,i)=>practice(page,{...item,figure:l.key==='4.11'?slot(l.key,0):null},`Practice ${i+1}`));
 let check=c.check;
 if(l.key==='4.11')check=['What condition gives one right triangle in the swinging-door picture?','The circle is tangent at the perpendicular foot from B, and that foot lies strictly past A on the ray. A single ray crossing is not always a tangency.'];
 if(l.key==='4.7')check=[check[0],'The base angles are equal by the Isosceles Triangle Theorem. Their sum waits until Unit 5.'];
 practice(page,{prompt:check[0],solution:check[1],check:'Name the givens and the theorem or definition used.'},'Check yourself');
 exit(page,v.exit,'Exit ticket',l.key==='4.14'?'<p>Review launch: spend ten minutes on flagged items, then finish the self-paced set.</p><p><a href="study-geometry-story.html?lesson=u04-l15">Open the 4.15 review bank</a></p>':'');
}

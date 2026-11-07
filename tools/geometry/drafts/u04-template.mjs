import {worked, practice, mistake, exitBody} from "../template-v2.mjs";
const esc = (s) => String(s ?? "").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const p = s => `<p>${esc(s)}</p>`;
export function pilot(page, l, c, v, gx) {
  if (v.placeholder) {
    page('Quiz placeholder',{kind:'text',body:p(v.placeholder)},{html:p(v.placeholder)});
    page('Exit ticket',{kind:'exit-ticket',body:exitBody([])},{html:exitBody([])});return;
  }
  if (l.key==='4.15' || l.key==='4.16') {
    const intro=p(l.key==='4.15'?'Mixed review: original aligned items, Jacobs Chapter 4 Summary and Review, pp. 176 to 180.':'Form A: 12 original aligned items. Complete your work before opening the solutions.');
    page('What to know',{kind:'text',body:intro},{html:intro});
    if (l.key==='4.15') worked(page,v.clinic);
    else {
      const link='<p><a href="geometry/forms/unit04-a.html" target="_blank" rel="noopener">Printable Form A</a></p>';
      page('Assessment forms',{kind:'text',body:link+p('Form B placeholder: awaiting replacement from Euclid. Not available for assessment.')},{html:link+p('Form B placeholder: awaiting replacement from Euclid. Not available for assessment.')});
    }
    v.practice.forEach((item,i)=>practice(page,item,`Practice ${i+1}`));
    page('Exit ticket',{kind:'exit-ticket',body:exitBody([])},{html:exitBody([])});return;
  }
  page('Get started',{kind:'text',body:p(v.hook)+`<ul>${v.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`},{html:p(v.hook)});
  page('The big idea',{kind:'text',body:p(v.idea)},{html:p(v.idea)});
  v.examples.forEach(e=>worked(page,e));
  if (gx) page('Try it',{kind:'gx',gx},{html:p('Use the controls to explore. A drawing suggests a result; it is not a proof.')});
  else page('Try it',{kind:'activity',activity:l.key},{html:p('Try the guided task on this page. Write a reason for each choice.')});
  mistake(page,v.mistakePrompt,p(v.mistake));
  v.practice.forEach((item,i)=>practice(page,item,`Practice ${i+1}`));
  let check=c.check;
  if(l.key==='4.11') check=['What compass position gives exactly one right triangle?','The circle touches the ray at the perpendicular foot from B. The numerical length proof waits until later; no trigonometry is needed here.'];
  if(l.key==='4.7') check=[check[0],'They are equal to each other by the Isosceles Triangle Theorem. The angle sum waits until Unit 5.'];
  page('Check yourself',{kind:'practice',prompt:check[0],solution:check[1],check:'State the given facts and identify the theorem or definition used in your solution.'},{html:p(check[0])+`<details><summary>Show the answer</summary>${p(check[1])}</details>`});
  const body=exitBody(v.exit);page('Exit ticket',{kind:'exit-ticket',body},{html:body});
}

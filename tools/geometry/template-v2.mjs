// Learner schema only. Do not serialize builder notes into a deck or readable HTML.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p = (s) => `<p>${esc(s)}</p>`;
export const exitBody = (items) => `<ol>${items.map((s) => `<li>${esc(s)}</li>`).join('')}<li>What's confusing?</li></ol>`;
const learnerFigure = (figure) => figure ? {svg:figure.svg || null,src:figure.src || null,alt:figure.alt || ''} : {svg:null,alt:''};
export function worked(page, example) {
  const { title, steps, optional = false } = example;
  if (!steps?.length || steps.some((s) => !s.step || !s.reason)) throw new Error('Worked example needs step/reason rows');
  const rows = steps.map((s) => `<tr><td>${esc(s.step)}</td><td>${esc(s.reason)}</td></tr>`).join('');
  page(optional ? 'Optional extension' : 'Worked example', {kind:'worked-example',prompt:title,steps,optional,figure:learnerFigure(example.figure)}, {html:`${p(title)}<details><summary>Read the worked steps</summary><table><tr><th>Step</th><th>Reason</th></tr>${rows}</table></details>`});
}
export function practice(page, item, title='Practice') {
  const {prompt,solution,check} = item;
  if (!prompt || !solution || !check) throw new Error('Practice requires a full solution and a second check');
  page(title,{kind:'practice',prompt,solution,check,figure:learnerFigure(item.figure)},{html:`${p(prompt)}${p('Try it on paper first, then reveal.')}<details><summary>Reveal solution</summary>${p(solution)}<details><summary>Reveal second check</summary>${p(check)}</details></details>`});
}
export function mistake(page, prompt, correction, figure) {
  if (!prompt || !correction) throw new Error("Common mistake requires fictional work and a correction");
  page('Common mistake',{kind:'common-mistake',prompt,correction,figure:learnerFigure(figure)},{html:`${p(prompt)}${p('Try it on paper first, then reveal.')}<details><summary>Find and fix the error</summary>${correction}</details>`});
}

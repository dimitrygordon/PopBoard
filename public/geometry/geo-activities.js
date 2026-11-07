// Student-facing guided tasks. No builder certificates or staff notes are accepted here.
import {correspondenceFigure,sssFigure,radiusFigure,isoscelesFigure,motionFigure,asaRaysFigure} from './geo-u04-figures.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function mountActivity(host,id,task={}) {
 host.innerHTML='<div class="gx-activity-figure"></div><p class="gx-activity-prompt"></p><div class="gx-actions"></div><p class="gx-activity-feedback" aria-live="polite"></p>';
 const fig=host.querySelector('.gx-activity-figure'),prompt=host.querySelector('.gx-activity-prompt'),actions=host.querySelector('.gx-actions'),feedback=host.querySelector('.gx-activity-feedback');
 const show=(html,alt)=>{fig.innerHTML=html;const svg=fig.querySelector('svg');if(svg){svg.setAttribute('role','img');svg.setAttribute('aria-label',alt);}};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b);return b;};
 const range=(label,min,max,step,value,change)=>{const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');Object.assign(input,{type:'range',min,max,step,value});input.setAttribute('aria-label',label);input.oninput=()=>change(+input.value);l.append(input);actions.append(l);return input;};
 if(id==='4.1'){
  prompt.textContent='Choose a source label, then its partner, or drag a label onto a partner. Try a different order.';
  show(correspondenceFigure(),'Congruent scalene triangles ABC and EFD.');
  let selected=null;const matches={A:'E',B:'F',C:'D'},order=[];
  const match=target=>{if(!selected){feedback.textContent='Choose a source label first.';return;}if(matches[selected]!==target){feedback.textContent='That pairing breaks the matching side marks. Try again.';return;}if(!order.includes(selected))order.push(selected);feedback.textContent=`triangle ${order.join('')} ≅ triangle ${order.map(n=>matches[n]).join('')}${order.length===3?'. All three matched.':'. Keep matching.'}`;selected=null;};
  for(const n of ['A','B','C']){const b=button(n,()=>{selected=n;feedback.textContent=`Match ${n}.`;});b.draggable=true;b.ondragstart=e=>{selected=n;e.dataTransfer.setData('text/plain',n);};}
  for(const n of ['E','F','D']){const b=button('Partner '+n,()=>match(n));b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();match(n);};}
  button('Reset',()=>{order.length=0;selected=null;feedback.textContent='Choose a source label.';});
 }else if(id.startsWith('sss-')){
  const day1=id==='sss-day1';let t=0;const low=day1?-1.9:-5,high=day1?1.9:5;
  prompt.textContent=day1?'Drag C horizontally. CG must stay inside AB. Name the equal angles you add.':'Drag C across the three cases, or choose an exact endpoint. Name when to add, subtract or use one triangle.';
  const update=()=>{show(sssFigure(t,true,true),`SSS joining-line case for C at horizontal parameter ${t.toFixed(2)}.`);const c=Math.abs(t)<2-1e-8?'Interior: add equal isosceles angles.':Math.abs(Math.abs(t)-2)<1e-8?'Endpoint: use the one remaining isosceles triangle.':'Exterior: subtract the smaller equal angles from the larger ones.';feedback.textContent=c+' The past-A and through-A versions exchange A with B and D with E.';};
  const slider=range('C horizontal position',low,high,.1,t,v=>{t=v;update();});
  if(!day1)for(const [label,value] of [['Interior',0],['Past B',4],['Through B',2],['Past A',-4],['Through A',-2]])button(label,()=>{t=value;slider.value=t;update();});
  let drag=null;fig.onpointerdown=e=>{if(!e.target.closest('[data-handle]'))return;drag={x:e.clientX,t};fig.setPointerCapture(e.pointerId);};fig.onpointermove=e=>{if(!drag)return;t=Math.max(low,Math.min(high,drag.t+(e.clientX-drag.x)*10/fig.getBoundingClientRect().width));slider.value=t;update();};fig.onpointerup=()=>drag=null;fig.onpointercancel=()=>drag=null;
  fig.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();t=Math.max(low,Math.min(high,t+(e.key==='ArrowRight'?.1:-.1)));slider.value=t;update();};update();
 }else if(id==='4.13'){
  prompt.textContent='The centers are 10 apart. Change the common radius and count distinct crossings before using the proof.';
  let r=6;const update=()=>{show(radiusFigure(r),'Two equal-radius circles with centers A and B.');feedback.textContent=r<5?'0 crossings. SSS proof is unavailable.':r===5?'1 crossing (tangency). Two points are needed to define PQ.':'2 distinct crossings. The half-turn incidence lemma and SSS/SAS proof apply.';host.classList.toggle('gx-proof-unavailable',r<=5);};
  const proof=document.createElement('ol');proof.className='gx-proof-applicability';for(const line of ['Define two crossings P and Q.','Use the half-turn incidence lemma.','Use SSS, then SAS and the linear pair.']){const li=document.createElement('li');li.textContent=line;proof.append(li);}host.insertBefore(proof,actions);
  const slider=range('Common radius',1,9,.1,r,v=>{r=v;update();});for(const v of [4,5,6])button('Radius '+v,()=>{r=v;slider.value=r;update();});update();
 }else if(id==='4.7'){
  prompt.textContent='Change the apex height. The two leg marks stay equal. Identify the base angles even after turning the picture.';
  let h=2,turned=false;const update=()=>{show(isoscelesFigure(h,false,turned,true),'Isosceles triangle ABC, AB = AC.');feedback.textContent=`Base angles B and C are equal, each approximately ${(Math.atan(h)*180/Math.PI).toFixed(1)}°. We do not use the triangle-angle sum.`;};
  const slider=range('Apex height',.5,4,.1,h,v=>{h=v;update();});let drag=null;fig.onpointerdown=e=>{if(!e.target.closest('[data-handle]'))return;drag={y:e.clientY,h};fig.setPointerCapture(e.pointerId);};fig.onpointermove=e=>{if(!drag)return;h=Math.max(.5,Math.min(4,drag.h+(drag.y-e.clientY)/60));slider.value=h;update();};fig.onpointerup=()=>drag=null;fig.onpointercancel=()=>drag=null;button('Turn the figure',()=>{turned=!turned;update();});update();
 }else if(id==='4.8'){
  prompt.textContent='Compare triangle ABC with triangle ACB. Each frame is an exact rigid reflection, never a stretched triangle.';
  let reflected=false;const update=()=>{show(isoscelesFigure(2,reflected,false,false,true,reflected),'Triangle ABC reflected across its symmetry axis.');feedback.textContent=reflected?'Reflection puts B on C and C on B. ASA establishes congruence, then CPCTC gives AB = AC.':'Start with the equal base angles as givens and shared BC = CB.';};
  button('Reflect',()=>{reflected=!reflected;update();});update();
 }else if(id==='4.4'){
  prompt.textContent='Drag either endpoint of the included side. The endpoint angles remain fixed and the two rays meet at just one third vertex. Use the buttons for keyboard control.';
  let d=[100,290],e=[480,290],drag=null;
  const update=()=>{show(asaRaysFigure(d,e),'ASA: two fixed endpoint rays meet uniquely at F.');feedback.textContent='The side and its two endpoint angles determine F. This models ASA, not AAS.';};
  fig.onpointerdown=ev=>{const hit=ev.target.closest('[data-handle]');if(!hit)return;drag=hit.dataset.handle;fig.setPointerCapture(ev.pointerId);};
  fig.onpointermove=ev=>{if(!drag)return;const rect=fig.getBoundingClientRect(),p=[Math.max(drag==='D'?60:380,Math.min(drag==='D'?220:540,(ev.clientX-rect.left)*600/rect.width)),Math.max(260,Math.min(320,(ev.clientY-rect.top)*400/rect.height))];if(Math.hypot(p[0]-(drag==='D'?e:d)[0],p[1]-(drag==='D'?e:d)[1])<100)return;if(drag==='D')d=p;else e=p;update();};
  fig.onpointerup=()=>drag=null;fig.onpointercancel=()=>drag=null;
  button('Tilt base',()=>{d=[100,270];e=[480,310];update();});button('Reset',()=>{d=[100,290];e=[480,290];update();});update();
 }else if(id==='4.3'){
  prompt.textContent=id==='4.3'?'Choose each rigid motion in order. A move must preserve the given lengths and included angle.':'Align the included side, then both endpoint rays. The third vertex must land at their unique intersection.';
  const moves=id==='4.3'?['Translate A to D','Rotate AB onto DE','Reflect across DE if needed','Align AC with DF']:['Slide AB onto DE','Reflect across DE if needed','Match ray AC with DF','Match ray BC with EF'];let step=0;
  show(motionFigure(0),'Triangles ABC and DEF, before alignment.');
  const frame=()=>show(motionFigure(step),'Rigid-motion model: every displayed frame preserves all pairwise distances.');
  const correct=()=>{feedback.textContent=step===moves.length?'All corresponding vertices land together. Rigid-motion existence and preservation give congruence.':`${step} of ${moves.length} alignment steps complete.`;};
  for(const label of [...moves].reverse())button(label,()=>{if(label!==moves[step]){feedback.textContent='That is not the next alignment. Preserve the side correspondence and chosen half-plane.';return;}step++;frame();correct();});
  button('Reset',()=>{step=0;frame();correct();});correct();
 }else{
  prompt.textContent=id==='4.14'?'Choose a test first, then order the proof. Use the shortest valid route.':'Build the proof in order. CPCTC stays locked until congruence has been established.';
  const rows=(task.steps||[]).map(s=>({step:s.step,reason:s.reason}));let next=0,started=id!=='4.14';
  const list=document.createElement('ol');list.className='gx-ordered-proof';host.insertBefore(list,actions);
  if(!started)for(const test of ['SSS','SAS','ASA','SSA'])button(test,()=>{started=test==='SSS';feedback.textContent=started?'Three side pairs are available. Now order the proof.':'Check the actual givens before choosing a test.';});
  const buttons=[];const congruence=rows.findIndex(r=>r.step.includes('≅'));
  const refresh=()=>buttons.forEach(({button,row})=>{button.disabled=id==='4.6'&&row.reason.includes('CPCTC')&&next<=congruence;});
  const choose=row=>{if(!started){feedback.textContent='Choose the test first.';return;}if(rows[next]!==row){feedback.textContent='This is the first out-of-order line. Establish its hypotheses first.';return;}const li=document.createElement('li');li.textContent=row.step+' Because '+row.reason;list.append(li);next++;refresh();feedback.textContent=next===rows.length?'Proof complete: each conclusion has its hypotheses.':`${next} of ${rows.length} lines ordered.`;};
  for(const row of [...rows].reverse()){
   const b=button(row.step,()=>choose(row));b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',String(rows.indexOf(row)));buttons.push({button:b,row});
  }
  list.ondragover=e=>e.preventDefault();list.ondrop=e=>{e.preventDefault();const i=Number(e.dataTransfer.getData('text/plain'));if(rows[i])choose(rows[i]);};refresh();
  button('Reset',()=>{next=0;list.replaceChildren();refresh();feedback.textContent='Start with the givens.';});
 }
 return {destroy(){host.replaceChildren();}};
}

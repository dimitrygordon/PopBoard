// Small, keyboard-accessible pilot tasks. Model coordinates are never printed as learner text.
export function mountActivity(host, id) {
  const p = document.createElement('p'), art = document.createElement('div'), controls = document.createElement('div'), feedback = document.createElement('p');
  controls.className='gx-actions'; feedback.setAttribute('aria-live','polite'); host.append(p,art,controls,feedback);
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;controls.append(b);return b;};
  const range=(label,min,max,value,fn)=>{const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type='range';i.min=min;i.max=max;i.value=value;i.setAttribute('aria-label',label);i.oninput=()=>fn(+i.value);l.append(i);controls.append(l);return i;};
  const svg=(body)=>{art.innerHTML=`<svg viewBox="0 0 360 260" role="img" aria-label="Triangle construction"><g fill="none" stroke="currentColor" stroke-width="2">${body}</g></svg>`;};
  const poly=(pts)=>`<polygon points="${pts}"/>`;
  const label=(x,y,t)=>`<text x="${x}" y="${y}" fill="currentColor" stroke="none" font-size="18">${t}</text>`;
  if(id==='4.1') {
    p.textContent='Triangle ABC matches triangle EFD. Match each letter, then write the statement in order.';
    const selects=['A','B','C'].map(a=>{const l=document.createElement('label');l.textContent=`${a} matches `;const s=document.createElement('select');s.setAttribute('aria-label',`${a} matches`);for(const t of ['Choose','D','E','F']){const o=document.createElement('option');o.textContent=t;s.append(o);}l.append(s);controls.append(l);return s;});
    button('Check matching',()=>{feedback.textContent=selects.map(s=>s.value).join('')==='EFD'?'Correct: triangle ABC ≅ triangle EFD. The letter positions match.':'Read the letters in order: first matches first, second matches second, third matches third.';});
    svg(poly('30,210 150,210 54,138')+poly('250,220 250,100 178,196')+label(15,230,'A')+label(150,230,'B')+label(43,128,'C')+label(260,235,'E')+label(260,95,'F')+label(160,195,'D'));
  } else if(id==='4.3') {
    p.textContent='Choose the next motion to align the two sides and their included angle. Wrong moves leave the state unchanged.';
    const steps=['Translate','Rotate','Reflect if needed','Match the second ray','Match the final length'];let n=0;
    const draw=()=>{svg(poly('30,200 150,200 85,90')+`<g transform="translate(${n?170:150},${n>1?0:20})">${poly('30,200 150,200 85,90')}</g>`);};draw();
    steps.forEach((s,i)=>button(s,()=>{if(i!==n){feedback.textContent='Not yet. Match the first vertex, then its ray, then the half-plane.';return;}n++;draw();feedback.textContent=n===5?'All three vertices match. Each motion preserves lengths and angles.':`${s}: accepted. What comes next?`;}));
    button('Reset',()=>{n=0;feedback.textContent='';draw();});
  } else if(id==='4.4') {
    p.textContent='Move the included side endpoint. The two fixed endpoint angles determine one crossing point.';
    const draw=x=>{const cx=70+(x-70)*.4,cy=210-(x-70)*.6;svg(poly(`70,210 ${x},210 ${cx},${cy}`)+label(50,235,'A')+label(x,235,'B')+label(cx,cy-10,'C'));feedback.textContent='AB joins the marked angle vertices. The two distinct rays meet only at C.';};
    range('Move B along the base',180,320,270,draw);draw(270);
  } else if(id==='4.5'||id==='4.6') {
    const steps=id==='4.5'?['Mark the givens','Find midpoint equalities','Use vertical angles','Conclude SAS','Use CPCTC']:['Mark AB = CB and the angle at B','Use BD = BD','Conclude SAS','Use CPCTC for AD = CD'];let n=0;
    p.textContent='Build the proof in order. CPCTC cannot be accepted until congruence is established.';
    [...steps].reverse().forEach(s=>button(s,()=>{if(s!==steps[n]){feedback.textContent=`Not yet. Next: ${steps[n]||'the proof is complete'}.`;return;}n++;feedback.textContent=`${steps.slice(0,n).join(' → ')}${n===steps.length?'. Proof complete.':''}`;}));
    button('Reset proof',()=>{n=0;feedback.textContent='';});
  } else if(id==='4.7') {
    p.textContent='Move the apex while keeping the legs equal. The base angles move together, even when the picture is turned.';
    const draw=y=>{svg(poly(`180,${y} 70,220 290,220`)+label(180,y-10,'A')+label(50,240,'B')+label(290,240,'C'));const a=Math.atan2(220-y,110)*180/Math.PI;feedback.textContent=`AB = AC. Measured base angles: B ≈ ${a.toFixed(1)} degrees, C ≈ ${a.toFixed(1)} degrees. Theorem 9 proves equality, not the measurements.`;};range('Move the apex',40,180,70,draw);draw(70);
  } else if(id==='4.8') {
    p.textContent='Compare triangle ABC with triangle ACB. Reflect across its line of symmetry and follow the vertex names.';let flip=false;
    const draw=()=>svg(poly('180,40 70,220 290,220')+label(180,28,'A')+label(50,245,flip?'C':'B')+label(290,245,flip?'B':'C'));draw();button('Flip the correspondence',()=>{flip=!flip;draw();feedback.textContent='A matches A, B matches C, C matches B. BC = CB is the included side for ASA.';});
  } else if(id==='4.10') {
    p.textContent='Move C while the joining line CG crosses inside AB. The other two cases are in the Review proof clinic.';
    const draw=t=>{const x=180+t;svg(poly(`60,130 300,130 ${x},35`)+poly(`60,130 300,130 ${x},225`)+`<path d="M${x},35 V225" stroke-dasharray="5 5"/>`+label(40,135,'A')+label(305,135,'B')+label(x,25,'C')+label(x,250,'G'));feedback.textContent='AC = AG and BC = BG. Add the equal isosceles base angles, then use SAS.';};range('Move C and G',-100,100,0,draw);draw(0);
  } else if(id==='4.13') {
    p.textContent='Centers A and B are 10 units apart. Change the common radius. The proof needs two distinct crossings.';
    const draw=r=>{const h=Math.sqrt(Math.max(0,r*r-25))*14;svg(`<circle cx="110" cy="130" r="${r*14}"/><circle cx="250" cy="130" r="${r*14}"/><path d="M110,130 H250"/>`+label(90,150,'A')+label(250,150,'B')+(r>5?`<path d="M180,${130-h} V${130+h}" stroke-dasharray="5 5"/>`+label(185,125-h,'P')+label(185,150+h,'Q')+label(185,125,'M'):''));feedback.textContent=r>5?'Two crossings P and Q, on opposite sides of AB. Define M = PQ ∩ AB before using it.':r===5?'One tangent point. P and Q are not distinct, so there is no joining line.':'No crossings. The radius is too small.';};range('Common radius',3,7,6,draw);draw(6);
  } else {
    p.textContent='Lines AB and CD cross at O. Opposite angles are 3x + 4 and 5x - 20 degrees. Choose the shortest route.';
    ['SSS','SAS','ASA','Vertical angles'].forEach(s=>button(s,()=>{feedback.textContent=s==='Vertical angles'?'Yes. 3x + 4 = 5x - 20, so x = 12. Both angles are 40 degrees.':'No triangle congruence is needed. Which direct angle theorem applies?';}));
  }
}

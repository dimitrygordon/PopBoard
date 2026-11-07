import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/r3';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const auditFigures=selector=>[...document.querySelectorAll(selector)].map((item,i)=>{
    const labels=[...item.querySelectorAll('svg text')];const rect=t=>t.getBoundingClientRect();const pairs=[];
    for(let a=0;a<labels.length;a++)for(let c=a+1;c<labels.length;c++){const x=rect(labels[a]),y=rect(labels[c]);if(x.left<y.right+2&&x.right+2>y.left&&x.top<y.bottom+2&&x.bottom+2>y.top)pairs.push([labels[a].textContent,labels[c].textContent]);}
    const strokes=[];
    for(const shape of item.querySelectorAll('svg path,svg circle')){const matrix=shape.getScreenCTM(),length=shape.getTotalLength();for(let n=0;n<=Math.ceil(length);n++){const p=shape.getPointAtLength(Math.min(n,length));strokes.push({x:matrix.a*p.x+matrix.c*p.y+matrix.e,y:matrix.b*p.x+matrix.d*p.y+matrix.f});}}
    const touches=labels.filter(t=>{const r=rect(t);return strokes.some(p=>p.x>r.left-1&&p.x<r.right+1&&p.y>r.top-1&&p.y<r.bottom+1);}).map(t=>t.textContent);
    const small=labels.filter(t=>{const m=t.getScreenCTM();return parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b)<15.9;}).map(t=>t.textContent);
    const bounds=labels.filter(t=>{const x=rect(t),y=rect(t.closest('svg'));return x.left<y.left-1||x.right>y.right+1||x.top<y.top-1||x.bottom>y.bottom+1;}).map(t=>t.textContent);
    return {item:i+1,pairs,bounds,touches,small};
   });
const errors=[];let shots=0;
try{
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  for(const [slug,n,label] of [['u04-l13',4,'4.13-worked'],['u04-l10',8,'4.10-day2-worked']]){
   await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'networkidle0'});
   await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
   assert.equal(await page.$$eval('.gx-learner-text,.gx-proof',es=>es.some(e=>e.scrollWidth>e.clientWidth+1)),false,label);
   if(slug==='u04-l13')assert.equal(await page.$('.gx-figure-slot'),null);
   else assert.match(await page.$eval('.gx-proof',e=>e.textContent),/because swapping A with B and D with E/);
   assert.equal(await page.$eval('.gx-lesson',e=>e.textContent.includes('Figure coming')),false);
   await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;
  }
  for(const form of ['a','b']){
   await page.goto(`${base}/geometry/forms/unit04-${form}.html`,{waitUntil:'networkidle0'});
   const audit=await page.evaluate(auditFigures,'.item');
   fs.writeFileSync(`${out}/${size.width}x${size.height}-form-${form}-audit.json`,JSON.stringify(audit,null,2));
   assert.deepEqual(audit.filter(a=>a.pairs.length||a.bounds.length||a.touches.length||a.small.length),[],`${form} labels`);
   await page.$eval('.item:last-child',e=>e.scrollIntoView({block:'start'}));
   assert.ok(Math.abs(await page.$eval('.item:last-child',e=>e.getBoundingClientRect().top))<2,'No blank above item 12');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'form overflow');
   await page.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12.png`});shots++;
   const item=await page.$('.item:last-child');await item.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12-full.png`});
  }
 }
 for(const size of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewport(size);
  for(const [n,label] of [[4,'4.11-we1'],[5,'4.11-we2'],[7,'4.11-common-mistake']]){
   await page.goto(`${base}/study-geometry-story.html?lesson=u04-l11&page=${n}`,{waitUntil:'networkidle0'});
   if(n!==7)await page.click('.gx-actions button:nth-child(2)');else await page.click('.gx-actions button');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   if(size.width===1440)assert.ok(await page.$eval('.gx-figure-slot',e=>e.getBoundingClientRect().width)>=300);
   assert.equal(await page.$$eval('.gx-figure-slot text',labels=>labels.every(t=>{const m=t.getScreenCTM();return parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b)>=15.9;})),true,'readable figure labels');
   const audit=await page.evaluate(auditFigures,'.gx-figure-slot');assert.deepEqual(audit.filter(a=>a.pairs.length||a.bounds.length||a.touches.length||a.small.length),[],label+' figure labels');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
   await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;
  }
  const data=await (await fetch(`${base}/geometry/decks/u04-l12/deck.json`)).json();const n=data.slides.findIndex(s=>s.geo.kind==='gx')+1;
  await page.goto(`${base}/study-geometry-story.html?lesson=u04-l12&page=${n}`,{waitUntil:'networkidle0'});
  await page.$$eval('button',bs=>bs.find(b=>b.textContent==='Show all').click());
  await page.$eval('[aria-label="Point B"]',e=>e.focus());for(let i=0;i<4;i++)await page.keyboard.press('ArrowUp');
  await page.$eval('[aria-label="Point C"]',e=>e.focus());for(let i=0;i<34;i++)await page.keyboard.press('ArrowDown');
  await page.waitForFunction(()=>document.querySelector('.gx-step')?.textContent.includes('Undefined / flat input'));
  assert.doesNotMatch(await page.$eval('.gx-step',e=>e.textContent),/triangles congruent|congruent to ABC/);
  assert.equal(await page.$eval('.gx-board',e=>e.textContent.includes('F')),false,'no copied apex for flat input');
  await page.screenshot({path:`${out}/${size.width}x${size.height}-4.12-flat-input.png`,fullPage:true});shots++;
  await page.keyboard.press('ArrowUp');await page.waitForFunction(()=>document.querySelector('.gx-step')?.textContent.includes('three equal sides make the triangles congruent'));
 }
 await page.goto(`${base}/study-geometry-story.html?lesson=u04-l14&page=8`,{waitUntil:'networkidle0'});
 await page.click('.gx-actions button');assert.match(await page.$eval('.gx-lesson',e=>e.textContent),/vertical angles already give/);assert.match(await page.$eval('.gx-correction',e=>e.textContent),/Vertical angles alone give that angle in one step/);
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
 await page.screenshot({path:`${out}/390x844-4.14-common-mistake.png`,fullPage:true});shots++;
 await page.setViewport({width:1440,height:900});
 await page.goto(`${base}/study-geometry-story.html?lesson=u01-l10&page=5`,{waitUntil:'networkidle0'});
 await page.click('.gx-actions button:nth-child(1)');await page.click('.gx-actions button:nth-child(2)');
 assert.equal(await page.$$eval('.gx-actions button',bs=>bs.every(b=>b.classList.contains('gx-used')&&getComputedStyle(b).opacity==='1'&&b.textContent.includes('✓'))),true);
 assert.deepEqual(errors,[]);console.log(`PASS: ${shots} review screenshots, all assessment label bounds/separation at three sizes, no blank before item 12, no placeholders/overflow, used reveal styles.`);
}finally{await b.close();}

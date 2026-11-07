import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772',out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/u4';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});let mounts=0,shots=0;const errors=[];
try{
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/study-geometry-story.html?lesson=u04-l01&page=4',{waitUntil:'networkidle0'});
 const behavior=await page.evaluate(async base=>{
  const {mountActivity}=await import(base+'/geometry/geo-activities.js');const {mount}=await import(base+'/geometry/geo-page.js');const {GX}=await import(base+'/geometry/gx/u04.js');
  const host=document.createElement('div');document.body.append(host);const btn=s=>[...host.querySelectorAll('button')].find(b=>b.textContent===s);
  const feedback=()=>host.querySelector('.gx-activity-feedback').textContent;
  mountActivity(host,'4.1');btn('A').click();btn('Partner F').click();if(!feedback().includes('breaks'))throw new Error('bad match accepted');for(const [a,b] of [['C','D'],['A','E'],['B','F']]){btn(a).click();btn('Partner '+b).click();}if(!feedback().includes('triangle CAB ≅ triangle DEF'))throw new Error('ordered matching');
  mountActivity(host,'4.3');btn('Align AC with DF').click();if(!feedback().includes('not the next'))throw new Error('motion order');for(const label of ['Translate A to D','Rotate AB onto DE','Reflect across DE if needed','Align AC with DF'])btn(label).click();if(!feedback().includes('All corresponding vertices'))throw new Error('SAS finish');
  mountActivity(host,'4.4');btn('Tilt base').click();if(!host.querySelector('[data-handle="D"]'))throw new Error('ASA endpoints');
  mountActivity(host,'sss-day1');if(!feedback().includes('Interior:'))throw new Error('day1 case');if(+host.querySelector('input').max>=2)throw new Error('day1 leaves interior');
  mountActivity(host,'sss-day2');btn('Past B').click();if(!feedback().includes('Exterior:'))throw new Error('exterior');btn('Through B').click();if(!feedback().includes('Endpoint:'))throw new Error('endpoint');btn('Through A').click();if(!feedback().includes('Endpoint:'))throw new Error('other endpoint');
  mountActivity(host,'4.13');for(const [r,label] of [[4,'0 crossings'],[5,'1 crossing'],[6,'2 distinct crossings']]){btn('Radius '+r).click();if(!feedback().includes(label))throw new Error('radius '+r);}
  const data=await (await fetch(base+'/geometry/decks/u04-l06/deck.json')).json();const task=data.slides.find(s=>s.geo.kind==='activity').geo.task;
  mountActivity(host,'4.6',task);const final=btn(task.steps.at(-1).step);if(!final.disabled)throw new Error('CPCTC not locked');for(const row of task.steps)btn(row.step).click();if(!feedback().includes('Proof complete'))throw new Error('proof ordering');
  // Actual SSA module with real construction UI semantics and no-op drawing.
  const ctl=document.createElement('div');ctl.className='gx-ctl';host.replaceChildren(ctl);let message='';const points=[],g=new Proxy({},{get:()=>()=>{}});
  const board={reduce:true,point(x,y){const p={x,y};points.push(p);return p;},draw(fn){board.redraw=()=>fn(g);board.redraw();},update(){board.redraw();}};
  const ui={el:host,row(){},button(){return document.createElement('button');},slider(){return {set(){}};},read(s){message=s;}};GX.ssa.mount(board,ui);
  for(const [r2,count] of [[4,0],[9,1],[10,2],[25,1],[36,1]]){Object.assign(points[0],{x:0,y:0});Object.assign(points[1],{x:400,y:300});points[2].x=1040+Math.sqrt(r2)*100/1.5;board.update();if(!message.includes(`<b>${count}</b>`))throw new Error('SSA count '+r2+': '+message);}
  host.remove();return 'matching, exact motion order, ASA, both SSS days, radius guard, CPCTC lock and five actual SSA fixtures passed';
 },base);console.log(behavior);
 // All changed Unit 4 pages mounted and revealed at all three widths with adversarial builder fields.
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  mounts+=await page.evaluate(async({base,width})=>{
   const {mount}=await import(base+'/geometry/geo-page.js');let count=0;
   const stage=document.createElement('div'),tools=document.createElement('div');stage.className='stage';stage.style.cssText=`position:relative;width:${width-32}px;height:900px`;document.body.append(stage,tools);
   for(let n=1;n<=16;n++){
    const data=await(await fetch(`${base}/geometry/decks/u04-l${String(n).padStart(2,'0')}/deck.json`)).json();
    for(const slide of data.slides){slide.geo.builder_only='BUILDER_SENTINEL_731';slide.geo.builder='BUILDER_SENTINEL_731';slide.geo.teacherKey='BUILDER_SENTINEL_731';const m=mount({stage,tools,slide,meta:{q:4,lesson:n},reduce:true});
     stage.querySelectorAll('details').forEach(d=>d.open=true);stage.querySelectorAll('button').forEach(b=>{if(b.textContent==='Show all'||b.textContent==='Reveal solution'||b.textContent==='Reveal second check'||b.textContent==='Reveal correction')b.click();});
     if(stage.textContent.includes('BUILDER_SENTINEL_731')||/Backend|Builder and answer-key layer|sqrt\(10\)|Sign-off patch/.test(stage.textContent))throw new Error('staff leak 4.'+n);
     for(const e of stage.querySelectorAll('.gx-learner-text,.gx-proof'))if(e.scrollWidth>e.clientWidth+2)throw new Error('text overflow 4.'+n+' '+slide.n);
     m.destroy();count++;
    }
   }
   stage.remove();tools.remove();return count;
  },{base,width:size.width});
  const targets=[['u04-l01',4,'4.1-worked'],['u04-l10',4,'4.10-day1-worked'],['u04-l10',8,'4.10-day2-worked'],['u04-l10',5,'4.10-day1-activity'],['u04-l10',9,'4.10-day2-activity'],['u04-l13',4,'4.13-class-proof']];
  for(const [slug,n,label] of targets){
   await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'networkidle0'});await page.waitForSelector('.gx-lesson');
   if(label.includes('worked')||label.includes('proof')){await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');}
   if(label==='4.10-day2-activity')await page.$$eval('.gx-actions button',bs=>bs.find(b=>b.textContent==='Through B').click());
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' horizontal overflow');
   await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;
  }
  for(const slug of ['u04-l01','u04-l10','u04-l13']){
   await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=1`,{waitUntil:'networkidle0'});await page.waitForSelector('.gx-citation');await page.screenshot({path:`${out}/${size.width}x${size.height}-${slug}-cover.png`,fullPage:true});shots++;
  }
  for(const form of ['a','b']){
   await page.goto(`${base}/geometry/forms/unit04-${form}.html`,{waitUntil:'networkidle0'});assert.equal(await page.$$eval('.item',e=>e.length),12);assert.equal(await page.$$eval('.item figure',e=>e.every(f=>f.querySelector('svg'))),true);assert.equal(await page.$$eval('.item:last-child svg text',es=>es.every(e=>{const r=e.getBoundingClientRect(),s=e.closest('svg').getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1;})),true,'SSA label outside figure');await page.$eval('.item:last-child',e=>e.scrollIntoView());await page.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-ssa.png`});shots++;
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({mounts,shots,errors,behavior},null,2));console.log(`PASS: ${mounts} Unit 4 page mounts, ${shots} screenshots, no builder leaks, overflow or page errors.`);
}finally{await b.close();}

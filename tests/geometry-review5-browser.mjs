import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/r5';fs.mkdirSync(out+'/mapped-pages',{recursive:true});
const wiring=JSON.parse(fs.readFileSync(new URL('../tools/geometry/u04-art-wiring.json',import.meta.url),'utf8'));
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[],metrics=[];let shots=0,mappedShots=0;
try{
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/study-geometry-story.html?lesson=u04-l13&page=4',{waitUntil:'networkidle0'});
 const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
 let mounts=0,layers=0;
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  const sweep=await page.evaluate(async base=>{
   const {mount}=await import(base+'/geometry/geo-page.js');const stage=document.createElement('div'),tools=document.createElement('div');
   stage.className='stage';stage.style.cssText=`position:relative;width:${document.querySelector('.stage').getBoundingClientRect().width}px;min-height:900px`;document.body.append(stage,tools);
   let mounts=0,layers=0;
   for(let lesson=1;lesson<=16;lesson++){
    const data=await(await fetch(`${base}/geometry/decks/u04-l${String(lesson).padStart(2,'0')}/deck.json`)).json();
    for(const slide of data.slides){
     if(!['worked-example','practice','common-mistake'].includes(slide.geo.kind))continue;
     const live=mount({stage,tools,slide,meta:{q:4,lesson},reduce:true});stage.querySelectorAll('details').forEach(d=>d.open=true);
     if(!stage.querySelector('.gx-figure-slot svg'))throw new Error('empty slot '+lesson+'/'+slide.n);
     const gs=[...stage.querySelectorAll('.conclusion')];layers+=gs.length;
     const state=visible=>gs.forEach(g=>{if((getComputedStyle(g).display!=='none')!==visible)throw new Error('conclusion visibility '+lesson+'/'+slide.n);});
     state(false);const btn=label=>[...stage.querySelectorAll('button')].find(b=>b.textContent===label);
     if(slide.geo.kind==='worked-example'){
      btn('Next step').click();if(slide.geo.steps.length>1)state(false);btn('Show all').click();state(true);btn('Back').click();state(false);btn('Show all').click();state(true);
     }else if(slide.geo.kind==='practice'){btn('Reveal solution').click();state(true);btn('Reveal second check').click();state(true);}
     else{btn('Reveal correction').click();state(true);}
     for(const e of stage.querySelectorAll('.gx-learner-text,.gx-proof'))if(e.scrollWidth>e.clientWidth+2)throw new Error('text overflow '+lesson+'/'+slide.n);
     if(/Figure coming|BUILDER_SENTINEL/.test(stage.textContent))throw new Error('learner leak');
     live.destroy();mounts++;
    }
   }
   stage.remove();tools.remove();return{mounts,layers};
  },base);mounts+=sweep.mounts;layers+=sweep.layers;
  const targets=[['u04-l13',4,'4.13-worked',false],['u04-l04',10,'4.4-practice3',false],['u04-l07',5,'4.7-we2',false]];
  if(size.width!==844)targets.push(['u04-l11',5,'4.11-we2',false],['u04-l13',4,'4.13-worked-revealed',true],['u04-l04',10,'4.4-practice3-revealed',true],['u04-l12',7,'4.12-common-mistake',false],['u04-l12',7,'4.12-correction-revealed',true]);
  for(const [slug,n,label,reveal] of targets){
   await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('.gx-figure-slot svg');
   if(reveal)await page.$$eval('.gx-actions button',bs=>bs.find(b=>['Show all','Reveal solution','Reveal correction'].includes(b.textContent)).click());
   else if(label==='4.13-worked'||label==='4.7-we2'||label==='4.11-we2'){await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');}
   await settle();
   const m=await page.$eval('.gx-figure-slot',e=>{const s=e.querySelector('svg'),r=s.getBoundingClientRect();return{column:e.getBoundingClientRect().width,svg:r.width,ratio:r.width/r.height,viewRatio:s.viewBox.baseVal.width/s.viewBox.baseVal.height,minFont:Math.min(...[...e.querySelectorAll('text')].filter(t=>getComputedStyle(t.closest('.conclusion')||t).display!=='none').map(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b))),layers:[...e.querySelectorAll('.conclusion')].filter(g=>g.children.length).map(g=>getComputedStyle(g).display!=='none')};});
   assert.ok(m.minFont>=15.99,JSON.stringify(m));if(size.width===1440)assert.ok(m.column>=300);assert.ok(Math.abs(m.svg-m.column)<1);assert.ok(Math.abs(m.ratio-m.viewRatio)<.001);
   if(reveal){assert.ok(m.layers.length,'nonempty conclusion');assert.ok(m.layers.every(Boolean));}else assert.ok(m.layers.every(v=>!v));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
   metrics.push({size: size.width,label,...m});await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;
   if(reveal){await page.emulateMediaType('print');assert.equal(await page.$$eval('.gx-figure-slot .conclusion',gs=>gs.every(g=>getComputedStyle(g).display==='none')),true);await page.emulateMediaType('screen');}
  }
  // Every inserted art page is loaded, measured and captured through the real reader.
  if(size.width!==844)for(const row of wiring){
   await page.goto(`${base}/study-geometry-story.html?lesson=${row.deck}&page=${row.slide}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('.gx-figure-slot svg');await settle();
   const m=await page.$eval('.gx-figure-slot',e=>({column:e.getBoundingClientRect().width,minFont:Math.min(...[...e.querySelectorAll('text')].filter(t=>getComputedStyle(t.closest('.conclusion')||t).display!=='none').map(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b)))}));
   assert.ok(m.minFont>=15.99,row.slot||row.file);if(size.width===1440)assert.ok(m.column>=300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,row.file);
   await page.screenshot({path:`${out}/mapped-pages/${size.width}x${size.height}-${row.deck}-s${String(row.slide).padStart(2,'0')}.png`,fullPage:true});mappedShots++;
  }
 }
 for(const row of wiring)assert.equal((await fetch(base+'/geometry/figures/u04/'+row.file)).status,200,row.file);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({shots,mappedShots,mounts,layers,metrics,errors},null,2));console.log(`PASS: ${mounts} figure mounts, ${layers} conclusion-layer checks, ${shots} selected screenshots, ${mappedShots} inserted-page screenshots and 94 art URLs.`);
}finally{await b.close();}

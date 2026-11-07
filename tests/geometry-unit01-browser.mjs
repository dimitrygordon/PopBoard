import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/u01';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];let mounts=0,shots=0;
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.gx-learner-text,.gx-proof')].some(e=>e.scrollWidth>e.clientWidth+1));
try{
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  for(let l=1;l<=14;l++){
   const slug=`u01-l${String(l).padStart(2,'0')}`,data=JSON.parse(fs.readFileSync(new URL(`../public/geometry/decks/${slug}/deck.json`,import.meta.url)));
   for(let n=1;n<=data.slides.length;n++){
    await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'domcontentloaded'});const g=data.slides[n-1].geo;await page.waitForSelector('.gx-k-'+g.kind);mounts++;
    if(g.figure?.svg){await page.waitForSelector('.gx-figure-slot svg');
     const hidden=await page.$$eval('.gx-figure-slot .conclusion',gs=>gs.every(x=>getComputedStyle(x).display==='none'));assert.ok(hidden,`${slug} p${n} conclusion visible before reveal`);
     if(g.figure.svg.includes('class="conclusion"')){await page.$$eval('.gx-actions button',bs=>bs.find(x=>/Reveal solution|Show all|Reveal correction/.test(x.textContent)).click());assert.ok(await page.$$eval('.gx-figure-slot .conclusion',gs=>gs.every(x=>getComputedStyle(x).display!=='none')),`${slug} p${n} conclusion hidden after reveal`);}
    }else assert.equal(await page.$('.gx-figure-slot svg'),null,`${slug} p${n} unexpected figure`);
    assert.equal(await overflow(page),false,`${slug} p${n} overflow at ${size.width}`);
   }
  }
  const shot=async(slug,n,label,reveal)=>{await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'networkidle0'});if(reveal)await page.$$eval('.gx-actions button',bs=>bs.find(x=>/Show all|Reveal solution/.test(x.textContent)).click());await settle(page);await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;};
  await shot('u01-l01',1,'1.1-cover',false);
  await shot('u01-l03',5,'1.3-worked-plain',false);
  await shot('u01-l03',5,'1.3-worked-revealed',true);
  await shot('u01-l04',9,'1.4-practice1-revealed',true);
  await shot('u01-l03',9,'1.3-practice1-figure-heavy',false);
  await shot('u01-l14',20,'1.14-formB-item5-figure',false);
 }
 await page.setViewport({width:1440,height:900});
 await page.goto(`${base}/study-geometry-story.html?lesson=u01-l01&page=7`,{waitUntil:'networkidle0'});
 const steps=JSON.parse(fs.readFileSync(new URL('../public/geometry/decks/u01-l01/deck.json',import.meta.url))).slides[6].geo.task.steps;
 assert.equal(await page.evaluate(()=>document.body.textContent.includes('CPCTC')),false);
 for(const s of steps)await page.$$eval('.gx-actions button',(bs,t)=>bs.find(x=>x.textContent===t).click(),s.step);
 const lines=await page.$$eval('.gx-ordered-proof li',ls=>ls.map(l=>l.textContent));assert.deepEqual(lines,steps.map(s=>s.step+' '+s.reason));
 assert.ok(lines.every(l=>!/ Because /.test(l)));
 assert.deepEqual(errors,[]);
 console.log(`PASS: ${mounts} Unit 1 page mounts, conclusion layers hidden until reveal, no overflow, ordered-steps activity, ${shots} screenshots.`);
}finally{await b.close();}

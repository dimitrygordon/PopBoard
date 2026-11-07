import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/r2';fs.mkdirSync(out,{recursive:true});
const slides=JSON.parse(fs.readFileSync(new URL('../public/geometry/decks/u01-l03/deck.json',import.meta.url))).slides;
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const errors=[];let count=0;
try {
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  for(const kind of ['cover','worked-example','practice','common-mistake','exit-ticket']){
   const n=slides.findIndex(s=>s.geo.kind===kind)+1;
   await page.goto(`${base}/study-geometry-story.html?lesson=u01-l03&page=${n}`,{waitUntil:'networkidle0'});
   await page.waitForSelector('.gx-k-'+kind);
   if(kind==='worked-example'){
    await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');
    assert.equal(await page.$eval('.gx-prediction td',e=>e.textContent),'What comes next? Decide, then tap.');
    assert.equal(await page.$$eval('.gx-proof tbody tr',r=>r.length),2);
    const stacked=await page.$eval('.gx-figure-layout',e=>getComputedStyle(e).gridTemplateColumns.split(' ').length===1);
    assert.equal(stacked,size.width===390);
    assert.match(await page.$eval('.gx-proof .m',e=>getComputedStyle(e).fontFamily),/Literata/);
   }
   if(kind==='practice'){await page.click('.gx-actions button:nth-child(1)');await page.click('.gx-actions button:nth-child(2)');}
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${kind} overflow`);
   assert.equal(await page.$$eval('.gx-learner-text, .gx-proof',es=>es.some(e=>e.scrollWidth>e.clientWidth+1)),false,`${kind} text overflow`);
   await page.screenshot({path:`${out}/${size.width}x${size.height}-${kind}.png`,fullPage:true});count++;
  }
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto(`${base}/study-geometry-story.html?lesson=u01-l03&page=5`,{waitUntil:'networkidle0'});await page.click('.gx-actions button:nth-child(2)');
 assert.equal(await page.$eval('.gx-new-step',e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);console.log(`PASS: ${count} settled screenshots; figure layout, Literata math, no overflow, reduced motion, no errors.`);
} finally {await b.close();}

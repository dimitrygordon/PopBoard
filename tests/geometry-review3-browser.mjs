import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/r3';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
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
   const audit=await page.evaluate(()=>[...document.querySelectorAll('.item')].map((item,i)=>{
    const labels=[...item.querySelectorAll('svg text')];const rect=t=>t.getBoundingClientRect();const pairs=[];
    for(let a=0;a<labels.length;a++)for(let c=a+1;c<labels.length;c++){const x=rect(labels[a]),y=rect(labels[c]);if(x.left<y.right+2&&x.right+2>y.left&&x.top<y.bottom+2&&x.bottom+2>y.top)pairs.push([labels[a].textContent,labels[c].textContent]);}
    const strokes=[];
    for(const shape of item.querySelectorAll('svg path,svg circle')){const matrix=shape.getScreenCTM(),length=shape.getTotalLength();for(let n=0;n<=Math.ceil(length);n++){const p=shape.getPointAtLength(Math.min(n,length));strokes.push({x:matrix.a*p.x+matrix.c*p.y+matrix.e,y:matrix.b*p.x+matrix.d*p.y+matrix.f});}}
    const touches=labels.filter(t=>{const r=rect(t);return strokes.some(p=>p.x>r.left-1&&p.x<r.right+1&&p.y>r.top-1&&p.y<r.bottom+1);}).map(t=>t.textContent);
    const small=labels.filter(t=>{const m=t.getScreenCTM();return parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b)<15.9;}).map(t=>t.textContent);
    const bounds=labels.filter(t=>{const x=rect(t),y=rect(t.closest('svg'));return x.left<y.left-1||x.right>y.right+1||x.top<y.top-1||x.bottom>y.bottom+1;}).map(t=>t.textContent);
    return {item:i+1,pairs,bounds,touches,small};
   }));
   fs.writeFileSync(`${out}/${size.width}x${size.height}-form-${form}-audit.json`,JSON.stringify(audit,null,2));
   assert.deepEqual(audit.filter(a=>a.pairs.length||a.bounds.length||a.touches.length||a.small.length),[],`${form} labels`);
   await page.$eval('.item:last-child',e=>e.scrollIntoView({block:'start'}));
   assert.ok(Math.abs(await page.$eval('.item:last-child',e=>e.getBoundingClientRect().top))<2,'No blank above item 12');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'form overflow');
   await page.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12.png`});shots++;
   const item=await page.$('.item:last-child');await item.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12-full.png`});
  }
 }
 await page.setViewport({width:1440,height:900});
 await page.goto(`${base}/study-geometry-story.html?lesson=u01-l10&page=5`,{waitUntil:'networkidle0'});
 await page.click('.gx-actions button:nth-child(1)');await page.click('.gx-actions button:nth-child(2)');
 assert.equal(await page.$$eval('.gx-actions button',bs=>bs.every(b=>b.classList.contains('gx-used')&&getComputedStyle(b).opacity==='1'&&b.textContent.includes('✓'))),true);
 assert.deepEqual(errors,[]);console.log(`PASS: ${shots} review screenshots, all assessment label bounds/separation at three sizes, no blank before item 12, no placeholders/overflow, used reveal styles.`);
}finally{await b.close();}

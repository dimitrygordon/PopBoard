import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8772';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots/r4';fs.mkdirSync(out,{recursive:true});
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
const errors=[],metrics=[];let shots=0;
try{
 const page=await b.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(size);
  for(const [slug,n,label] of [['u01-l03',5,'1.3-worked'],['u04-l13',4,'4.13-worked'],['u04-l11',5,'4.11-we2']]){
   const data=await(await fetch(`${base}/geometry/decks/${slug}/deck.json`)).json();
   await page.goto(`${base}/study-geometry-story.html?lesson=${slug}&page=${n}`,{waitUntil:'networkidle0'});
   await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   assert.deepEqual(await page.$$eval('.gx-proof tbody tr',rs=>rs.map(r=>r.children[1].textContent)),data.slides[n-1].geo.steps.slice(0,2).map(r=>r.reason));
   if(slug!=='u04-l13'){
    const m=await page.$eval('.gx-figure-slot',e=>({column:e.getBoundingClientRect().width,svg:e.querySelector('svg').getBoundingClientRect().width,labels:[...e.querySelectorAll('text')].map(t=>{const m=t.getScreenCTM();return parseFloat(getComputedStyle(t).fontSize)*Math.hypot(m.a,m.b);}),attrs:[e.querySelector('svg').getAttribute('width'),e.querySelector('svg').getAttribute('height')]}));
    if(size.width===1440){assert.ok(m.column>=300);assert.ok(Math.min(...m.labels)>=16);}
    assert.ok(Math.abs(m.svg-m.column)<1);assert.deepEqual(m.attrs,[null,null]);metrics.push({viewport:size.width,label,...m});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label);
   assert.equal(await page.$$eval('.gx-learner-text,.gx-proof',es=>es.some(e=>e.scrollWidth>e.clientWidth+1)),false,label);
   await page.screenshot({path:`${out}/${size.width}x${size.height}-${label}.png`,fullPage:true});shots++;
  }
  for(const form of ['a','b']){
   await page.goto(`${base}/geometry/forms/unit04-${form}.html`,{waitUntil:'networkidle0'});
   const audit=await page.evaluate(auditFigures,'.item');fs.writeFileSync(`${out}/${size.width}x${size.height}-form-${form}-audit.json`,JSON.stringify(audit,null,2));
   assert.deepEqual(audit.filter(a=>a.pairs.length||a.bounds.length||a.touches.length||a.small.length),[],form+' labels');
   const proximity=await page.$eval('.item:last-child',item=>{const svg=item.querySelector('svg'),paths=svg.querySelectorAll('path'),texts=[...svg.querySelectorAll('text')],side=texts.find(t=>/^(OP|LM) =/.test(t.textContent)).getBoundingClientRect(),point=texts.find(t=>/^(Q1|N1)$/.test(t.textContent)).getBoundingClientRect();const distance=(r,p)=>Math.hypot(Math.max(r.left-p.x,0,p.x-r.right),Math.max(r.top-p.y,0,p.y-r.bottom));const position=(path,t)=>{const p=path.getPointAtLength(t),m=path.getScreenCTM();return{x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};};let gap=Infinity;for(let t=0;t<paths[2].getTotalLength();t++)gap=Math.min(gap,distance(side,position(paths[2],t)));return{sideLabelGap:gap,crossingLabelGap:distance(point,position(paths[3],paths[3].getTotalLength()))};});assert.ok(proximity.sideLabelGap<20,JSON.stringify(proximity));assert.ok(proximity.crossingLabelGap<25,JSON.stringify(proximity));metrics.push({viewport:size.width,form,...proximity});
   await page.$eval('.item:last-child',e=>e.scrollIntoView({block:'start'}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'form overflow');
   await page.screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12.png`});shots++;
   await(await page.$('.item:last-child')).screenshot({path:`${out}/${size.width}x${size.height}-form-${form}-item12-full.png`});
  }
 }
 // Audit supplied quiz/review figures too, not only the 24 printable form figures.
 for(const width of [500,300]){
  await page.evaluate(async width=>{const {bankFigure}=await import('/geometry/geo-u04-figures.js');const host=document.createElement('div');host.id='r4-bank-audit';host.style.cssText='position:absolute;left:0;top:0;background:white';for(const id of [...Array.from({length:10},(_,i)=>'4.9-'+(i+1)),...['11','13','14','15','16'].map(n=>'4.15-'+n)]){const e=document.createElement('div');e.className='r4-bank';e.style.width=width+'px';e.innerHTML=bankFigure(id);e.querySelectorAll('svg').forEach(s=>{s.style.width='100%';s.style.height='auto';});host.append(e);}document.body.append(host);},width);
  const audit=await page.evaluate(auditFigures,'.r4-bank');fs.writeFileSync(out+`/bank-${width}-audit.json`,JSON.stringify(audit,null,2));assert.deepEqual(audit.filter(a=>a.pairs.length||a.bounds.length||a.touches.length||a.small.length),[],'quiz/review labels');await page.$eval('#r4-bank-audit',e=>e.remove());
 }
 // A second Unit 4 figure verifies scaling independently of the SSA viewBox.
 await page.setViewport({width:1440,height:900});await page.goto(`${base}/study-geometry-story.html?lesson=u04-l01&page=4`,{waitUntil:'networkidle0'});
 const extra=await page.$$eval('.gx-figure-slot text',ts=>ts.map(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b)));assert.ok(Math.min(...extra)>=16);metrics.push({label:'4.1-worked',viewport:1440,labels:extra});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/verification.json',JSON.stringify({shots,metrics,errors},null,2));console.log(`PASS: ${shots} round-4 shots; verbatim reasons, uncapped figures and computed label sizes, assessment bbox/stroke separation, no overflow/errors.`);
}finally{await b.close();}

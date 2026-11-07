// Run after: python3 -m http.server 8768 --bind 127.0.0.1 (from public/).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import {DECKS} from '../public/geometry/geo-catalog.js';
const base=process.env.GEOMETRY_BASE||'http://127.0.0.1:8768';
const out=process.env.GEOMETRY_SHOTS||'/workspace/geometry-v2/template-screenshots';fs.mkdirSync(out,{recursive:true});
const deck=d=>JSON.parse(fs.readFileSync(new URL(`../public/geometry/decks/${d.slug}/deck.json`,import.meta.url),'utf8'));
const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
let pagesChecked=0,linksChecked=0;
try{
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/gx draw|geometry interactive|page mount/.test(m.text()))errors.push(m.text());});
 // Exercise every generated page through the actual renderer. Inject builder fields as traps.
 await page.goto(base+'/study-geometry-story.html?lesson=u01-l10&page=4',{waitUntil:'networkidle0'});
 const rendered=await page.evaluate(async base=>{
  const {mount}=await import(base+'/geometry/geo-page.js');const {DECKS}=await import(base+'/geometry/geo-catalog.js');
  const stage=document.createElement('div'),tools=document.createElement('div');stage.style.cssText='position:relative;width:960px;height:540px';document.body.append(stage,tools);
  let count=0;const links=new Set();
  for(const d of DECKS){const data=await (await fetch(`${base}/geometry/decks/${d.slug}/deck.json`)).json();
   for(const slide of data.slides){
    // Known builder fields must not enter the student DOM, even if accidentally supplied.
    slide.geo.builder_only='BUILDER_SENTINEL_731';slide.geo.builder='BUILDER_SENTINEL_731';slide.geo.answerKeyLayer='BUILDER_SENTINEL_731';
    const m=mount({stage,tools,slide,meta:d,reduce:true});
    if(stage.innerHTML.includes('BUILDER_SENTINEL_731'))throw new Error('builder layer rendered '+d.slug);
    if(/Original exact coordinate certificate|sqrt\(10\)|backend coordinate/i.test(stage.textContent+tools.textContent))throw new Error('builder certificate leaked '+d.slug);
    if(slide.geo.kind==='exit-ticket'&&stage.querySelector('ol li:last-child')?.textContent!=="What's confusing?")throw new Error('exit ending '+d.slug);
    if(['worked-example','practice','common-mistake'].includes(slide.geo.kind)&&!!stage.querySelector('.gx-figure-slot')!==!!(slide.geo.figure?.svg||slide.geo.figure?.src))throw new Error('figure visibility '+d.slug);
    if(stage.textContent.includes('Figure coming'))throw new Error('placeholder leaked '+d.slug);
    if(slide.geo.kind==='worked-example'){
     if(stage.querySelector('.gx-prediction td')?.textContent!=='What comes next? Decide, then tap.')throw new Error('missing prediction');
     const buttons=[...stage.querySelectorAll('button')];buttons.find(b=>b.textContent==='Next step').click();if(stage.querySelectorAll('tbody tr').length!==1)throw new Error('one-row reveal');
     buttons.find(b=>b.textContent==='Show all').click();if(stage.querySelectorAll('tbody tr').length!==slide.geo.steps.length)throw new Error('show all');if(stage.querySelector('.gx-prediction'))throw new Error('prediction after all');
     buttons.find(b=>b.textContent==='Back').click();if(stage.querySelectorAll('tbody tr').length!==slide.geo.steps.length-1)throw new Error('back');if(!stage.querySelector('.gx-prediction'))throw new Error('prediction after back');
    }
    if(slide.geo.kind==='common-mistake'){
     const correction=stage.querySelector('.gx-correction');if(!correction.hidden)throw new Error('correction starts visible');stage.querySelector('button').click();if(correction.hidden)throw new Error('correction reveal');
    }
    if(slide.geo.kind==='practice'){
     if(!stage.textContent.includes('Try it on paper first, then reveal.'))throw new Error('practice instruction');
     const buttons=[...stage.querySelectorAll('button')];if(!buttons[1].hidden)throw new Error('second reveal starts visible');
     buttons[0].click();if(stage.querySelector('.gx-solution').hidden||!stage.querySelector('.gx-second-check').hidden)throw new Error('first reveal');
     buttons[1].click();if(stage.querySelector('.gx-second-check').hidden)throw new Error('second reveal');
    }
    for(const a of stage.querySelectorAll('a[href]'))links.add(a.href);
    m?.destroy();count++;
   }
  }
  stage.remove();tools.remove();return {count,links:[...links]};
 },base);
 pagesChecked=rendered.count;
 const interactive=await page.evaluate(async base=>{
  const {GX}=await import(base+'/geometry/gx/u10.js');
  const g=new Proxy({}, {get:()=>()=>{}});
  const setup=name=>{
   const points=[];let message='',choose;
   const board={point(x,y){const p={x,y};points.push(p);return p;},draw(fn){board.redraw=()=>fn(g);board.redraw();},update(){board.redraw();}};
   const ui={read(s){message=s;},choice(label,options,value,fn){choose=fn;}};
   GX[name].mount(board,ui);return {points,board,get message(){return message;},choose:(m)=>choose(m)};
  };
  const ins=setup('inscribed'),[a,b,p]=ins.points;
  Object.assign(a,{x:1040,y:460});Object.assign(b,{x:700+340*Math.cos(179*Math.PI/180),y:460+340*Math.sin(179*Math.PI/180)});Object.assign(p,{x:700,y:120});ins.board.update();
  if(ins.message.includes('AB is a diameter'))throw new Error('E18 near diameter asserted exact');
  Object.assign(b,{x:360,y:460});ins.board.update();if(!ins.message.includes('AB is a diameter'))throw new Error('E18 exact diameter missing');
  const sec=setup('secant');Object.assign(sec.points[0],{x:1006,y:460});sec.board.update();if(!sec.message.includes('Outside:'))throw new Error('E19 r+6 not outside');
  sec.choose('on');const v=sec.points[0];if(Math.abs(Math.hypot(v.x-700,v.y-460)-300)>1e-8)throw new Error('E19 on mode not constrained');
  sec.choose('tangent');if(!sec.message.includes('Separate tangent construction'))throw new Error('E19 tangent mode missing');
  return 'E18 and E19 actual interactive modules passed exact/near boundary scenarios';
 },base);
 console.log(interactive);

 // Covers, decks, shared reader, generated links and art are all real local files, not soft-404s.
 const urls=new Set([base+'/study-geometry.html',base+'/study-geometry-story.html',base+'/fonts/literata.ttf',base+'/fonts/patrick-hand.woff2',base+'/fonts/cabin-sketch-bold.woff2',...rendered.links]);
 for(const d of DECKS){urls.add(base+`/geometry/decks/${d.slug}/deck.json`);urls.add(base+'/geometry/'+d.cover);}
 for(const url of urls){const r=await fetch(url);assert.equal(r.status,200,url);linksChecked++;}
 const d=DECKS.find(d=>d.slug==='u01-l10'),slides=deck(d).slides;
 for(const viewport of [{width:1440,height:900},{width:844,height:390},{width:390,height:844}]){
  await page.setViewport(viewport);
  for(const state of ['worked-example','common-mistake','practice','exit-ticket']){
   const n=slides.findIndex(s=>s.geo.kind===state)+1;
   await page.goto(`${base}/study-geometry-story.html?lesson=${d.slug}&page=${n}`,{waitUntil:'networkidle0'});
   await page.waitForSelector('.gx-lesson');
   if(state==='worked-example'){await page.click('.gx-actions button:nth-child(2)');await page.click('.gx-actions button:nth-child(2)');assert.equal(await page.$$eval('.gx-proof tbody tr',r=>r.length),2);}
   if(state==='practice'){await page.click('.gx-actions button:nth-child(1)');await page.click('.gx-actions button:nth-child(2)');}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,'horizontal overflow');
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));});
   await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-${state}.png`,fullPage:true});
  }
  // All 180 lesson routes at all requested widths, with cover citations and working navigation.
  for(const meta of DECKS){
   await page.goto(`${base}/study-geometry-story.html?lesson=${meta.slug}&page=1`,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('.gx-citation');assert.ok((await page.$eval('.gx-citation',e=>e.textContent)).includes('Jacobs'));
   await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-${meta.slug}-cover.png`,fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/verification.json`,JSON.stringify({pagesChecked,linksChecked,consoleErrors:errors,viewports:['1440x900','844x390','390x844'],states:['worked-example (2 rows)','common-mistake','practice (both reveals)','exit-ticket']},null,2));
 console.log(`PASS: ${pagesChecked} page mounts, ${linksChecked} links/assets, 552 screenshots, no builder DOM leaks or renderer errors.`);
} finally{await browser.close();}

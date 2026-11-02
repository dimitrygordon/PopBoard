// Leo's Module 1 Lesson 4 Study Question (mq01-40): scroll-drawn scene and graph, steps that unfold,
// a living spring you drag, and a graphite-scribble answer reveal. Adapted from Leo's prototype
// (/workspace/physics101/study-questions/m01/prototype) to mount inside the Study Questions page.
export function mount(root, opts = {}) {

const reduce=opts.reduce;const qs=new URLSearchParams();const $=(id)=>root.querySelector('#'+id);const rx=$('rx'),ry=$('ry'),rs=$('rs'),ansText=$('ansText');
// scroll-driven draw-in
const groups=[...root.querySelectorAll('.step')].map(sec=>{
  const key=sec.dataset.sketch; let svg=null,els=[];
  if(key==='scene') svg=sec.querySelector('svg.sketch');
  if(key==='graph'||key==='target') svg=root.querySelectorAll('svg.sketch')[1];
  if(svg){const root=key==='target'?svg.querySelector('#target'):key==='graph'?svg.querySelector('#graph'):svg;
    els=[...root.querySelectorAll('.draw,.pt')].filter(e=>!e.classList.contains('ghost')||1);
    els.forEach(e=>{if(e.tagName==='path'){const L=e.getTotalLength();e._L=L;e.style.strokeDasharray=L;e.style.strokeDashoffset=L;}});}
  return {sec,svg,els,key,root:svg&&(key==='target'?svg.querySelector('#target'):key==='graph'?svg.querySelector('#graph'):svg)};
});
function paint(g,p){const n=g.els.length;
  g.els.forEach((e,i)=>{const t=Math.min(1,Math.max(0,p*n-i*0.85));
    if(e.tagName==='path') e.style.strokeDashoffset=e._L*(1-t); else e.classList.toggle('on',t>0);});
  if(g.root) g.root.querySelectorAll('text').forEach(t=>t.style.opacity=p>.6?1:0);
  if(p>=1&&!g.sec.classList.contains('done')){g.sec.classList.add('done');opts.scratch&&opts.scratch(300);}}
function onScroll(){const vh=innerHeight;
  groups.forEach(g=>{const r=g.sec.getBoundingClientRect();
    let p=(vh*0.9-r.top)/(r.height*0.75+vh*0.25); p=Math.max(0,Math.min(1,p));
    if(reduce) p=1; if(!g.els.length&&p>.25) p=1; paint(g,p);});}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);
document.fonts.ready.then(onScroll);onScroll();
if(qs.get('scroll')) setTimeout(()=>{scrollTo(0,+qs.get('scroll'));onScroll();},50);

// interactive spring
const play=$('play'),NS='http://www.w3.org/2000/svg';
let seed=3;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};
function wob(pts,j){seed=11;let d=`M${pts[0][0]},${pts[0][1]}`;for(let i=1;i<pts.length;i++){const[a,b]=[pts[i-1],pts[i]];d+=` Q${(a[0]+b[0])/2+rnd()*j},${(a[1]+b[1])/2+rnd()*j} ${b[0]+rnd()*j},${b[1]+rnd()*j}`}return d}
function el(tag,a,parent=play){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);parent.appendChild(e);return e}
const CM=20,TOP=70,X=230;
[[[40,500],[330,500]],[[60,500],[60,TOP-20]],[[50,TOP-20],[X+30,TOP-20]],[[X,TOP-20],[X,TOP]]].forEach(p=>el('path',{d:wob(p,1.2),stroke:'#1F2F5C','stroke-width':4}));
el('path',{d:`M150,${TOP} h32 v${16*CM} h-32 Z`,stroke:'#1F2F5C','stroke-width':2.4});
for(let c=0;c<=16;c++){el('path',{d:`M182,${TOP+c*CM} h${c%2?-8:-14}`,stroke:'#1F2F5C','stroke-width':1.8});if(c%4==0){const t=el('text',{x:142,y:TOP+c*CM+6,'font-size':15,class:'lbl','text-anchor':'end'});t.textContent=c}}
const spring=el('path',{stroke:'#555','stroke-width':2.6}),up=el('path',{stroke:'#1F2F5C','stroke-width':4}),dn=el('path',{stroke:'#B5473A','stroke-width':4});
const mass=el('g',{id:'mass',tabindex:0,role:'slider','aria-label':'mass in grams','aria-valuemin':0,'aria-valuemax':40});
const box=el('rect',{x:X-28,width:56,height:46,rx:4,fill:'#C99A2E55',stroke:'#1F2F5C','stroke-width':3},mass);
const mt=el('text',{x:X,'text-anchor':'middle','font-size':17,class:'lbl'},mass);
const lu=el('text',{'font-size':16,fill:'#1F2F5C',class:'lbl'}),ld=el('text',{'font-size':16,fill:'#B5473A',class:'lbl'});
lu.innerHTML='F<tspan font-size="11" dy="5">spring</tspan><tspan dy="-5">, spring on mass</tspan>';ld.innerHTML='F<tspan font-size="11" dy="5">g</tspan><tspan dy="-5">, Earth on mass</tspan>';
let m=25;
function draw(){m=Math.round(m);const y=0.15*m+8.2,bot=TOP+y*CM,n=12,L=bot-TOP-20;let pts=[[X,TOP],[X,TOP+10]];
  for(let i=0;i<n;i++)pts.push([X+(i%2?-22:22),TOP+10+L*(i+.5)/n]);pts.push([X,bot-10],[X,bot]);
  spring.setAttribute('d',wob(pts,.8));box.setAttribute('y',bot);mt.setAttribute('y',bot+29);mt.textContent=Math.round(m)+' g';
  const c=bot+23,a=Math.max(0,m*2.6),ax=X+60;
  up.setAttribute('d',a<3?'':`M${ax},${c} V${c-a} m-9,14 l9,-14 l9,14`);dn.setAttribute('d',a<3?'':`M${ax},${c} V${c+a} m-9,-14 l9,14 l9,-14`);
  lu.setAttribute('x',ax+12);lu.setAttribute('y',c-a/2-6);ld.setAttribute('x',ax+12);ld.setAttribute('y',c+a/2+18);
  rx.textContent=Math.round(m);ry.textContent=(Math.round(y*10+1e-6)/10).toFixed(1);rs.textContent=(0.15*m).toFixed(1);mass.setAttribute('aria-valuenow',Math.round(m));}
draw();
let drag=false;
mass.addEventListener('pointerdown',e=>{drag=true;mass.setPointerCapture(e.pointerId);mass.style.cursor='grabbing'});
mass.addEventListener('pointermove',e=>{if(!drag)return;const pt=play.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const p=pt.matrixTransform(play.getScreenCTM().inverse());const y=(p.y-20-TOP)/CM;m=Math.max(0,Math.min(40,(y-8.2)/0.15));draw()});
mass.addEventListener('pointerup',()=>{drag=false;mass.style.cursor=''});
mass.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowRight')m=Math.min(40,m+1);else if(e.key==='ArrowUp'||e.key==='ArrowLeft')m=Math.max(0,m-1);else return;e.preventDefault();draw()});

// pencil-erase reveal
let d='M10,15';for(let i=0;i<22;i++)d+=` L${i%2?10:590},${15+i*4.7}`;
const sp=$('scribPath');sp.setAttribute('d',d);const SL=sp.getTotalLength();sp.style.strokeDasharray=SL;sp.style.strokeDashoffset=0;
const btn=$('reveal');let shown=false;
btn.onclick=()=>{opts.scratch&&opts.scratch(900);shown=!shown;btn.textContent=shown?'Hide answer':'Show answer';btn.setAttribute('aria-expanded',shown);ansText.setAttribute('aria-hidden',!shown);
  if(reduce){sp.style.strokeDashoffset=shown?SL:0;return}
  sp.animate([{strokeDashoffset:shown?0:SL},{strokeDashoffset:shown?-SL:0}],{duration:shown?1100:500,easing:'ease-in-out',fill:'forwards'});};
if(qs.get('answer'))btn.click();

}

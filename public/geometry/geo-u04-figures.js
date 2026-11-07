// Exact construction inputs stay in code. Only learner labels appear in the SVG.
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rad=d=>d*Math.PI/180;
const polar=(r,d)=>[r*Math.cos(rad(d)),r*Math.sin(rad(d))];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">${body}</svg>`;
function scene(points,draw,circles=[],centered=false,height=400,plotHeight=230,bottom=300) {
 const bounds=[...Object.values(points),...circles.flatMap(([p,r])=>[[p[0]-r,p[1]-r],[p[0]+r,p[1]+r]])];
 const xs=bounds.map(p=>p[0]),ys=bounds.map(p=>p[1]),lo=[Math.min(...xs),Math.min(...ys)],hi=[Math.max(...xs),Math.max(...ys)];
 const k=Math.min(470/(hi[0]-lo[0]||1),plotHeight/(hi[1]-lo[1]||1));
 const left=centered?(600-(hi[0]-lo[0])*k)/2:65;
 const at=p=>[left+(p[0]-lo[0])*k,bottom-(p[1]-lo[1])*k];let body='';const labels=[],strokes=[];
 const sample=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let i=0;i<=n;i++)strokes.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]);};
 const line=(a,b,dash=false)=>{a=at(a);b=at(b);sample(a,b);body+=`<path d="M${a}L${b}" fill="none" stroke="black" stroke-width="1.5"${dash?' stroke-dasharray="6 5"':''}/>`;};
 const text=(p,s,dx=0,dy=-12,widthHint=null)=>{const [x,y]=at(p);labels.push({x,y,s:String(s),dx,dy,widthHint});};
 const g={line,text,at,
  arrow(a,b){line(a,b);const aa=at(a),bb=at(b),d=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]),ux=(bb[0]-aa[0])/d,uy=(bb[1]-aa[1])/d;body+=`<path d="M${bb[0]-8*ux-4*uy},${bb[1]-8*uy+4*ux}L${bb}L${bb[0]-8*ux+4*uy},${bb[1]-8*uy-4*ux}" fill="none" stroke="black" stroke-width="1.5"/>`;},
  handle(p,name){const [x,y]=at(p);body+=`<circle cx="${x}" cy="${y}" r="9" fill="white" stroke="black" stroke-width="2" data-handle="${esc(name)}" tabindex="0" role="slider" aria-label="Drag ${esc(name)} horizontally"/>`;},
  circle(p,r){const [cx,cy]=at(p);for(let i=0;i<720;i++){const t=i*Math.PI/360;strokes.push([cx+r*k*Math.cos(t),cy+r*k*Math.sin(t)]);}body+=`<circle cx="${cx}" cy="${cy}" r="${r*k}" fill="none" stroke="black" stroke-width="1.2"/>`;},
  poly(names){const ps=names.map(n=>points[n]);ps.forEach((p,i)=>line(p,ps[(i+1)%ps.length]));},
  labels(names){names.forEach((n,i)=>text(points[n],n, i%2?-14:12, i%3?24:-12));},
  ticks(a,b,n=1){const aa=at(a),bb=at(b),d=Math.hypot(bb[0]-aa[0],bb[1]-aa[1]);for(let i=0;i<n;i++){const t=(i-(n-1)/2)*6;const x=(aa[0]+bb[0])/2+t*(bb[0]-aa[0])/d,y=(aa[1]+bb[1])/2+t*(bb[1]-aa[1])/d;const dx=5*(bb[1]-aa[1])/d,dy=-5*(bb[0]-aa[0])/d;sample([x-dx,y-dy],[x+dx,y+dy]);body+=`<path d="M${x-dx},${y-dy}L${x+dx},${y+dy}" stroke="black" stroke-width="1.5"/>`; }},
  angle(a,o,b,label=''){const aa=at(a),oo=at(o),bb=at(b),d1=Math.hypot(aa[0]-oo[0],aa[1]-oo[1]),d2=Math.hypot(bb[0]-oo[0],bb[1]-oo[1]);const p=[oo[0]+24*(aa[0]-oo[0])/d1,oo[1]+24*(aa[1]-oo[1])/d1],q=[oo[0]+24*(bb[0]-oo[0])/d2,oo[1]+24*(bb[1]-oo[1])/d2];for(let i=0;i<=30;i++){const t=i/30;strokes.push([(1-t)**2*p[0]+2*(1-t)*t*oo[0]+t*t*q[0],(1-t)**2*p[1]+2*(1-t)*t*oo[1]+t*t*q[1]]);}body+=`<path d="M${p}Q${oo} ${q}" fill="none" stroke="black" stroke-width="1.2"/>`;if(label)text(o,label,0,42);},
  dimension(a,b,label,offset=30){const aa=at(a),bb=at(b);const y=Math.max(aa[1],bb[1])+offset;sample([aa[0],y],[bb[0],y]);sample([aa[0],y-4],[aa[0],y+4]);sample([bb[0],y-4],[bb[0],y+4]);body+=`<path d="M${aa[0]},${y-4}V${y+4}M${aa[0]},${y}H${bb[0]}M${bb[0]},${y-4}V${y+4}" stroke="black" stroke-width="1"/>`;labels.push({x:(aa[0]+bb[0])/2,y:y+36,s:label,dx:0,dy:0,fixed:true});}
 };
 draw(g);
 // Place live labels in free space without changing the exact construction.
 const box=(label,x,y)=>{const width=label.widthHint||[...label.s].reduce((w,c)=>w+(/[il1 ]/.test(c)?.5:/[MW]/.test(c)?1:.7)*32,0);return {l:x-width/2-3,r:x+width/2+3,t:y-34,b:y+11};};
 const placed=labels.filter(l=>l.fixed).map(l=>box(l,l.x,l.y));
 for(const label of labels){
  let x=label.x+label.dx,y=label.y+label.dy;
  if(!label.fixed){
   const candidates=[[x,y]],theta=Math.atan2(label.dy||-1,label.dx);
   for(const radius of [24,40,60,84,112,145])for(const turn of [0,.25,-.25,.5,-.5,.75,-.75,1]){const angle=theta+turn*Math.PI;candidates.push([label.x+radius*Math.cos(angle),label.y+radius*Math.sin(angle)]);}
   const free=candidates.find(([cx,cy])=>{const b=box(label,cx,cy);return b.l>=8&&b.r<=592&&b.t>=8&&b.b<=height-8&&!placed.some(p=>b.l<p.r&&b.r>p.l&&b.t<p.b&&b.b>p.t)&&!strokes.some(([sx,sy])=>sx>b.l&&sx<b.r&&sy>b.t&&sy<b.b);});
   if(free)[x,y]=free;
   placed.push(box(label,x,y));
  }
  body+=`<text x="${x}" y="${y}" fill="black" text-anchor="middle" font-family="serif" font-size="32">${esc(label.s)}</text>`;
 }
 return svg(body);
}
export function correspondenceFigure(){
 const p={A:[0,0],B:[5,0],C:[1,2],E:[9,1],F:[9,6],D:[7,2]};
 return scene(p,g=>{g.poly(['A','B','C']);g.poly(['E','F','D']);g.labels(Object.keys(p));[['A','B','E','F'],['A','C','E','D'],['B','C','F','D']].forEach(([a,b,c,d],i)=>{g.ticks(p[a],p[b],i+1);g.ticks(p[c],p[d],i+1);});});
}
export function sssFigure(t=0,marked=true,draggable=false){
 const p={A:[-2,0],B:[2,0],C:[t,2.5],G:[t,-2.5]};
 return scene(p,g=>{g.line([-3,0],[Math.max(5,t+1),0],true);g.poly(['A','B','C']);g.poly(['A','B','G']);g.line(p.C,p.G,true);g.labels(Object.keys(p));if(draggable)g.handle(p.C,"C");if(marked){g.ticks(p.A,p.C);g.ticks(p.A,p.G);g.ticks(p.B,p.C,2);g.ticks(p.B,p.G,2);}});
}
export function ssaFigure(form='review'){
 const cfg={double:{names:['A','B','C1','C2'],p:[[0,0],[8,6],[6,0],[10,0]],len:[10,6,10]},review:{names:['A','B','C1','C2'],p:[[0,0],[4,3],[3,0],[5,0]],len:[5,3,5]},A:{names:['O','P','Q1','Q2'],p:[[0,0],[6,8],[2,0],[10,0]],len:[10,2,10]},B:{names:['L','M','N1','N2'],p:[[0,0],[8,15],[5,0],[11,0]],len:[17,5,11]}}[form];
 const [a,b,c,d]=cfg.p,r=dist(b,c),p=Object.fromEntries(cfg.names.map((n,i)=>[n,cfg.p[i]]));
 return scene(p,g=>{g.circle(b,r);g.arrow(a,[d[0]+2,0]);g.line(a,b);g.line(b,c);g.line(b,d);g.text(a,cfg.names[0],-40,0);g.text(b,cfg.names[1],0,-20);g.text(c,cfg.names[2],0,44);g.text(d,cfg.names[3],0,44);g.ticks(b,c);g.ticks(b,d);g.angle(b,a,d);const midpoint=[(a[0]+b[0])/2,b[1]/2],labelAt=g.at(midpoint);g.text(midpoint,`${cfg.names[0]}${cfg.names[1]} = ${cfg.len[0]}`,(form==='B'?195:185)-labelAt[0],360-labelAt[1],form==='B'?120:112);g.dimension(a,c,`${cfg.names[0]}${cfg.names[2]} = ${cfg.len[1]}`,92);g.dimension(a,d,`${cfg.names[0]}${cfg.names[3]} = ${cfg.len[2]}`,148);},[[b,r]],true,720,400,500).replace('viewBox="0 0 600 400"',form==='double'?'viewBox="0 40 600 740"':'viewBox="0 40 600 680"').replace('</svg>',form==='double'?'<text x="300" y="748" text-anchor="middle" font-family="serif" font-size="32">Scale factor 2; fitted drawing.</text></svg>':'</svg>');
}
export function ssaTangentFigure(){
 const p={A:[0,0],B:[4,3],C:[4,0]};
 return scene(p,g=>{g.circle(p.B,3);g.arrow(p.A,[8,0]);g.poly(['A','B','C']);g.labels(Object.keys(p));g.line([3.65,0],[3.65,.35]);g.line([3.65,.35],[4,.35]);g.text([2,1.5],'AB = 5',-90,0);g.text([4,1.5],'BC = 3',90,0);},[[p.B,3]],true);
}
function pair(names,base,third,labels=[],marks=[],angles=[]){
 const [n1,n2]=names,p={};const first=[[0,0],[base,0],third];first.forEach((q,i)=>p[n1[i]]=q);
 first.forEach(([x,y],i)=>p[n2[i]]=[base+8+y,2+x]);
 return scene(p,g=>{g.poly([...n1]);g.poly([...n2]);g.labels(Object.keys(p));labels.forEach(([a,b,s])=>g.text([(p[a][0]+p[b][0])/2,(p[a][1]+p[b][1])/2],s,0,-12));marks.forEach(([a,b,n])=>g.ticks(p[a],p[b],n));angles.forEach(([a,o,b])=>g.angle(p[a],p[o],p[b]));});
}
function sas(names,b,c,angle){
 const apex=polar(c,angle),[a,d]=names;
 return pair(names,b,apex,[[a[0],a[1],String(b)],[a[0],a[2],String(c)],[d[0],d[1],String(b)],[d[0],d[2],String(c)]],[[a[0],a[1],1],[d[0],d[1],1],[a[0],a[2],2],[d[0],d[2],2]],[[a[1],a[0],a[2]],[d[1],d[0],d[2]]]).replace('</svg>',`<text x="300" y="30" text-anchor="middle" font-family="serif" font-size="32">Included angles given: ${angle}°</text></svg>`);
}
function asa(names,base,a,b){const x=base*Math.tan(rad(b))/(Math.tan(rad(a))+Math.tan(rad(b))),h=x*Math.tan(rad(a));return pair(names,base,[x,h],[],[],names.flatMap(a=>[[a[2],a[0],a[1]],[a[0],a[1],a[2]]])).replace('</svg>',`<text x="300" y="30" text-anchor="middle" font-family="serif" font-size="32">Angles ${a}°, ${b}°; side ${base}</text></svg>`);}
function cross(names,a,b,tilt=55){
 const q=polar(b,tilt),p={[names[0]]:[0,0],[names[1]]:[-a,0],[names[2]]:[a,0],[names[3]]:q,[names[4]]:[-q[0],-q[1]]};
 return scene(p,g=>{g.line(p[names[1]],p[names[2]]);g.line(p[names[3]],p[names[4]]);g.labels(Object.keys(p));g.ticks(p[names[0]],p[names[1]]);g.ticks(p[names[0]],p[names[2]]);g.ticks(p[names[0]],p[names[3]],2);g.ticks(p[names[0]],p[names[4]],2);g.text(p[names[1]],String(a),0,42);g.text(p[names[3]],String(b),18,0);});
}
function iso(names,h,left,right,legs=true){const p={[names[0]]:[0,h],[names[1]]:[-1,0],[names[2]]:[1,0]};return scene(p,g=>{g.poly([...names]);g.labels([...names]);if(legs){g.ticks(p[names[0]],p[names[1]]);g.ticks(p[names[0]],p[names[2]]);}else {g.angle(p[names[0]],p[names[1]],p[names[2]]);g.angle(p[names[0]],p[names[2]],p[names[1]]);}if(legs){g.text(p[names[1]],`(${left})°`,50,76);g.text(p[names[2]],`(${right})°`,-50,76);}else{g.text([-.5,h/2],left,-90,0);g.text([.5,h/2],right,90,0);}},[],true);}
function kite(names){const p={[names[0]]:[0,5],[names[1]]:[-4,0],[names[2]]:[0,-6],[names[3]]:[4,0]};return scene(p,g=>{g.poly([...names]);g.labels([...names]);g.line(p[names[0]],p[names[2]],true);g.ticks(p[names[0]],p[names[1]]);g.ticks(p[names[0]],p[names[3]]);g.ticks(p[names[2]],p[names[1]],2);g.ticks(p[names[2]],p[names[3]],2);});}
function circles(names,sep,r1,r2=r1){const a=[0,0],b=[sep,0],x=(sep*sep+r1*r1-r2*r2)/(2*sep),h=Math.sqrt(Math.max(0,r1*r1-x*x)),p={[names[0]]:a,[names[1]]:b,[names[2]]:[x,h],[names[3]]:[x,-h]};return scene(p,g=>{g.circle(a,r1);g.circle(b,r2);g.line(a,b);g.labels(h>1e-8?Object.keys(p):names.slice(0,2).split(''));if(h>1e-8){g.line(a,p[names[2]]);g.line(b,p[names[2]]);g.line(a,p[names[3]]);g.line(b,p[names[3]]);}g.text([a[0],r1],`radius ${r1}`,0,-20);g.text([b[0],r2],`radius ${r2}`,0,-20);g.dimension(a,b,String(sep),130);},[[a,r1],[b,r2]]);}
export function bankFigure(id){
 const [bank,raw]=id.split('-'),n=+raw;
 if(bank==='4.15'){
  if(n===16)return ssaFigure();if(n===11)return kite('ABCD');if(n===13)return circles('DEFG',5,4,3);if(n===14)return circles('ABPQ',10,6);if(n===15)return circles('ABPQ',10,5);
  return null;
 }
 const f=bank==='A'?'A':bank==='B'?'B':'quiz';
 if(n===12)return ssaFigure(f==='quiz'?'review':f);
 const cfg={quiz:{names:['JKL','VUW'],base:6,third:[2,4],algebra:['NPO','ZXY',37,'4t + 5'],sas:['RST','XYZ',7,11,46],asa:['FGE','MNL',9,52,61],cross:['H','P','R','Q','S',6,10],cp:['UVW','KML'],iso:['DEF',46,'5z + 1','3z + 19'],con:['JLK',40/9,'6s - 7','4s + 9'],aaa:['CDB','STR',4,67,82],kite:'ACDB'},A:{names:['TUV','HJK'],base:7,third:[2,5],algebra:['LMN','CBA',57,'7a - 6'],sas:['HIJ','RST',8,13,37],asa:['VWU','FED',12,48,73],cross:['O','J','K','L','N',4,9],cp:['FGH','UTS'],iso:['PQR',34,'2e + 14','5e - 16'],con:['VXW',Math.sqrt(2112)/2,'3g + 4','g + 32'],aaa:['ABC','UVW',6,42,58],kite:'KLMN',circle:['EFGH',14,10]},B:{names:['WXY','QPR'],base:8,third:[3,6],algebra:['EGF','RPQ',71,'6b + 5'],sas:['KLM','VWZ',9,14,43],asa:['OPN','SRL',15,56,64],cross:['Z','A','C','B','D',7,12],cp:['JMN','VUW'],iso:['STU',41,'4f - 11','2f + 15'],con:['HIK',Math.sqrt(5920)/3,'5h - 8','2h + 43'],aaa:['DEF','LMN',8,36,63],kite:'RSTU',circle:['GHJK',18,12]}}[f];
 if(n===1)return pair(cfg.names,cfg.base,cfg.third);
 if(n===2){const [a,b,l,expr]=cfg.algebra;return pair([a,b],l,f==='quiz'?[12,16]:f==='A'?[18,24]:[23,30],[[a[0],a[1],expr],[b[0],b[1],String(l)]]);}
 if(n===3){const [a,b,l,m,d]=cfg.sas;return sas([a,b],l,m,d);}
 if(n===4){const [a,b,l,d,e]=cfg.asa;return asa([a,b],l,d,e);}
 if(n===5){const [o,a,b,c,d,x,y]=cfg.cross;return cross([o,a,b,c,d],x,y);}
 if(n===6){
  if(f==='quiz')return pair(['UWV','KLM'],35,[13,12],[['U','W','2r + 9'],['K','L','35']]);
  const names=f==='A'?['GHF','TSU']:['NJM','WVU'],angle=f==='A'?50:76,expr=f==='A'?'3c + 8':'5d - 9';
  const base=8,third=polar(7,angle),p={};[[0,0],[base,0],third].forEach((q,i)=>{p[names[0][i]]=q;p[names[1][i]]=[q[0]+12,q[1]];});
  return scene(p,g=>{names.forEach(a=>g.poly([...a]));g.labels(Object.keys(p));g.angle(p[names[0][1]],p[names[0][0]],p[names[0][2]],expr);g.angle(p[names[1][1]],p[names[1][0]],p[names[1][2]],`${angle}°`);});
 }
 if(n===7){const [names,d,a,b]=cfg.iso;return iso(names,Math.tan(rad(d)),a,b);}
 if(n===8){const [names,h,a,b]=cfg.con;return iso(names,h,a,b,false);}
 if(n===9){const [a,b,l,d,e]=cfg.aaa;const x=l*Math.tan(rad(e))/(Math.tan(rad(d))+Math.tan(rad(e))),h=x*Math.tan(rad(d));const p={[a[0]]:[0,0],[a[1]]:[l,0],[a[2]]:[x,h],[b[0]]:[l+5,0],[b[1]]:[l+5+2.5*l,0],[b[2]]:[l+5+2.5*x,2.5*h]};return scene(p,g=>{g.poly([...a]);g.poly([...b]);g.labels(Object.keys(p));g.dimension(p[a[0]],p[a[1]],String(l));g.dimension(p[b[0]],p[b[1]],String(l*2.5));}).replace('</svg>',`<text x="300" y="30" text-anchor="middle" font-family="serif" font-size="32">Given: ${d}°, ${e}°, ${180-d-e}°</text></svg>`);}
 if(n===10){if(f==='quiz'){const p={C:[0,0],D:[8,0],A:[3,4],B:[3,-4]};return scene(p,g=>{g.poly(['A','C','D']);g.poly(['B','C','D']);g.labels(Object.keys(p));g.ticks(p.C,p.A);g.ticks(p.C,p.B);g.angle(p.A,p.C,p.D);g.angle(p.B,p.C,p.D);});}return kite(cfg.kite);}
 if(n===11){const [names,l,r]=cfg.circle;
  const main=circles(names,l,r),thumb=circles(names,l,l/2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><svg width="600" height="400" viewBox="0 0 600 400">${main.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg><svg y="400" width="600" height="400" viewBox="0 0 600 400">${thumb.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg></svg>`;
 }
 return null;
}
export const figure=(svg,alt)=>svg?{svg,alt}:null;

export const radiusFigure=r=>circles('ABPQ',10,r);
export function isoscelesFigure(h,reflected=false,turned=false,draggable=false,anglesGiven=false,conclusions=false){
 const p={A:[0,h],B:[reflected?1:-1,0],C:[reflected?-1:1,0]};
 if(turned)Object.keys(p).forEach(n=>{p[n]=[-p[n][1],p[n][0]];});
 return scene(p,g=>{g.poly(['A','B','C']);g.labels(Object.keys(p));if(!anglesGiven||conclusions){g.ticks(p.A,p.B);g.ticks(p.A,p.C);}if(anglesGiven){g.angle(p.A,p.B,p.C);g.angle(p.A,p.C,p.B);}if(draggable)g.handle(p.A,'A');});
}

// Exact rigid frames. No interpolation or non-isometric scaling between frames.
export function motionFigure(step=0){
 const model=[[0,0],[5,0],[1,2]],p={D:[380,200],E:[530,200],F:[410,260]};
 model.forEach(([x,y],i)=>{p['ABC'[i]]=step===0?[140+30*y,130+30*x]:step===1?[380+30*y,200+30*x]:step===2?[380+30*x,200-30*y]:[380+30*x,200+30*y];});
 let body='';const line=(a,b,dash='')=>body+=`<path d="M${a}L${b}" fill="none" stroke="black" stroke-width="1.5" ${dash}/>`;
 for(const names of ['DEF','ABC']){[...names].forEach((n,i)=>line(p[n],p[names[(i+1)%3]],names==='DEF'?'stroke-dasharray="5 4"':''));[...names].forEach(n=>body+=`<text x="${p[n][0]}" y="${p[n][1]+(names==='DEF'?26:-12)}" fill="black" font-size="32" font-family="serif" text-anchor="middle">${n}</text>`);}
 return svg(body);
}
export function asaRaysFigure(d=[100,290],e=[480,290]){
 const dx=e[0]-d[0],dy=e[1]-d[1],length=Math.hypot(dx,dy),x=length*Math.tan(rad(60))/(Math.tan(rad(40))+Math.tan(rad(60))),h=x*Math.tan(rad(40));
 const f=[d[0]+(x*dx+h*dy)/length,d[1]+(x*dy-h*dx)/length];
 let body=`<path d="M${d}L${e}M${d}L${f}L${e}" fill="none" stroke="black" stroke-width="1.5"/>`;
 for(const [n,p] of [['D',d],['E',e],['F',f]]){body+=`<text x="${p[0]}" y="${p[1]+(n==='F'?-15:30)}" font-family="serif" font-size="32" text-anchor="middle">${n}</text>`;if(n!=='F')body+=`<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="white" stroke="black" data-handle="${n}" tabindex="0" role="button" aria-label="Drag ${n}"/>`;}
 return svg(body+`<text x="300" y="36" text-anchor="middle" font-family="serif" font-size="32">Fixed endpoint angles: D = 40°, E = 60°</text>`);
}

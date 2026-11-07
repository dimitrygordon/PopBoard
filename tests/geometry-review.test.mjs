import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GX} from '../public/geometry/gx/u10.js';
import * as M from '../public/geometry/geo-math.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const deck=id=>JSON.parse(read(`public/geometry/decks/${id}/deck.json`));
const setup=name=>{
 const points=[];let message='';const g=new Proxy({},{get:()=>()=>{}});
 const board={point(x,y){const p={x,y};points.push(p);return p;},draw(fn){board.redraw=()=>fn(g);board.redraw();},update(){board.redraw();}};
 GX[name].mount(board,{read(s){message=s;},choice(){}});
 return {points,board,get message(){return message;}};
};
test('R1 reflection incidence proof and R2 identity-dilation wording reach all learner copies',()=>{
 const a=JSON.stringify(deck('u04-l13'));
 for(const text of ['Reflection in AB fixes each center and circle','Thus PQ meets AB at M=N, between A and B','Ray PM is ray PQ'])assert.ok(a.includes(text));
 assert.ok(!a.includes('establish M lies between'));
 const b=JSON.stringify(deck('u08-l03'));
 assert.ok(b.includes('A line not through O maps onto itself when k = 1 and onto a distinct parallel line when k ≠ 1.'));
 assert.ok(b.includes('on the same supporting line if that line contains O; otherwise parallel'));
 assert.ok(b.includes('Postulate (assumed here, not proved by proportional sides)'));
});
test('R3 actual inscribed module selects the intercepted arc on both sides of both endpoints',()=>{
 const ins=setup('inscribed'),O={x:700,y:460};
 for(const offset of [-0.25,0.25,-1e-5,1e-5])for(const endpoint of [0,120]){
  const a=M.polar(O,340,0),b=M.polar(O,340,120),p=M.polar(O,340,endpoint+offset);
  [a,b,p].forEach((q,i)=>Object.assign(ins.points[i],q));ins.board.update();
  const values=[...ins.message.matchAll(/≈ ([0-9.]+)°/g)].map(m=>+m[1]);
  assert.equal(values.length,2,ins.message);assert.equal(values[0],values[1],ins.message);
  assert.ok(Math.abs(values[1]-M.angle(a,p,b))<0.51,ins.message);
 }
 Object.assign(ins.points[2],ins.points[0]);ins.board.update();assert.match(ins.message,/Undefined/);
});
test('R3 actual secant module rejects tangency and coincident supporting rays and marks rounding approximate',()=>{
 const sec=setup('secant'),O={x:700,y:460};
 Object.assign(sec.points[0],{x:1300,y:460});Object.assign(sec.points[1],M.polar(O,300,60));Object.assign(sec.points[2],M.polar(O,300,230));
 sec.board.update();assert.match(sec.message,/Undefined/);
 Object.assign(sec.points[0],{x:1006,y:460});Object.assign(sec.points[1],M.polar(O,300,120));sec.board.update();
 assert.match(sec.message,/Outside:/);assert.match(sec.message,/\) ≈/);
 Object.assign(sec.points[2],sec.points[1]);sec.board.update();assert.match(sec.message,/Undefined/);
});
test('R4 public citations distinguish corollaries, conventions and related scope',()=>{
 const a=deck('u10-l07').jacobs;assert.equal(a.section,'7.1; 12.2; 12.6');assert.equal(a.pages,'258 to 264; 491 to 496; 516 to 521');assert.equal(a.relationship,'derived corollary');
 const b=deck('u12-l12').jacobs;assert.equal(b.section,'15.2; 15.3; 15.4; 15.6');assert.equal(b.relationship,'related review scope');
 for(const id of ['u06-l01','u06-l06'])assert.equal(deck(id).jacobs.relationship,'adapted convention');
 assert.equal(deck('u09-l14').jacobs.pages,'475 to 480');
 assert.equal(deck('u06-l16').jacobs.relationship,'related review scope');
});
test('R5 historical Unit 4 documents use verified scalene coordinates',()=>{
 for(const name of ['LEO-DIAGRAMS-unit04','SPEC-unit04','UNIT04-FILL']){
  const s=read(`docs/geometry/v2/${name}.md`);assert.ok(s.includes('C=(1,2) and E=(9,1),F=(9,6),D=(7,2)'));assert.ok(!s.includes('C=(1,3) and E=(9,1),F=(9,6),D=(6,2)'));
 }
});

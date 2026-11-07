// Classification uses model precision, not a pixel or display-rounding tolerance.
export const relativeEqual = (a, b, scale = 1) => Math.abs(a-b) <= 1e-9 * Math.max(1, Math.abs(scale));
export const isDiameter = (arc) => relativeEqual(arc,180,360);
export const circleRegime = (distance,radius) => relativeEqual(distance,radius,radius) ? 'on' : distance<radius ? 'inside' : 'outside';
export const gcd = (a,b) => b ? gcd(b,a%b) : a;
export const starMax = (n) => Math.floor((n-1)/2);
export const starCycles = (n,k) => Number.isInteger(n) && Number.isInteger(k) && n>=3 && k>=1 && k<n/2 ? gcd(n,k) : null;

// Distinct forward circle hits which form real triangles, not just line roots.
export function rayTrianglePoints(A,B,r,through) {
 const dx=through.x-A.x,dy=through.y-A.y,length=Math.hypot(dx,dy);
 const scale=Math.max(1,Math.hypot(B.x-A.x,B.y-A.y),r);
 if(length<1e-10*scale||r<=0)return [];
 const ux=dx/length,uy=dy/length,bx=B.x-A.x,by=B.y-A.y;
 const along=bx*ux+by*uy,height=bx*uy-by*ux;
 if(Math.abs(height)<1e-10*scale)return [];
 const delta=r*r-height*height,tol=1e-12*scale*scale;
 if(delta < -tol)return [];
 const offset=Math.sqrt(Math.max(0,delta)),out=[];
 for(const t of [along-offset,along+offset]) {
  if(t<=1e-10*scale)continue;
  const q={x:A.x+t*ux,y:A.y+t*uy};
  if(!out.some(p=>Math.hypot(p.x-q.x,p.y-q.y)<1e-9*scale))out.push(q);
 }
 return out;
}


// Relative to side lengths, so validity does not depend on drawing scale or position.
export function isNondegenerateTriangle(A,B,C) {
 if(![A,B,C].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return false;
 const ab=Math.hypot(B.x-A.x,B.y-A.y),ac=Math.hypot(C.x-A.x,C.y-A.y),bc=Math.hypot(C.x-B.x,C.y-B.y),scale=Math.max(ab,ac,bc);
 return scale>0&&Math.min(ab,ac,bc)>1e-9*scale&&Math.abs((B.x-A.x)*(C.y-A.y)-(B.y-A.y)*(C.x-A.x))>1e-9*scale*scale;
}

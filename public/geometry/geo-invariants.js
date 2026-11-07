// Classification uses model precision, not a pixel or display-rounding tolerance.
export const relativeEqual = (a, b, scale = 1) => Math.abs(a-b) <= 1e-9 * Math.max(1, Math.abs(scale));
export const isDiameter = (arc) => relativeEqual(arc,180,360);
export const circleRegime = (distance,radius) => relativeEqual(distance,radius,radius) ? 'on' : distance<radius ? 'inside' : 'outside';
export const gcd = (a,b) => b ? gcd(b,a%b) : a;
export const starMax = (n) => Math.floor((n-1)/2);
export const starCycles = (n,k) => Number.isInteger(n) && Number.isInteger(k) && n>=3 && k>=1 && k<n/2 ? gcd(n,k) : null;

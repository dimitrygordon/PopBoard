import fs from 'node:fs';
const wiring=JSON.parse(fs.readFileSync(new URL('./u04-art-wiring.json',import.meta.url),'utf8'));
const figures=new Map(wiring.map(({deck,slide,file,alt})=>[`${deck}/${slide}`,{svg:fs.readFileSync(new URL(`../../public/geometry/figures/u04/${file}`,import.meta.url),'utf8'),alt}]));
export const unit04Figure=(lesson,slide,fallback)=>figures.get(`u04-l${String(lesson).padStart(2,'0')}/${slide}`)||fallback;

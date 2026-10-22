names=["pulley","spring","ramp","pendulum","rocket","magnet"]
tiles="".join(f'<div class="tile t-{n}">{open(n+".svg").read()}</div>' for n in names)
css='''
:root{--mp-loop:5s}
body{margin:0;width:1600px;height:400px;display:flex;align-items:center;justify-content:center;gap:28px;background:#d8b56a;
background-image:repeating-linear-gradient(90deg,rgba(120,80,20,.08) 0 3px,transparent 3px 7px)}
.tile{width:230px;height:230px}.tile svg{width:100%;height:100%;overflow:visible}
.tile g{transform-box:view-box}
.t-pulley #wheel{animation:rock calc(var(--mp-loop)/2) ease-in-out infinite}
.t-pulley #weightL{animation:bob calc(var(--mp-loop)/2) ease-in-out infinite}
.t-pulley #weightR{animation:bob calc(var(--mp-loop)/2) ease-in-out infinite reverse}
@keyframes rock{0%,100%{transform:rotate(-35deg)}50%{transform:rotate(35deg)}}
@keyframes bob{0%,100%{transform:translateY(-8px)}50%{transform:translateY(8px)}}
.t-spring #coils{animation:squash calc(var(--mp-loop)/5) ease-in-out infinite}
@keyframes squash{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.75)}}
.t-ramp #block{animation:slide calc(var(--mp-loop)/3) ease-in infinite}
@keyframes slide{0%{transform:translate(0,0)}80%{transform:translate(46px,32.4px)}100%{transform:translate(0,0)}}
.t-pendulum #bob{animation:swing calc(var(--mp-loop)/3) ease-in-out infinite}
@keyframes swing{0%,100%{transform:rotate(-25deg)}50%{transform:rotate(25deg)}}
.t-rocket #rocket,.t-rocket #flame{animation:hover calc(var(--mp-loop)/2) ease-in-out infinite}
@keyframes hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.t-rocket #flame-1{animation:fl .23s ease-in-out infinite alternate}
.t-rocket #flame-2{animation:fl .17s ease-in-out infinite alternate-reverse}
.t-rocket #flame-3{animation:fl .29s ease-in-out infinite alternate}
@keyframes fl{from{transform:scale(1,1)}to{transform:scale(.88,1.15)}}
.t-magnet #magnet{animation:wob calc(var(--mp-loop)/4) ease-in-out infinite}
@keyframes wob{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
'''
open("preview.html","w").write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{tiles}</body></html>')

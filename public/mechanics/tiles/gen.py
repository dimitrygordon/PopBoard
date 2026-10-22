import random
def torn(seed,x0,y0,x1,y1,amp=2.2,step=7):
    r=random.Random(seed);pts=[]
    def edge(ax,ay,bx,by):
        n=max(2,int(((bx-ax)**2+(by-ay)**2)**.5/step))
        for i in range(n):
            t=i/n;pts.append((ax+(bx-ax)*t+r.uniform(-amp,amp)*(ay!=by),ay+(by-ay)*t+r.uniform(-amp,amp)*(ax!=bx)))
    edge(x0,y0,x1,y0);edge(x1,y0,x1,y1);edge(x1,y1,x0,y1);edge(x0,y1,x0,y0)
    return "M"+" L".join(f"{x:.1f} {y:.1f}" for x,y in pts)+"Z"
def defs(p):
    return f'''<defs>
<filter id="{p}-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 -1.6 1.15" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge></filter>
<filter id="{p}-fuzz" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" result="d"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .15  0 0 0 0 .1  0 0 0 0 .05  0 0 0 1.4 -.8" result="w"/><feComposite in="w" in2="d" operator="in" result="wi"/><feMerge><feMergeNode in="d"/><feMergeNode in="wi"/></feMerge></filter>
<filter id="{p}-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.8" flood-color="#3a2410" flood-opacity=".35"/></filter>
<pattern id="{p}-corr" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#c9a777"/><path d="M0 0V5" stroke="#b8935f" stroke-width="1.6"/></pattern>
</defs>'''
def card(p,seed):
    tape=lambda x,y,a:f'<rect x="{x-15}" y="{y-6}" width="30" height="12" fill="#efe2bf" opacity=".85" transform="rotate({a} {x} {y})" filter="url(#{p}-grain)"/>'
    return f'''<g id="card">
<path d="{torn(seed,10,10,190,190)}" fill="#8a6a44" filter="url(#{p}-shadow)"/>
<path d="{torn(seed+1,13,13,187,187,1.8)}" fill="#c9a777" filter="url(#{p}-grain)"/>
<path d="{torn(seed+2,22,22,178,178,1.2,9)}" fill="none" stroke="#8a6a44" stroke-width="1.2" stroke-dasharray="4 3" opacity=".6"/>
{tape(22,22,-40)}{tape(178,22,40)}{tape(22,178,40)}{tape(178,178,-40)}
</g>'''
def svg(name,p,seed,body):
    s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">\n{defs(p)}\n{card(p,seed)}\n{body}\n</svg>\n'
    open(name,"w").write(s)
F=lambda p:f'filter="url(#{p}-fuzz)"'
S=lambda p:f'filter="url(#{p}-shadow)"'
def sack(p,id,x,y,pv):
    return f'''<g id="{id}" data-pivot="{pv}"><g {S(p)}><path d="M{x-4} {y+6} Q{x-22} {y+14} {x-19} {y+32} Q{x-17} {y+42} {x} {y+42} Q{x+17} {y+42} {x+19} {y+32} Q{x+22} {y+14} {x+4} {y+6} L{x+9} {y-2} L{x+3} {y+1} L{x} {y-3} L{x-3} {y+1} L{x-9} {y-2}Z" fill="#4f78a8" {F(p)}/>
<path d="M{x-17} {y+33} Q{x} {y+38} {x+17} {y+33}" fill="none" stroke="#dfe8f2" stroke-width="1" stroke-dasharray="2.5 2"/>
<path d="M{x-5} {y+5} Q{x} {y+8} {x+5} {y+5}" stroke="#b08a52" stroke-width="2.4" fill="none"/></g></g>'''
# pulley
p="mpPul"
holes="".join(f'<circle cx="{100+dx}" cy="{70+dy}" r="3.4" fill="#2c4a70"/>' for dx,dy in[(-6,-6),(6,-6),(-6,6),(6,6)])
svg("pulley.svg",p,11,f'''<path d="M88 30 L112 30 L106 46 L94 46Z" fill="url(#{p}-corr)" stroke="#8a6a44" stroke-width="1.5" {S(p)}/>
<g id="rope"><path d="M70 72 L70 120 M130 72 L130 120" stroke="#b08a52" stroke-width="3" stroke-linecap="round"/><path d="M70 72 L70 120 M130 72 L130 120" stroke="#7d5d33" stroke-width="3" stroke-dasharray="1.5 3" /><path d="M70 72 A30 30 0 0 1 130 72" fill="none" stroke="#b08a52" stroke-width="3"/></g>
<g id="wheel" data-pivot="100 70" data-transform-origin="100 70" style="transform-origin:100px 70px"><g {S(p)}><circle cx="100" cy="70" r="30" fill="#4f78a8" {F(p)}/><circle cx="100" cy="70" r="22" fill="#5b86b8" stroke="#3d6191" stroke-width="1.5"/>
<circle cx="100" cy="70" r="26" fill="none" stroke="#e8eef5" stroke-width="1.2" stroke-dasharray="3 2.5"/>{holes}
<path d="M94 64 L106 76 M106 64 L94 76" stroke="#d8c39a" stroke-width="1.6"/></g></g>
{sack(p,"weightL",70,118,"70 120")}{sack(p,"weightR",130,118,"130 120")}''')
# spring
p="mpSpr"
coils="".join(f'<g id="coil-{i+1}"><ellipse cx="100" cy="{150-i*11}" rx="36" ry="9" fill="none" stroke="#8a6a44" stroke-width="7"/><ellipse cx="100" cy="{150-i*11}" rx="36" ry="9" fill="none" stroke="#c9a777" stroke-width="4.5"/><ellipse cx="100" cy="{150-i*11}" rx="36" ry="9" fill="none" stroke="#b8935f" stroke-width="1" stroke-dasharray="1 1.5"/></g>' for i in range(8))
svg("spring.svg",p,22,f'''<g id="base"><path d="M54 152 L146 152 L150 166 L50 166Z" fill="#a8814f" stroke="#6e5232" stroke-width="1.5" {S(p)}/><path d="M56 159 H144" stroke="#e8dcc0" stroke-dasharray="3 2.5" stroke-width="1"/></g>
<g id="coils" data-pivot="100 158" style="transform-origin:100px 158px" {S(p)}>{coils}</g>''')
# ramp
p="mpRmp"
svg("ramp.svg",p,33,f'''<g id="ramp"><path d="M38 160 L38 70 L166 160Z" fill="url(#{p}-corr)" stroke="#8a6a44" stroke-width="2.5" stroke-linejoin="round" {S(p)}/>
<path d="M44 154 L44 84 L144 154Z" fill="none" stroke="#8a6a44" stroke-width="1" stroke-dasharray="3 3" opacity=".7"/>
<path d="M40 78 L50 72 L160 150 L150 157Z" fill="#6f6c68" {F(p)}/><path d="M40 78 L50 72 L160 150 L150 157Z" fill="none" stroke="#4a4744" stroke-width=".8"/></g>
<g id="block" data-pivot="68 82" data-slide="0.574 0.404" style="transform-origin:68px 82px"><g transform="rotate(35.1 68 82)" {S(p)}><rect x="48" y="56" width="42" height="28" rx="2" fill="#d9a865" stroke="#8c5e2e" stroke-width="1.5"/><path d="M51 63 Q69 60 87 64 M51 71 Q70 74 87 70 M52 78 Q69 80 86 78" stroke="#b07b40" stroke-width="1" fill="none"/></g></g>
<g id="arrowFriction" data-pivot="128 118"><g opacity=".92"><path d="M157 130 L119 103" stroke="#ef7d2a" stroke-width="6" stroke-linecap="round"/><path d="M113 111 L115 96 L129 99Z" fill="#ef7d2a" stroke="#ef7d2a" stroke-width="4" stroke-linejoin="round"/><path d="M153 126 L123 105" stroke="#ffc58a" stroke-width="1.4" stroke-dasharray="4 3"/></g></g>''')
# pendulum
p="mpPen"
teeth="".join(f'<circle cx="{100+22*__import__("math").cos(a*0.3927):.1f}" cy="{150+22*__import__("math").sin(a*0.3927):.1f}" r="3.2" fill="#9aa0a6"/>' for a in range(16))
svg("pendulum.svg",p,44,f'''<g id="pivot" data-pivot="100 40"><rect x="62" y="30" width="76" height="12" fill="#a8814f" stroke="#6e5232" stroke-width="1.5" {S(p)}/><circle cx="100" cy="40" r="5" fill="#4f78a8" stroke="#2c4a70"/></g>
<g id="bob" data-pivot="100 40" style="transform-origin:100px 40px"><path d="M100 40 Q102 90 100 130" stroke="#c0392b" stroke-width="3.2" fill="none"/><path d="M100 40 Q102 90 100 130" stroke="#7e1f16" stroke-width="3.2" stroke-dasharray="1.5 2.5" fill="none"/>
<g {S(p)}>{teeth}<circle cx="100" cy="150" r="22" fill="#b6bcc2" stroke="#6d7379" stroke-width="1.5"/><circle cx="100" cy="150" r="15" fill="#8d949b"/><path d="M90 143 Q100 136 110 143" stroke="#e6eaee" stroke-width="2" fill="none" opacity=".7"/></g></g>''')
# rocket
p="mpRkt"
fl=lambda i,c,d,o:f'<g id="flame-{i}" data-pivot="100 128" style="transform-origin:100px 128px"><path d="{d}" fill="{c}" opacity="{o}" {F(p)}/></g>'
svg("rocket.svg",p,55,f'''<g id="flame" data-pivot="100 128" style="transform-origin:100px 128px">
{fl(1,"#c8381e","M78 124 Q72 152 88 164 Q92 176 100 188 Q108 176 112 164 Q128 152 122 124Z",1)}
{fl(2,"#ef7d2a","M87 126 Q85 148 94 156 Q97 166 100 172 Q103 166 106 156 Q115 148 113 126Z",1)}
{fl(3,"#f6c445","M92 126 Q92 144 100 160 Q108 144 108 126Z",1)}</g>
<g id="rocket" data-pivot="100 90"><g {S(p)}><path d="M80 100 L62 128 L82 122Z M120 100 L138 128 L118 122Z" fill="#a8814f" stroke="#6e5232" stroke-width="1.5"/>
<path d="M100 28 Q122 54 120 126 L80 126 Q78 54 100 28Z" fill="url(#{p}-corr)" stroke="#8a6a44" stroke-width="2"/>
<path d="M100 36 Q116 58 115 120 L85 120 Q84 58 100 36Z" fill="none" stroke="#6e5232" stroke-width="1" stroke-dasharray="3 2.5"/>
<circle cx="100" cy="74" r="11" fill="#c9a777" stroke="#6e5232" stroke-width="2"/><circle cx="100" cy="74" r="7.5" fill="#4f78a8" {F(p)}/></g></g>''')
# magnet
p="mpMag"
svg("magnet.svg",p,66,f'''<g id="magnet" data-pivot="100 150" style="transform-origin:100px 150px"><g {S(p)}>
<path d="M52 150 L52 96 A48 48 0 0 1 148 96 L148 150 L120 150 L120 96 A20 20 0 0 0 80 96 L80 150Z" fill="#c4392d" stroke="#7e1f16" stroke-width="2" {F(p)}/>
<path d="M60 140 L60 96 A40 40 0 0 1 140 96 L140 140" fill="none" stroke="#f1d2c8" stroke-width="1.2" stroke-dasharray="3 2.5"/>
<rect x="52" y="140" width="28" height="22" fill="#b6bcc2" stroke="#6d7379" stroke-width="1.5"/><rect x="120" y="140" width="28" height="22" fill="#b6bcc2" stroke="#6d7379" stroke-width="1.5"/>
<path d="M56 146 H76 M124 146 H144" stroke="#eef1f3" stroke-width="2"/></g></g>''')

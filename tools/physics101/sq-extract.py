# Extract Study Questions from the Inspire Physics PDFs into structured items.
import fitz, re, json, os, glob, html, sys
SRC='/workspace/physics101/sq-src'; OUT='/workspace/physics101/sq/out'
os.makedirs(OUT+'/img-stems',exist_ok=True)
LABELS=['What we know / need to find','What we know','Physics idea','Work','Check','Claim','Evidence','Reasoning','Known','Unknown','Strategy','Solve','Answer']
LABRE=re.compile(r'^(Answer[^:]{0,40}|'+'|'.join(re.escape(l) for l in LABELS[:-1])+r'):\s*')
def is_math(s): return s['font'].startswith('Type3') or 'Math' in s['font']
def line_html(l, base):
    out=''
    for s in l['spans']:
        t=html.escape(s['text'])
        if not t: continue
        if s['size']<base*0.8 and s['origin'][1] < l['bbox'][3]-base*0.35: t='<sup>'+t+'</sup>'
        elif s['size']<base*0.8: t='<sub>'+t+'</sub>'
        out+=t
    return out
def near(prev, pi, l):
    # the next line of the same paragraph: just below on the same page, or at the top of the next page
    if prev[0]==pi: return -14<l['bbox'][1]-prev[1]<10
    return prev[0]==pi-1 and prev[1]>640 and l['bbox'][1]<100
def run(fn):
    kind,mod=os.path.basename(fn)[:-4].split('-',1)
    d=fitz.open(fn); items=[]; sec='opener'; cur=None; field='question'; n=0; tlast=None; lastl=None  # tlast: (page, y1) of the last heading line
    for pi,p in enumerate(d):
        blocks=p.get_text('dict')['blocks']
        for b in blocks:
            if b['type']==1:
                if cur is None: continue
                r=fitz.Rect(b['bbox'])
                if r.width<40 or r.height<30: continue
                n+=1; name=f'{kind}-{mod}-f{n}.png'
                p.get_pixmap(clip=r,dpi=150).save(OUT+'/img-stems/'+name)
                cur['parts'].append({'f':field,'fig':name,'w':round(r.width)}); continue
            for l in b['lines']:
                sp=[s for s in l['spans'] if s['text'].strip()]
                if not sp: continue
                txt=''.join(s['text'] for s in l['spans']).strip()
                s0=sp[0]
                if s0['size']<7 and 'page' in txt: continue
                mL=re.match(r'Lesson (\d+): ',txt)
                if 'Bold' in s0['font'] and ((mL and len(txt)<80 and s0['size']>=12.5) or (s0['size']>=14 and l['bbox'][0]<66)):
                    m=mL
                    sec=int(m.group(1)) if m else ('wrap' if re.search(r'Wrap|Review|Assessment|Test',txt) else 'opener' if pi<3 else sec)
                    cur=None; continue
                # a wrapped heading continues on contiguous lines that carry bold text, even when the line opens with a math span
                if tlast and cur is not None and near(tlast,pi,l) and l['bbox'][0]<200 and all('Bold' in s['font'] or is_math(s) for s in sp) and not LABRE.match(txt) and not (re.match(r'^\([a-z]\)\s',txt) and txt[:3] in cur['title']):
                    cur['title']+=' '+txt; tlast=(pi,l['bbox'][3]); continue
                # a bold line right under an unlabeled question stem is still that stem (the PDF wraps long stems)
                if lastl and cur is not None and near(lastl,pi,l) and cur['parts'] and all(pp['f']=='question' and 'h' in pp for pp in cur['parts']) and not LABRE.match(txt):
                    cur['parts'][-1]['h']+=' '+line_html(l,11.5); lastl=(pi,l['bbox'][3]); continue
                tlast=None
                if 'Bold' in s0['font'] and l['bbox'][0]<66 and not LABRE.match(txt):
                    if cur is not None and cur['parts'] and cur['parts'][-1]['f']=='title' : cur['title']+=' '+txt; tlast=(pi,l['bbox'][3]); continue
                    # '(a) Your mass' after a stem that already lists (a) is a worked sub-part, not more stem
                    if cur is not None and not any(pp['f']!='title' for pp in cur['parts']) and cur['title'] and not (re.match(r'^\([a-z]\)\s',txt) and txt[:3] in cur['title']): cur['title']+=' '+txt; tlast=(pi,l['bbox'][3]); continue
                    cur={'src':kind,'module':int(mod) if mod.isdigit() else mod,'section':sec,'title':re.sub(r'^Problem\s+','',txt),'page':pi+1,'parts':[]}
                    items.append(cur); field='question'; tlast=(pi,l['bbox'][3]); continue
                if cur is None: continue
                lastl=(pi,l['bbox'][3])
                base=11.5
                h=line_html(l,base)
                m=LABRE.match(txt) if 'Bold' in s0['font'] else None
                if m:
                    lab=m.group(1); field='answer' if lab.startswith('Answer') else lab.lower().split(' ')[0]
                    h=html.escape(txt[m.end():]) if not any(is_math(s) for s in sp) else line_html(l,base)[len(html.escape(m.group(0))):]
                    cur['parts'].append({'f':field,'label':lab,'h':h.strip()}); continue
                mathy=sum(len(s['text']) for s in sp if is_math(s))>0.6*len(txt) and l['bbox'][0]>140
                if mathy:
                    r=fitz.Rect(l['bbox']); r.x0-=2; r.x1+=2; r.y0-=3; r.y1+=3
                    lst=cur['parts'][-1] if cur['parts'] else None
                    if lst and lst.get('eq') and r.y0-lst['_y1']<10 and lst['_p']==pi:
                        lst['_r']=list(fitz.Rect(lst['_r'])|r); lst['_y1']=r.y1; continue
                    cur['parts'].append({'f':field,'eq':1,'_r':list(r),'_y1':r.y1,'_p':pi,'alt':txt}); continue
                lst=cur['parts'][-1] if cur['parts'] else None
                if lst and lst['f']==field and 'h' in lst: lst['h']+=' '+h
                else: cur['parts'].append({'f':field,'h':h})
    # render equations
    k=0
    for it in items:
        for pt in it['parts']:
            if pt.get('eq'):
                k+=1; name=f'{kind}-{mod}-e{k}.png'
                r=fitz.Rect(pt['_r']); pg=d[pt['_p']]
                pg.get_pixmap(clip=r,dpi=200,alpha=False).save(OUT+'/img-stems/'+name)
                pt.update({'eqimg':name,'w':round(r.width),'h_':round(r.height)})
                for z in ('_r','_y1','_p','eq'): pt.pop(z)
    return items
allit={}
for fn in sorted(glob.glob(SRC+'/*.pdf')):
    allit[os.path.basename(fn)[:-4]]=run(fn)
json.dump(allit,open(OUT+'/items.stems.json','w'),ensure_ascii=False,indent=0)
import collections
for k,v in allit.items():
    c=collections.Counter(str(i['section']) for i in v); na=sum(1 for i in v if not any(p['f']=='answer' for p in i['parts']))
    print(k,len(v),dict(c),'noans',na)

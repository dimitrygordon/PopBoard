import numpy as np, cv2, json
from PIL import Image
from scipy import ndimage as nd
src=np.array(Image.open('/workspace/pb/public/popboard-logo.png').convert('RGBA'))
H,W=src.shape[:2]
rgb=src[...,:3].astype(int); al=src[...,3]
dark=(rgb.sum(-1)<200)&(al>200)
parts={'eyeL':(1399,1686,993,1203),'eyeR':(1383,1670,1646,1856),
 'browL':(1214,1311,996,1151),'browR':(1197,1294,1692,1858),'mouth':(1647,1936,1223,1615)}
pad=14
masks={}
for k,(y0,y1,x0,x1) in parts.items():
  m=np.zeros((H,W),bool); r=slice(y0-pad,y1+pad),slice(x0-pad,x1+pad)
  sub=dark[r]; lab,_=nd.label(sub)
  # biggest component
  sizes=np.bincount(lab.ravel()); sizes[0]=0; comp=lab==sizes.argmax()
  comp=nd.binary_fill_holes(comp); comp=nd.binary_dilation(comp,iterations=5)
  m[r]=comp; masks[k]=(m,(y0-pad,y1+pad,x0-pad,x1+pad))
# tassel: gold pixels in left region + outline
ty0,ty1,tx0,tx1=640,1390,700,960
hsv=cv2.cvtColor(src[...,:3].copy(),cv2.COLOR_RGB2HSV)
gold=(hsv[...,0]>12)&(hsv[...,0]<32)&(hsv[...,1]>70)&(al>100)
g=np.zeros((H,W),bool); g[ty0:ty1,tx0:tx1]=gold[ty0:ty1,tx0:tx1]
lab,_=nd.label(g); sizes=np.bincount(lab.ravel()); sizes[0]=0
g=np.isin(lab,np.where(sizes>300)[0])
t=nd.binary_dilation(g,iterations=16)&(al>20)
t=nd.binary_fill_holes(t)
masks['tassel']=(t,(ty0,ty1,tx0,tx1))
meta={'W':W,'H':H,'parts':{}}
allm=np.zeros((H,W),bool)
for k,(m,(y0,y1,x0,x1)) in masks.items():
  crop=src[y0:y1,x0:x1].copy(); crop[...,3]=np.where(m[y0:y1,x0:x1],crop[...,3],0)
  Image.fromarray(crop).save(f'/workspace/tools/{k}.png')
  if k!='tassel': allm|=nd.binary_dilation(m,iterations=4)
  meta['parts'][k]=[x0,y0,x1-x0,y1-y0]
# base inpaint
mk=(allm*255).astype(np.uint8)
base=cv2.inpaint(np.ascontiguousarray(src[...,:3]),mk,9,cv2.INPAINT_TELEA)
a2=cv2.inpaint(np.ascontiguousarray(al),mk,9,cv2.INPAINT_TELEA)
out=np.dstack([base,a2])
tm=masks['tassel'][0]
out[tm]=[230,221,194,255]
out=out.astype(np.uint8)
small=lambda im,s: im
Image.fromarray(out).save('/workspace/tools/base.png')
D='/workspace/pb/public/login-alive/'
S=600/3000
Image.fromarray(out).resize((600,600),Image.LANCZOS).save(D+'base.png',optimize=True)
for k,(x,y,w,h) in meta['parts'].items():
  Image.open(f'/workspace/tools/{k}.png').resize((max(1,round(w*S)),max(1,round(h*S))),Image.LANCZOS).save(D+k+'.png',optimize=True)
json.dump(meta,open('/workspace/tools/meta.json','w'))
print(meta)

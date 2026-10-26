# 【代码讲解】旧版独立相册；本文件的参数可能不同于study-v3。
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import numpy as np
import skimage.data as sd
from pathlib import Path
OUT=Path(__file__).parent
# Built-in scikit-image demo photos, offline-friendly illustrative study assets.
root=Path(sd.__file__).parent
origins=[('Morning ritual',sd.coffee()),('Street in motion',np.array(Image.open(root/'motorcycle_left.png').convert('RGB'))),('Portrait session',sd.astronaut()),('Afternoon companion',sd.chelsea()),('Skyward',sd.rocket()),('City lights',sd.hubble_deep_field()),('Monochrome day',sd.camera()),('Night study',sd.moon())]
# 【代码讲解】循环处理每张素材，使用相同的生成或缩略图逻辑。
for g,(scene,arr) in enumerate(origins):
 im=Image.fromarray(arr).convert('RGB')
 # 【代码讲解】循环处理每张素材，使用相同的生成或缩略图逻辑。
 for variant in range(3):
  iw,ih=im.size
  # burst-like framing variants, all image-based, no remote requests
  if variant==0: factor=.90; dx=0;dy=0; bright=1.00;contrast=1.02
  elif variant==1:factor=.82;dx=.04;dy=-.025;bright=.94;contrast=1.06
  else:factor=.85;dx=-.036;dy=.038;bright=1.08;contrast=1.00
  cw, ch=int(iw*factor),int(ih*factor)
  x0=int((iw-cw)/2 + dx*iw);y0=int((ih-ch)/2+dy*ih)
  x0=max(0,min(iw-cw,x0));y0=max(0,min(ih-ch,y0))
  temp=im.crop((x0,y0,x0+cw,y0+ch))
  temp=ImageEnhance.Contrast(ImageEnhance.Brightness(temp).enhance(bright)).enhance(contrast)
  fitted=ImageOps.fit(temp,(840,1050),method=Image.Resampling.LANCZOS,centering=(.5,.47))
  name=f'{g*3+variant+1:02d}.jpg'
  fitted.save(OUT/'assets/photos'/name,quality=79,optimize=True,progressive=True)
  ImageOps.fit(fitted,(160,200),method=Image.Resampling.LANCZOS).save(OUT/'assets/thumbs'/name,quality=66,optimize=True)
print('created',len(list((OUT/'assets/photos').glob('*.jpg'))),'photos')

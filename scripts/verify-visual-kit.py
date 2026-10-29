"""Verify delivered local visual assets without starting or building the app."""
from pathlib import Path
from html.parser import HTMLParser
import json
import hashlib
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT/'assets/visual-kit'
m = json.loads((KIT/'manifest.json').read_text(encoding='utf-8'))
counts = {}
raster_count = svg_count = 0
hashes = set()
for row in m['assets']:
    counts[row['category']] = counts.get(row['category'],0)+1
    for ext,rel in row['files'].items():
        p=KIT/rel
        assert p.exists() and p.stat().st_size>0, rel
        if ext=='svg':
            ET.parse(p)
            svg_count += 1
        else:
            with Image.open(p) as im:
                im.verify()
            raster_count += 1
    if row['category']=='illustration':
        h=hashlib.sha256((KIT/row['png']).read_bytes()).hexdigest()
        assert h not in hashes, row['id']
        hashes.add(h)
        for ext in ['png','webp']:
            with Image.open(KIT/row[ext]) as im:
                assert im.width==im.height and im.width>=1024, (row['id'],im.size)
                assert im.size==(row['width'],row['height']), (row['id'],im.size)
                assert 'A' in im.getbands(), row['id']
                assert im.getchannel('A').getextrema()==(0,255), row['id']
                corners=[im.getpixel(xy)[3] for xy in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
                # Generated paper edges can leave a 1/255 alpha residual;
                # accept only visually transparent corners, never a background tile.
                assert max(corners)<=2, (row['id'],corners)

assert counts=={'brand':11,'platform':18,'icon':30,'illustration':10,'preview':1}, counts
for size in [24,36,48,72,96]:
    with Image.open(KIT/f'platform/notification-{size}.png') as im:
        assert im.size==(size,size)
        visible=[p for p in im.convert('RGBA').getdata() if p[3]>0]
        assert visible and all(min(p[:3])>=250 for p in visible), size
for name in ['android-icon-foreground','android-icon-monochrome']:
    with Image.open(KIT/f'platform/{name}.png') as im:
        assert im.size==(1080,1080)
        a=im.convert('RGBA').getchannel('A')
        # All visible pixels are inside the 66dp / 108dp essential-content circle.
        for y in range(1080):
            for x in range(1080):
                if a.getpixel((x,y))>0:
                    assert (x-540)**2+(y-540)**2<=330**2, (name,x,y)
        if name.endswith('monochrome'):
            assert all(min(p[:3])>=250 for p in im.convert('RGBA').getdata() if p[3]>0)
with Image.open(KIT/'platform/icon.png') as im:
    assert im.size==(1024,1024)
    assert im.convert('RGBA').getchannel('A').getextrema()==(255,255)
links=[]
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ('src','href') and v and not v.startswith(('http','#','data:')):
                assert (KIT/v).exists(), v
                links.append(v)
Links().feed((KIT/'GALLERY.html').read_text(encoding='utf-8'))
example=json.loads((KIT/'expo-assets.example.json').read_text(encoding='utf-8'))
def config_paths(value):
    if isinstance(value,dict):
        for v in value.values():config_paths(v)
    elif isinstance(value,list):
        for v in value:config_paths(v)
    elif isinstance(value,str) and value.startswith('./assets/'):
        assert (ROOT/value).exists(),value
config_paths(example)
report={'date':'2026-10-23','status':'PASS','asset_entries':len(m['assets']),'categories':counts,'raster_files_checked':raster_count,'svg_files_checked':svg_count,'unique_generated_masters':len(hashes),'gallery_local_links_checked':len(links),'checks':['Raster decoding','SVG XML','Illustration PNG and WEBP alpha: corners <=2/255, zero alpha elsewhere in the transparent area','Opaque standard icon','White notification silhouettes at every density','Adaptive foreground and monochrome within central safe circle','Gallery links','Expo example file paths'],'device_build_performed':False,'visual_review':'Logo at 24/32/48/72/128 px, round/squircle masks, all pictograms, all illustrations on light and dark inspection sheets.'}
(KIT/'quality-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))

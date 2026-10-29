"""Build project-native vector assets and export generated illustrations.

No app configuration or existing assets are changed. SVG rasterisation uses
PyMuPDF; Pillow only encodes exports and builds inspection/contact sheets.
Image generation itself is performed with the built-in image_gen tool.
"""
from pathlib import Path
from html import escape
from io import BytesIO
import json
import hashlib
import re
import shutil
import xml.etree.ElementTree as ET
import fitz
from PIL import Image, ImageDraw, ImageFont, ImageOps
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'visual-kit'
(OUT / 'previews').mkdir(parents=True, exist_ok=True)
PAPER, INK, GREEN, MINT = '#F6F1E6', '#14232B', '#1F8F74', '#3FBF9C'
DARK = '#0F1D26'
FONT = ROOT / 'node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'
tt = TTFont(FONT)
glyphs, cmap = tt.getGlyphSet(), tt.getBestCmap()
units = tt['head'].unitsPerEm
assets = []


def write(path, text):
    dest = OUT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text, encoding='utf-8')
    return dest


def svg(w, h, content):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{content}</svg>'


def mark(x, y, side, color=INK, dot=GREEN):
    # A square ledger with three rules and a paid dot; derived from gen-assets.py.
    # All marks use the same master geometry, including monochrome exports.
    s = side / 100
    return f'''<g transform="translate({x} {y}) scale({s})"><rect x="4" y="4" width="92" height="92" rx="10" fill="none" stroke="{color}" stroke-width="7"/><path d="M24 32H76M24 52H76M24 72H54" fill="none" stroke="{color}" stroke-width="7" stroke-linecap="round"/><circle cx="76" cy="72" r="6.5" fill="{dot}"/></g>'''


def outlined_text(text, x, baseline, size, color):
    pen_x, parts = 0, []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        commands = pen.getCommands()
        if commands:
            parts.append(f'<path d="{commands}" transform="translate({pen_x} 0)"/>')
        pen_x += tt['hmtx'][name][0]
    scale = size / units
    return f'<g fill="{color}" transform="translate({x} {baseline}) scale({scale} {-scale})">'+''.join(parts)+'</g>', pen_x*scale


def render(source, target, width=None):
    doc = fitz.open(stream=source.encode('utf-8'), filetype='svg')
    pdf = fitz.open(stream=doc.convert_to_pdf(), filetype='pdf')
    page = pdf[0]
    zoom = width/page.rect.width if width else 1
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
    dest = OUT / target
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(dest))
    return dest


def vector(name, w, h, content, category='brand', png_width=None):
    source = svg(w,h,content)
    write(name+'.svg',source)
    render(source,name+'.png',png_width)
    assets.append({'id':Path(name).name,'category':category,'svg':name+'.svg','png':name+'.png','origin':'native SVG geometry / outlined Manrope'})


def platform(name, size, fg=None, bg=None, ratio=.22, dot=None):
    content = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ''
    if fg:
        pad = size*ratio
        content += mark(pad,pad,size-2*pad,fg,dot or fg)
    source = svg(size,size,content)
    write('platform/sources/'+name+'.svg',source)
    render(source,'platform/'+name+'.png')
    assets.append({'id':name,'category':'platform','png':'platform/'+name+'.png','svg':'platform/sources/'+name+'.svg','width':size,'height':size,'origin':'native SVG'})


# 1. Brand masters and outlined wordmarks.
for tone,col,dot in [('ink',INK,GREEN),('green',GREEN,GREEN),('paper',PAPER,MINT),('white','#FFFFFF','#FFFFFF'),('black','#000000','#000000')]:
    vector('brand/mark-'+tone,256,256,mark(20,20,216,col,dot))
for tone,col,dot in [('light',INK,GREEN),('dark',PAPER,MINT)]:
    text,tw = outlined_text('Monthly Ledger',236,145,80,col)
    vector('brand/logo-horizontal-'+tone,round(tw+276),220,mark(24,26,168,col,dot)+text)
    t1,w1 = outlined_text('Monthly',0,0,62,col)
    t2,w2 = outlined_text('Ledger',0,0,62,col)
    content = mark(152,20,216,col,dot)
    a,_ = outlined_text('Monthly',(520-w1)/2,322,62,col)
    b,_ = outlined_text('Ledger',(520-w2)/2,398,62,col)
    vector('brand/logo-stacked-'+tone,520,440,content+a+b)
    text,tw = outlined_text('Monthly Ledger',20,112,82,col)
    vector('brand/wordmark-'+tone,round(tw+40),150,text)

# 2. Launcher, Android adaptive layers, splash and notifications.
platform('icon',1024,PAPER,DARK,.21,MINT)
platform('android-icon-foreground',1080,PAPER,None,.30,MINT)
platform('android-icon-background',1080,None,DARK)
platform('android-icon-monochrome',1080,'#FFFFFF',None,.30)
platform('splash-light',512,INK,None,.16,GREEN)
platform('splash-dark',512,PAPER,None,.16,MINT)
for size in [24,36,48,72,96]:
    platform(f'notification-{size}',size,'#FFFFFF',None,.10)
for size in [64,128,256,512]:
    platform(f'avatar-{size}',size,PAPER,DARK,.21,MINT)
for size in [16,32,48]:
    platform(f'favicon-{size}',size,PAPER,DARK,.18,MINT)
with Image.open(OUT/'platform/favicon-48.png') as im:
    im.save(OUT/'platform/favicon.ico',sizes=[(16,16),(32,32),(48,48)])

# 3. Native vector pictograms. currentColor sources, explicit ink raster previews.
SHAPES = {
 'subscription':'<path d="M19 8a7 7 0 0 0-12-3L4 8m0-5v5h5M5 16a7 7 0 0 0 12 3l3-3m0 5v-5h-5"/>',
 'loan':'<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 9v6m12-6v6"/>',
 'housing':'<path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-7h6v7"/>',
 'utility':'<path d="m13 2-8 12h6l-1 8 9-13h-6z"/>',
 'insurance':'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
 'savings':'<path d="M5 19c0-10 6-14 15-14 0 9-4 15-13 15M5 21l10-10"/>',
 'other':'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="16" cy="12" r=".7"/>',
 'streaming':'<rect x="3" y="4" width="18" height="13" rx="3"/><path d="m10 8 5 3-5 3zM8 21h8m-4-4v4"/>',
 'software':'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m9 8-4 4 4 4m6-8 4 4-4 4m-2-9-2 10"/>',
 'phone-internet':'<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M10 5h4m-4 14h4"/>',
 'transport':'<path d="m5 8 2-4h10l2 4m-15 2h16v8H4zm3 8v3m10-3v3"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
 'health':'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
 'month':'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 4h3"/>',
 'items':'<rect x="5" y="3" width="16" height="17" rx="2"/><path d="M2 7v15h15M9 8h8m-8 4h8m-8 4h5"/>',
 'upcoming':'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 'statistics':'<path d="M3 3v18h18M7 17v-5m5 5V7m5 10V4"/>',
 'add':'<circle cx="12" cy="12" r="9"/><path d="M12 7v10m-5-5h10"/>',
 'paid':'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
 'due':'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3v.5"/>',
 'overdue':'<path d="m12 3 10 18H2zM12 9v5m0 3v.5"/>',
 'autopay':'<path d="M19 8a8 8 0 0 0-13-3L3 8m0-5v5h5M5 16a8 8 0 0 0 13 3l3-3m0 5v-5h-5"/><path d="m9 12 2 2 4-4"/>',
 'archive':'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8m-10 4h6"/>',
 'backup':'<path d="M4 14v6h16v-6M12 17V3m-5 5 5-5 5 5"/>',
 'restore':'<path d="M4 14v6h16v-6M12 3v14m-5-5 5 5 5-5"/>',
}
groups = {
 'kinds':{'subscription':'subscription','loan':'loan','housing':'housing','utility':'utility','insurance':'insurance','savings':'savings','other':'other'},
 'categories':{'streaming':'streaming','software':'software','phone-internet':'phone-internet','home':'housing','utilities':'utility','insurance':'insurance','transport':'transport','health':'health','loans':'loan','savings':'savings','other':'other'},
 'tabs':{k:k for k in ['month','items','upcoming','statistics']},
 'actions':{k:k for k in ['add','paid','due','overdue','autopay','archive','backup','restore']},
}
for group,mapping in groups.items():
    for name,key in mapping.items():
        shape = SHAPES[key]
        body = '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+shape+'</g>'
        source = svg(24,24,body)
        path = f'icons/{group}/{name}'
        write(path+'.svg',source)
        # Explicit fixed ink only in the companion preview; SVG remains tintable.
        render(source.replace('currentColor',INK),path+'.png',96)
        assets.append({'id':group+'/'+name,'category':'icon','svg':path+'.svg','png':path+'.png','origin':'native SVG','grid':24})

# 4. Copy original generated illustrations; export alpha-preserving WEBP.
briefs = OUT/'illustration-briefs.json'
illustrations = json.loads(briefs.read_text(encoding='utf-8'))['images'] if briefs.exists() else []
for row in illustrations:
    stem = 'illustrations/'+row['id']
    master = OUT/(stem+'.png')
    if not master.exists():
        master.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(row['source'],master)
    with Image.open(master) as im:
        im.verify()
    with Image.open(master) as im:
        assert 'A' in im.getbands(), f"Alpha missing: {master}"
        rgba = im.convert('RGBA')
        alpha = rgba.getchannel('A')
        assert alpha.getextrema()[0] == 0, f"Opaque background: {master}"
        rgba.save(OUT/(stem+'.webp'),quality=88,method=6)
        row.update(width=im.width,height=im.height,alpha=True)
    row.update(category='illustration',png=stem+'.png',webp=stem+'.webp',origin='built-in image_gen')
    assets.append(row)

# 5. Inspection sheets: thumbnails only, original generated imagery unretouched.
PREVIEW_FONT = ImageFont.truetype(str(FONT),19)
def open_rgba(path):
    with Image.open(OUT/path) as im:
        return im.convert('RGBA')

for bgname,bg in [('light',PAPER),('dark',DARK)]:
    n = len(illustrations)
    if not n:
        continue
    sheet = Image.new('RGBA',(1200,((n+3)//4)*340),bg)
    draw = ImageDraw.Draw(sheet)
    for i,row in enumerate(illustrations):
        tile = ImageOps.contain(open_rgba(row['png']),(280,280),Image.Resampling.LANCZOS)
        x,y = (i%4)*300,(i//4)*340
        sheet.alpha_composite(tile,(x+(300-tile.width)//2,y+(280-tile.height)//2))
        draw.text((x+12,y+294),row['id'],font=PREVIEW_FONT,fill=INK if bgname=='light' else PAPER)
    sheet.convert('RGB').save(OUT/f'previews/illustrations-{bgname}.jpg',quality=90)

# Small-size icon and safe-mask inspection.
sheet = Image.new('RGBA',(1200,520),PAPER)
draw = ImageDraw.Draw(sheet)
draw.text((32,20),'Monthly Ledger / identity & Android masks',font=ImageFont.truetype(str(FONT),28),fill=INK)
for i,name in enumerate(['logo-horizontal-light','logo-horizontal-dark']):
    card = Image.new('RGBA',(560,160),PAPER if i==0 else DARK)
    im=ImageOps.contain(open_rgba('brand/'+name+'.png'),(520,120))
    card.alpha_composite(im,((560-im.width)//2,(160-im.height)//2))
    sheet.alpha_composite(card,(30+i*580,78))
for i,size in enumerate([24,32,48,72,128]):
    im=ImageOps.contain(open_rgba('platform/icon.png'),(size,size))
    sheet.alpha_composite(im,(40+i*145,300))
    draw.text((40+i*145,450),str(size)+'px',font=PREVIEW_FONT,fill=INK)
fg = open_rgba('platform/android-icon-foreground.png')
bg = open_rgba('platform/android-icon-background.png')
bg.alpha_composite(fg)
for j,shape in enumerate(['circle','squircle']):
    im=bg.resize((160,160),Image.Resampling.LANCZOS)
    mask=Image.new('L',(160,160),0)
    md=ImageDraw.Draw(mask)
    if shape=='circle': md.ellipse((0,0,159,159),fill=255)
    else: md.rounded_rectangle((0,0,159,159),radius=38,fill=255)
    im.putalpha(mask)
    sheet.alpha_composite(im,(820+j*185,280))
    draw.text((820+j*185,450),shape,font=PREVIEW_FONT,fill=INK)
sheet.convert('RGB').save(OUT/'previews/identity.jpg',quality=92)

# Icon contact sheet.
icons = [a for a in assets if a['category']=='icon']
sheet = Image.new('RGB',(1200,((len(icons)+7)//8)*150),PAPER)
draw = ImageDraw.Draw(sheet)
font_small=ImageFont.truetype(str(FONT),13)
for i,a in enumerate(icons):
    im=open_rgba(a['png'])
    x,y=(i%8)*150,(i//8)*150
    sheet.paste(im,(x+27,y+8),im)
    draw.text((x+7,y+110),a['id'].split('/')[-1],font=font_small,fill=INK)
sheet.save(OUT/'previews/icons.jpg',quality=92)

# Documentation cover assembled from native logo, not a claimed app screenshot.
content=f'<rect width="1600" height="900" fill="{PAPER}"/>'
content+=f'<rect x="1120" width="480" height="900" fill="{DARK}"/>'
content+=mark(90,135,220,INK,GREEN)
t,_=outlined_text('Monthly Ledger',90,505,105,INK)
content+=t
for y,width,color in [(610,730,GREEN),(665,550,'#D9F0E8'),(720,370,'#E3DCCB')]:
    content+=f'<rect x="90" y="{y}" width="{width}" height="20" rx="10" fill="{color}"/>'
content+=mark(1200,290,320,PAPER,MINT)
vector('previews/project-cover',1600,900,content,'preview')

# Manifest: every path is project-local; source provenance kept separately.
for a in assets:
    a['files']={k:a[k] for k in ['svg','png','webp'] if k in a}
    a['bytes']={k:(OUT/v).stat().st_size for k,v in a['files'].items()}
manifest={'project':'Monthly Ledger','created':'2026-10-23','tooling':{'illustrations':'built-in image_gen','identity_icons':'native SVG / outlined Manrope','exports':'PyMuPDF + Pillow'},'assets':assets}
write('manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

# Self-contained local catalogue, no network, no JS dependency.
cards=[]
for a in assets:
    image=a.get('webp',a.get('png'))
    links=' '.join(f'<a href="{escape(v)}">{k.upper()}</a>' for k,v in a['files'].items())
    desc=a.get('title',a['id'])
    alt=a.get('alt',a['id'])
    dark=' dark-card' if a['id'].endswith(('dark','paper','white','monochrome','foreground')) or a['id'].startswith('notification') else (' light-card' if a['category']=='brand' else '')
    details=f'<details><summary>Description and prompt</summary><p>{escape(alt)}</p><pre>{escape(a.get("prompt","Native vector source, not AI-generated."))}</pre></details>'
    cards.append(f'<article data-category="{a["category"]}"><div class="art{dark}"><img src="{escape(image)}" alt="{escape(alt)}" loading="lazy"></div><div class="copy"><small>{a["category"]}</small><h2>{escape(desc)}</h2><p>{links}</p>{details}</div></article>')
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monthly Ledger — Visual kit</title><style>body{margin:0;background:#f6f1e6;color:#14232b;font:16px/1.6 system-ui,sans-serif}header,main{max-width:1480px;margin:auto;padding:32px}h1{font-size:clamp(32px,4vw,60px);line-height:1.05;margin:0 0 16px}header p{max-width:900px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:24px;padding-top:0}article{background:#fffdf8;border:1px solid #e3dccb;border-radius:16px;overflow:hidden}.art{height:250px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#f6f1e6 0% 25%,#ebe4d6 0% 50%) 50%/24px 24px}.art img{max-width:90%;max-height:220px;object-fit:contain}.dark-card{background:#0f1d26}.copy{padding:20px}h2{font-size:20px;line-height:1.3;margin:5px 0 12px}small{color:#1f8f74;text-transform:uppercase;letter-spacing:.1em}a{color:#146e5a;margin-right:10px}pre{white-space:pre-wrap;font-size:12px}summary{cursor:pointer}nav button{font:inherit;padding:9px 16px;background:white;border:1px solid #b8c4bd;border-radius:40px;margin:4px;cursor:pointer}body.night{background:#0f1d26;color:#f6f1e6}body.night article{background:#16272f;border-color:#26383f}body.night .art{background:#0f1d26}body.night a,body.night small{color:#7cdec1}article[hidden]{display:none}</style></head><body><header><h1>Monthly Ledger<br>Visual kit</h1><p>Identity, Android icons, illustrations and pictograms for the offline personal app. The illustration PNGs are AI-generated originals; SVGs and logos are native sources. No image is a real app screenshot.</p><p><a href="README.md">Usage guide</a><a href="manifest.json">Manifest</a><a href="previews/identity.jpg">Identity sheet</a><a href="previews/illustrations-light.jpg">Light illustrations</a><a href="previews/illustrations-dark.jpg">Dark illustrations</a></p><nav><button onclick="document.body.classList.toggle('night')">Light / dark</button><button data-filter="all">All</button><button data-filter="brand">Logo</button><button data-filter="platform">Android</button><button data-filter="illustration">Illustrations</button><button data-filter="icon">Icons</button><button data-filter="preview">Covers</button></nav></header><main>'''+''.join(cards)+'''</main><script>document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>document.querySelectorAll('article').forEach(a=>a.hidden=b.dataset.filter!=='all'&&a.dataset.category!==b.dataset.filter))</script></body></html>'''
html=html.replace('</style>','body.night .art.light-card{background:#f6f1e6}body.night article[data-category="icon"] .art img{filter:brightness(0) invert(1)}</style>')
write('GALLERY.html',html)
print('Built',len(assets),'asset entries;',len(illustrations),'illustrations;',len(icons),'pictograms.')

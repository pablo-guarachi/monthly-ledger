"""Export a complete local favicon pack from the existing native logo SVG."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
import fitz
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / 'assets/visual-kit'
OUT = KIT / 'favicons'
OUT.mkdir(exist_ok=True)
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
master=ET.parse(KIT/'brand/mark-paper.svg').getroot()
art=''.join(ET.tostring(child,encoding='unicode') for child in master)
dark='#0F1D26'

def source(maskable=False, rounded=False):
    radius=' rx="44"' if rounded else ''
    content=f'<rect width="256" height="256" fill="{dark}"{radius}/>'
    content+=f'<g transform="translate(51.2 51.2) scale(.6)">{art}</g>' if maskable else art
    return f'<svg xmlns="{NS}" width="256" height="256" viewBox="0 0 256 256">{content}</svg>'

def png(svg,name,size):
    doc=fitz.open(stream=svg.encode(),filetype='svg')
    pdf=fitz.open(stream=doc.convert_to_pdf(),filetype='pdf')
    page=pdf[0]
    pix=page.get_pixmap(matrix=fitz.Matrix(size/page.rect.width,size/page.rect.height),alpha=True)
    pix.save(str(OUT/name))

favicon=source(rounded=True)
(OUT/'favicon.svg').write_text(favicon,encoding='utf-8')
for size in [16,32,48,64,96,128,256]:
    png(favicon,f'favicon-{size}x{size}.png',size)
with Image.open(OUT/'favicon-256x256.png') as image:
    image.save(OUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
# Touch and installable-app icons have an opaque full-bleed background.
png(source(),'apple-touch-icon.png',180)
for size in [192,512]:
    png(source(),f'android-chrome-{size}x{size}.png',size)
png(source(maskable=True),'maskable-icon-512x512.png',512)
manifest={'name':'Monthly Ledger','short_name':'Ledger','lang':'en','start_url':'./','scope':'./','display':'standalone','background_color':'#F6F1E6','theme_color':dark,'icons':[{'src':'android-chrome-192x192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'android-chrome-512x512.png','sizes':'512x512','type':'image/png','purpose':'any'},{'src':'maskable-icon-512x512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
(OUT/'site.webmanifest').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
head='''<!-- Copy the favicon folder to your web public directory and adapt this prefix. -->
<link rel="icon" href="/favicons/favicon.ico" sizes="any">
<link rel="icon" href="/favicons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicons/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/favicons/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/favicons/site.webmanifest">
<meta name="theme-color" content="#0F1D26">
'''
(OUT/'head-snippet.html').write_text(head,encoding='utf-8')
# Preview at native small sizes and at larger touch/install sizes.
sheet=Image.new('RGB',(900,340),'#F6F1E6')
d=ImageDraw.Draw(sheet)
font=ImageFont.truetype(str(ROOT/'node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),16)
for i,size in enumerate([16,32,48,64,96,128]):
    with Image.open(OUT/f'favicon-{size}x{size}.png') as im:
        sheet.paste(im,(20+i*145,80),im)
    d.text((20+i*145,240),f'{size} px',font=font,fill='#14232B')
sheet.save(OUT/'preview.png')
# Verify every deliverable and every manifest icon path.
pngs=list(OUT.glob('*.png'))
for p in pngs:
    with Image.open(p) as im: im.verify()
ET.parse(OUT/'favicon.svg')
with Image.open(OUT/'favicon.ico') as ico:
    assert ico.ico.sizes()=={(x,x) for x in [16,32,48,64,128,256]}
for entry in manifest['icons']:
    with Image.open(OUT/entry['src']) as im:
        assert f'{im.width}x{im.height}'==entry['sizes']
        assert im.getchannel('A').getextrema()==(255,255)
with Image.open(OUT/'apple-touch-icon.png') as im:
    assert im.size==(180,180) and im.getchannel('A').getextrema()==(255,255)
with Image.open(OUT/'maskable-icon-512x512.png') as im:
    # Every non-background pixel must fit inside the central 80% diameter.
    for y in range(512):
        for x in range(512):
            if im.getpixel((x,y))[:3]!=(15,29,38):
                assert (x-256)**2+(y-256)**2<=(512*.4)**2
report={'status':'PASS','date':'2026-10-23','png_files':len(pngs),'ico_frames':[16,32,48,64,128,256],'checks':['Raster decoding','SVG XML','Manifest paths and dimensions','Opaque touch/install icons','Maskable central safe circle']}
(OUT/'quality-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))

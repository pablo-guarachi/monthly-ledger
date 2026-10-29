"""Generate app icons/splash for Monthly Ledger (run once; outputs in assets/)."""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
BG = (16, 36, 48)        # deep ink
PAPER = (246, 241, 230)  # warm paper
ACCENT = (46, 170, 140)  # teal
AMBER = (232, 160, 60)

def ledger_mark(size, fg, bg=None, pad_ratio=0.22):
    img = Image.new('RGBA', (size, size), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    w = size - 2 * pad
    # ledger sheet: rounded rect outline
    r = int(size * 0.06)
    d.rounded_rectangle([pad, pad, pad + w, pad + w], radius=r, outline=fg, width=int(size * 0.045))
    # three ruled lines, last one shorter + accent dot = "paid"
    lh = int(size * 0.045)
    ys = [pad + w * 0.30, pad + w * 0.52, pad + w * 0.74]
    x0 = pad + w * 0.20
    for i, y in enumerate(ys):
        x1 = pad + w * (0.80 if i < 2 else 0.58)
        d.rounded_rectangle([x0, y - lh / 2, x1, y + lh / 2], radius=lh, fill=fg)
    cy = ys[2]
    rr = w * 0.07
    d.ellipse([pad + w * 0.80 - rr, cy - rr, pad + w * 0.80 + rr, cy + rr], fill=ACCENT)
    return img

def save(img, name):
    img.save(os.path.join(OUT, name), 'PNG')
    print('wrote', name)

# App icon (legacy) 1024
save(ledger_mark(1024, PAPER, BG + (255,), 0.20), 'icon.png')
# Adaptive: foreground on transparent (safe zone = inner 66%), background solid
save(ledger_mark(1024, PAPER, None, 0.30), 'android-icon-foreground.png')
save(Image.new('RGBA', (1024, 1024), BG + (255,)), 'android-icon-background.png')
save(ledger_mark(1024, (255, 255, 255), None, 0.30), 'android-icon-monochrome.png')
# Splash icon
save(ledger_mark(512, PAPER, None, 0.18), 'splash-icon.png')
# Notification icon: 96x96 white on transparent
save(ledger_mark(96, (255, 255, 255), None, 0.10), 'notification-icon.png')

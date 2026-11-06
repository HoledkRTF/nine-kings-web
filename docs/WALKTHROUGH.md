# Walkthrough & Operations Manual

## 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- Python 3.10+ (for background asset processing scripts)
- Microsoft Edge or Google Chrome (for browser preview testing)

## 2. Dependencies Installation
```bash
npm install
```

## 3. Running the Development Server
```bash
npx vite dev dev --port 3000
```
Open a browser and navigate to:
```text
http://localhost:3000
```

## 4. Running Unit Tests
Execute the full test suite across active development:
```bash
npx vitest run dev/
```
Execute the test suite on staging:
```bash
npx vitest run staging/
```
Execute the test suite on production:
```bash
npx vitest run main/
```
Target the Board Renderer tests specifically:
```bash
npx vitest run dev/src/render/board-renderer.test.ts
```

## 5. Building Production Bundles
Build the active development branch:
```bash
npx vite build dev
```
Build staging:
```bash
npx vite build staging
```
Build main:
```bash
npx vite build main
```

## 6. Capturing Browser Verification Screenshot
With the Vite dev server running on port 3000, run:
```bash
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.goto('http://localhost:3000', wait_until='networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='browser_preview.png')
    browser.close()
"
```

## 7. Re-generating Environment Backdrop Assets
To regenerate the 1920x1080 pixel-perfect clean backdrop from the source screenshot:
```bash
python -c "
import numpy as np
from PIL import Image
import cv2

base = np.array(Image.open('steam_ss_0.jpg').convert('RGB'))
h, w, _ = base.shape
output = base.copy()

def generate_pixel_grass(h, w, seed=1337):
    np.random.seed(seed)
    bh, bw = (h + 1) // 2, (w + 1) // 2
    grid = np.ones((bh, bw), dtype=int)
    for by in range(bh):
        bx = 0
        while bx < bw:
            if np.random.rand() < 0.28:
                run_len = np.random.randint(2, 6)
                grid[by, bx:min(bw, bx+run_len)] = 0
                bx += run_len
            else:
                bx += 1
    for by in range(bh):
        bx = 0
        while bx < bw:
            if grid[by, bx] == 1 and np.random.rand() < 0.15:
                run_len = np.random.randint(1, 4)
                grid[by, bx:min(bw, bx+run_len)] = 2
                bx += run_len
            else:
                bx += 1
    upscaled = np.repeat(np.repeat(grid, 2, axis=0), 2, axis=1)[:h, :w]
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    total_y = np.arange(h)
    grad = (0.86 + (total_y / 1080.0) * 0.28)[:, None]
    colors = np.array([[78, 125, 104], [104, 164, 139], [126, 188, 162]], dtype=float)
    for c_idx in range(3):
        mask = (upscaled == c_idx)
        base_col = colors[c_idx]
        for ch in range(3):
            val = np.repeat(base_col[ch] * grad, w, axis=1)
            rgb[:, :, ch][mask] = np.clip(val[mask], 0, 255).astype(np.uint8)
    return rgb

clean_grass = generate_pixel_grass(h, w)

for y in range(h):
    for x in range(w):
        if x < 450 and y > 570: continue
        if x >= 80 and x <= 270 and y >= 370 and y <= 550: continue
        if x > 1420: continue
        wall_bot_y = 440 - (x - 50) * 0.62 if x < 500 else (160 if x <= 960 else 160 + (x - 960) * 0.05)
        if y < wall_bot_y + 10: continue
        if x >= 440 and x <= 1420: output[y, x] = clean_grass[y, x]
        elif x >= 270 and y >= 560: output[y, x] = clean_grass[y, x]

def replace_disc_seamless(canvas, cx, cy, donor_patch, r=38):
    y_g, x_g = np.ogrid[-r:r+1, -r:r+1]
    disc = (((x_g // 2) * 2)**2 + ((y_g // 2) * 2)**2 <= r**2)
    canvas[cy-r:cy+r+1, cx-r:cx+r+1][disc] = donor_patch[disc]
    boundary = cv2.dilate(disc.astype(np.uint8), np.ones((3,3), np.uint8)) - cv2.erode(disc.astype(np.uint8), np.ones((3,3), np.uint8))
    clean_b = cv2.inpaint(canvas[cy-r-2:cy+r+3, cx-r-2:cx+r+3], np.pad(boundary, 2, mode='constant').astype(np.uint8), 2, cv2.INPAINT_TELEA)
    canvas[cy-r-2:cy+r+3, cx-r-2:cx+r+3] = clean_b

replace_disc_seamless(output, 52, 140, np.fliplr(base[102:179, 117:194]), r=38)
replace_disc_seamless(output, 52, 235, base[197:274, 77:154], r=38)
replace_disc_seamless(output, 52, 330, base[257:334, 84:161], r=38)

r4 = 38
patch4 = np.zeros((2*r4+1, 2*r4+1, 3), dtype=np.uint8)
patch4[:r4+1] = base[352:391, 84:161]
patch4[r4+1:] = base[450:488, 14:91]
replace_disc_seamless(output, 52, 425, patch4, r=38)

crop_curr = output[20:70, 10:155]
mask_curr = cv2.dilate(((crop_curr[:,:,0] > 140) & (crop_curr[:,:,1] > 65) & (crop_curr[:,:,2] < 120) | (crop_curr[:,:,0] > 180) & (crop_curr[:,:,1] > 180) & (crop_curr[:,:,2] > 180) | (crop_curr[:,:,0] < 40) & (crop_curr[:,:,1] < 40) & (crop_curr[:,:,2] < 40) & (crop_curr.mean(axis=2) < 30)).astype(np.uint8), np.ones((5,5), np.uint8))
output[20:70, 10:155] = cv2.inpaint(crop_curr, mask_curr, 3, cv2.INPAINT_TELEA)

wall_apex = output[20:170, 600:1150].copy()
left_wall_src = output[130:170, 540:600]
for i in range(5):
    dx = 600 + i * 50
    dy = int(145 - i * 50 * 0.25)
    output[dy:dy+40, dx:dx+60] = left_wall_src

right_wall_src = output[140:175, 1140:1200]
for i in range(4):
    dx = 940 + i * 50
    dy = int(140 + i * 50 * 0.18)
    output[dy:dy+35, dx:dx+60] = right_wall_src

crop_tl = output[0:150, 0:1100]
mask_tl = ((crop_tl[:,:,0] > 175) & (crop_tl[:,:,1] > 175) & (crop_tl[:,:,2] > 175)).astype(np.uint8)
mask_tl = cv2.dilate(mask_tl, np.ones((3,3), np.uint8))
output[0:150, 0:1100] = cv2.inpaint(crop_tl, mask_tl, 2, cv2.INPAINT_TELEA)

Image.fromarray(output).save('dev/public/assets/env/meadow_clean_backdrop.png')
Image.fromarray(output).save('dev/public/assets/env/meadow_clean_backdrop.jpg', quality=95)
"
```

## 8. Promoting Changes Through Local Branches
```bash
# Feature to Dev
cp -r features/nine-kings-ios-background/* dev/
npx vitest run dev/

# Dev to Staging
cp -r dev/* staging/
npx vitest run staging/
npx vite build staging

# Backup Main
python -c "
import zipfile, os
with zipfile.ZipFile('main_backup.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('main'):
        for f in files:
            zipf.write(os.path.join(root, f))
"

# Staging to Main
cp -r staging/* main/
npx vitest run main/
npx vite build main
```

"""Fill the painted title and wordmark out of ARPIT's meadow-door.webp, for the painted door (img/meadow-clean.png).
The knife strokes hide what is left of them. Run from this folder: python3 clean-meadow.py"""
import numpy as np
from PIL import Image, ImageFilter

im = np.asarray(Image.open("../../../../public/entry/meadow-door.webp").convert("RGB")).astype(np.float32) / 255
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b


def box(x0, x1, y0, y1):
    z = np.zeros((H, W), bool)
    z[int(y0 * H) : int(y1 * H), int(x0 * W) : int(x1 * W)] = True
    return z


ink = ((r > g * 1.25) & (r > b * 1.25) & (lum < 0.5)) | (lum < 0.16)
m = (box(0.08, 0.38, 0.33, 0.58) & ink) | (box(0.03, 0.22, 0.015, 0.085) & (lum < 0.35))
m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
known = (~m).astype(np.float32)
fill, done = np.zeros_like(im), np.zeros((H, W), bool)
for rad in [3, 6, 12, 24, 48, 96]:
    a = np.asarray(Image.fromarray(np.uint8(im * known[..., None] * 255)).filter(ImageFilter.GaussianBlur(rad))) / 255
    k = np.asarray(Image.fromarray(np.uint8(known * 255)).filter(ImageFilter.GaussianBlur(rad))) / 255
    ok = (k > 0.25) & m & ~done
    fill[ok] = a[ok] / k[ok][:, None]
    done |= ok
im[m] = fill[m]
Image.fromarray(np.uint8(np.clip(im, 0, 1) * 255)).save("img/meadow-clean.png")

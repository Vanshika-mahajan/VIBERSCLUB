"""Cleans the door's painted face: door-painted-unfolded.webp (made by paintleaf.py) becomes
door-painted.webp. Unfolding the painting's
door stretches a narrow strip of it on the hinge side, which shows as smeared streaks once the door
swings. Those parts are rebuilt from the clean latch side, mirrored (the door is symmetric, all but
its handle), and the relief and sheen maps are made again from the result.

Run from the repo root:  python3 -I apps/web/features/intro/tools/cleanface.py
"""
import cv2
import numpy as np
from pathlib import Path

PUB = Path(__file__).resolve().parents[3] / "public/intro"
# always from the unfolded original, so running this twice gives the same result
face = cv2.imread(str(PUB / "door-painted-unfolded.webp"), cv2.IMREAD_COLOR)
H, W = face.shape[:2]

# the latch side without its handle, mirrored across the door
src = face.copy()
hole = np.zeros((H, W), np.uint8)
hole[620:900, 530:670] = 255
src = cv2.inpaint(src, hole, 9, cv2.INPAINT_TELEA)
mirror = src[:, ::-1]

# where the unfolding smeared: the hinge edge, the top corner by the arch, the lower hinge-side panel
y, x = np.mgrid[0:H, 0:W]
m = np.zeros((H, W), np.float32)
m[x < 52] = 1
m[(x < 250) & (y < 300)] = 1
m[(x < 390) & (y > 1040)] = 1
m = cv2.GaussianBlur(m, (0, 0), 14)[..., None]
out = (face * (1 - m) + mirror * m).astype(np.float32)
# the middle stile low down mirrors onto itself (still smeared): there the grain runs on from above
rows = 900 + (np.arange(H) - 1110) % 200  # the clean stretch of stile below the cross rail, repeated
up = out[np.clip(rows, 0, H - 1)]
m2 = np.zeros((H, W), np.float32)
m2[(x > 270) & (x < 410) & (y > 1110)] = 1
m2 = cv2.GaussianBlur(m2, (0, 0), 12)[..., None]
out = (out * (1 - m2) + up * m2).astype(np.uint8)
cv2.imwrite(str(PUB / "door-painted.webp"), out, [cv2.IMWRITE_WEBP_QUALITY, 92])

# relief and sheen from the cleaned face: broad mouldings and the fine grain
g = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
coarse = cv2.GaussianBlur(g, (0, 0), 3)
fine = cv2.GaussianBlur(g, (0, 0), 0.8)
h = coarse * 0.7 + fine * 0.3
dx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3)
dy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
n = np.dstack([-dx * 3.0, dy * 3.0, np.ones_like(h)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
cv2.imwrite(str(PUB / "door-painted-normal.webp"), ((n * 0.5 + 0.5) * 255).astype(np.uint8)[..., ::-1], [cv2.IMWRITE_WEBP_QUALITY, 95])
r = 1 - cv2.normalize(fine, None, 0, 1, cv2.NORM_MINMAX)
cv2.imwrite(str(PUB / "door-painted-rough.webp"), ((0.65 + 0.35 * r) * 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 95])
print("cleaned", W, H)

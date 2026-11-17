"""Cuts the branch hanging in at the top left of Scene 1 out of the painting, so the 3D stage can
sway it as one piece (world/life.ts), and fills the sky behind it for the 3D plate.

  scene1-branch.webp     the branch and its leaves, with a soft transparent edge
  scene1-plate-3d.webp   Scene 1 with the sky painted in where the branch was (the still image the
                         page shows before 3D loads keeps the branch: scene1-plate.webp)

Run from the repo root:  python3 -I apps/web/features/intro/tools/branch.py
then tools/depth.py again (it reads the 3D plate).
"""
import cv2
import numpy as np
from pathlib import Path

PUB = Path(__file__).resolve().parents[3] / "public/intro"
plate = cv2.imread(str(PUB / "scene1-plate.webp"), cv2.IMREAD_COLOR)
H, W = plate.shape[:2]
f = plate.astype(np.float32) / 255
lum = 0.3 * f[..., 2] + 0.59 * f[..., 1] + 0.11 * f[..., 0]
y, x = np.mgrid[0:H, 0:W]

# the branch: dark leaves and wood against the pale sky, right of the trunk, above the mountains
BOX = (190, 0, 840, 345)  # left, top, right, bottom
# (not the vines on the door's arch, which start at about x 700, y 100)
region = (x >= BOX[0]) & (x < BOX[2]) & (y < BOX[3]) & ((x < 690) | (y < 95))
dark = np.clip((0.66 - lum) / 0.16, 0, 1)
mask = (dark * region).astype(np.float32)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
# drop specks of mountain or haze
n, lab, stats, _ = cv2.connectedComponentsWithStats((mask > 0.3).astype(np.uint8))
keep = np.zeros_like(mask)
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] > 900:
        keep[lab == i] = 1
mask = np.minimum(mask, cv2.dilate(keep, np.ones((7, 7), np.uint8)))
# fade in from the trunk, where the branch joins it (that part stays in the painting)
mask *= np.clip((x - BOX[0]) / 60.0, 0, 1)
alpha = cv2.GaussianBlur(mask, (0, 0), 0.8)

cut = np.dstack([plate, (alpha * 255).astype(np.uint8)])
l, t, r, b = BOX
cv2.imwrite(str(PUB / "scene1-branch.webp"), cut[t:b, l:r], [cv2.IMWRITE_WEBP_QUALITY, 92])

# the sky behind it, for the 3D plate: painted in a little wider than the branch, so a sway never
# shows its ghost
# (also any soft, out-of-focus bits of leaf in the sky above the mountains)
soft_bits = (lum < 0.8) & (x >= BOX[0]) & (x < BOX[2]) & (y < 200) & ((x < 690) | (y < 95))
hole = (cv2.dilate(((alpha > 0.02) | soft_bits).astype(np.uint8), np.ones((21, 21), np.uint8)) * 255).astype(np.uint8)
hole[:, : BOX[0] + 30] = 0
filled = cv2.inpaint(plate, hole, 12, cv2.INPAINT_TELEA)
# soften the painted-in sky so it reads as haze, not smudges
soft = cv2.GaussianBlur(filled, (0, 0), 6)
hm = cv2.GaussianBlur(hole.astype(np.float32) / 255, (0, 0), 4)[..., None]
filled = (filled * (1 - hm) + soft * hm).astype(np.uint8)
cv2.imwrite(str(PUB / "scene1-plate-3d.webp"), filled, [cv2.IMWRITE_WEBP_QUALITY, 92])
print("branch box", BOX)

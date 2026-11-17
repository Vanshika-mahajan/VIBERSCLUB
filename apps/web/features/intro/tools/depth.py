"""Scene 1's depth map: how far away each part of the painting is, so the 3D stage can give it real
depth (world/stage.ts, PLATE_VERT). Hand-built from the painting's layout and colours:

  the sky and the mountains           far away (-70 world units; the door stands at 0)
  the misty forest on the left        -22
  the pines on the right              -12
  the meadow                          from far at the horizon to about +4 at the bottom edge
  the door, its arch and vines        exactly 0, so the 3D door stays locked to the painting
  the branch and trunk at top left    +3, nearest of all

Run from the repo root:  python3 -I apps/web/features/intro/tools/depth.py
If the painting changes, move the boxes below (painting pixels, 1672 x 941).
"""
import cv2
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
src = cv2.imread(str(ROOT / "public/intro/scene1-plate.webp"), cv2.IMREAD_COLOR).astype(np.float32) / 255
H, W = src.shape[:2]
b, g, r = src[..., 0], src[..., 1], src[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
y, x = np.mgrid[0:H, 0:W].astype(np.float32)


def ramp(v, a, c):
    """0 at a, 1 at c (either direction), smooth"""
    t = np.clip((v - a) / (c - a), 0, 1)
    return t * t * (3 - 2 * t)


def box(l, t, rr, bb, soft):
    return ramp(x, l - soft, l + soft) * ramp(x, rr + soft, rr - soft) * ramp(y, t - soft, t + soft) * ramp(y, bb + soft, bb - soft)


# the meadow: a ground plane, distance growing toward the horizon (y 690)
EYE = 12.4
ground = EYE * (1 - 110 / np.maximum(y - 690, 1.0))
ground = np.clip(ground, -40, 8) * 0.55
z = np.full((H, W), -70.0, np.float32)
on_ground = ramp(y, 700, 740)
z = z * (1 - on_ground) + ground * on_ground

# the misty forest on the left, and the pines on the right (green, not the grey-blue mountains)
forest = box(0, 430, 760, 745, 30) * (1 - ramp(y, 700, 760))
z = z * (1 - forest) + (-22) * forest
greenish = ramp(g - b, 0.0, 0.06) * ramp(lum, 0.55, 0.4)
pines = box(1170, 300, 1700, 735, 30) * np.maximum(greenish, box(1170, 470, 1700, 735, 20)) * (1 - ramp(y, 700, 760))
z = z * (1 - pines) + (-12) * pines

# the branch and trunk hanging in at the top left: the dark leaves and bark against the pale sky
dark = ramp(lum, 0.62, 0.45)
branch = np.maximum(box(0, 0, 860, 330, 20), box(0, 0, 270, 470, 20)) * dark
z = z * (1 - branch) + 3.0 * branch

z = cv2.GaussianBlur(z, (0, 0), 6)

# the door, its arch and vines: exactly on the painting's plane
door = box(712, 96, 1262, 836, 22)
z = z * (1 - door)

# (the edges need no care: the camera idles a touch closer than the framing, see CLOSER in stage.ts)
v = np.where(z >= 0, 230 + z / 8 * 25, 230 * (1 + z / 80))
out = np.clip(np.round(v), 0, 255).astype(np.uint8)
cv2.imwrite(str(ROOT / "public/intro/scene1-depth.png"), cv2.resize(out, (W // 2, H // 2), interpolation=cv2.INTER_AREA))
print("depth", z.min(), z.max())

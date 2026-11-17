"""Scene 1's foliage mask (scene1-foliage.png): the leaves and flowers of the vines round the door, so the
wind can move them (world/stage.ts, WIND) while the doorframe under them stays rigid. White is foliage.

Leaves are told apart by colour: green or olive, where the wood of the frame and the glow of the doorway
are red-orange. Flowers are the pale cream blooms. The mask is softened a little so movement fades out.

Run from the repo root:  python3 -I apps/web/features/intro/tools/foliage.py
"""
import cv2
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
src = cv2.imread(str(ROOT / "public/intro/scene1-plate.webp"), cv2.IMREAD_COLOR)
H, W = src.shape[:2]
hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV).astype(np.float32)
h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255  # hue in degrees
y, x = np.mgrid[0:H, 0:W].astype(np.float32)

# the grade is warm, so the leaves sit just past the frame's red-orange (hue above about 33 degrees)
leaves = (h > 34) & (h < 150) & (s > 0.35) & (v > 0.1)
near_leaves = cv2.dilate(leaves.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
flowers = (s < 0.3) & (v > 0.75) & near_leaves
# only the vines round the door (painting 0..1: x 0.40 to 0.78, y 0.08 to 0.92)
region = (x > 0.40 * W) & (x < 0.78 * W) & (y > 0.08 * H) & (y < 0.92 * H)
# never the doorway itself, where the light and the world beyond show
doorway = (x > 0.51 * W) & (x < 0.66 * W) & (y > 0.22 * H) & (y < 0.84 * H)
m = ((leaves | flowers) & region & ~doorway).astype(np.uint8) * 255
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
m = cv2.GaussianBlur(m, (0, 0), 1.5)
m = cv2.resize(m, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
cv2.imwrite(str(ROOT / "public/intro/scene1-foliage.png"), m)
print("foliage", m.shape, round(float((m > 128).mean()), 3))

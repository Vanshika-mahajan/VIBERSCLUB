import sys, numpy as np, cv2
sys.path.insert(0, sys.argv[1])
from proj import proj, H, leafW
plate = cv2.imread(sys.argv[2])            # scene1-plate (BGR)
out = sys.argv[3]
C = (0.3, 0, 12.92); th = 1.75 * 0.42
TW, TH = 682, 1463
i = (np.arange(TW) + 0.5) / TW * leafW
j = H * 0.498 - (np.arange(TH) + 0.5) / TH * H * 0.996
U, V = np.meshgrid(i, j)
mx, my = proj(U, V, th, C)
tex = cv2.remap(plate, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
# soften the stretch a little across the grain, add back fine grain so it is not smeared
grain = np.random.default_rng(4).normal(0, 3.0, tex.shape).astype(np.float32)
grain = cv2.GaussianBlur(grain, (0, 0), 0.6)
tex = np.clip(tex.astype(np.float32) + grain, 0, 255).astype(np.uint8)
cv2.imwrite(out + '/door-leaf-painted.png', tex)
# relief and sheen from the new face
g = cv2.cvtColor(tex, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
coarse = cv2.GaussianBlur(g, (0, 0), 3); fine = cv2.GaussianBlur(g, (0, 0), 0.8)
h = coarse * 0.7 + fine * 0.3
dx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3); dy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
s = 3.0
n = np.dstack([-dx * s, dy * s, np.ones_like(h)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
nm = ((n * 0.5 + 0.5) * 255).astype(np.uint8)
cv2.imwrite(out + '/door-leaf-painted-normal.png', nm[..., ::-1])  # RGB = xyz
r = 1 - cv2.normalize(fine, None, 0, 1, cv2.NORM_MINMAX)
r = (0.65 + 0.35 * r) * 255
cv2.imwrite(out + '/door-leaf-painted-rough.png', r.astype(np.uint8))
# where the painted handle landed, in the new face's pixels
def back(px, py):
    d = (mx - px) ** 2 + (my - py) ** 2
    k = np.unravel_index(np.argmin(d), d.shape)
    return int(k[1]), int(k[0]), float(np.sqrt(d[k]))
for name, p in dict(rose=(1012, 487), lever=(997, 487), plateT=(1012, 457), plateB=(1012, 542), plateL=(1008, 500), plateR=(1017, 500)).items():
    print(name, back(*p))

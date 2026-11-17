# The entry experience

Scene 1 "A World Awaits" → a real 3D door opens → the Vibers World comes alive → a paraglider whose
canopy covers the screen → the real site (Home opens the canopy like a curtain). One screen, one sequence, at `/` (reviewed first on `/intro-demo`, which now sends you to `/`).

## Files
- `IntroExperience.tsx`: the screen. Scene 1's words and button, the painted still, Scene 2.
- `useIntro.ts`: the sequence (idle → door → entering → world → paraglider → canopy → reveal → active). Only moves forward; `start()` refuses a second click.
- `DoorScene.tsx`: hosts the 3D stage; loads three.js only where `canUse3D()` allows (not with reduced motion or on low-power devices, which keep the painted still).
- `world/stage.ts`: one renderer and camera. The painting is a flat backdrop that moves in the wind (`PLATE_FRAG`: branch, vines, pines, grass), pollen drifts. In Scene 1 the painted door itself shows; it dissolves into the 3D door (standing at the same angle) as the camera starts to move.
- `world/door.ts`: the door. A solid leaf on a hinge, the doorway behind it shows Scene 2 lined up with the screen.
- `world/params.ts`: the numbers the timelines animate, where things sit in the painting, and the camera path for each screen shape.
- `timelines/door.ts`: the walk through the door, with every time written down.
- `WorldScene.tsx`, `world/living.ts`: the living Vibers World (see below).
- `timelines/flight.ts`, `world/cover.ts`: the paraglider's flight and the canopy covering the screen.
- `handoff.ts`, `CanopyReveal.tsx`, `canopy.module.css`: the hand-over to Home and the curtain opening there.

Libraries: three.js for the door and the living world (no React wrapper), GSAP for every timeline (its ticker also drives the render loops), CSS modules for the rest. No new dependencies.

## Replacing the art (`public/intro/`)
| File | What | Size |
|---|---|---|
| `scene1-plate.webp` | Scene 1 without its text | 1672 × 941 |
| `scene1-pack.webp`, `scene1-skateboard.webp` | cut out of Scene 1 so they stay in front of the door | as cut |
| `door-painted.webp` | the front of the 3D door: the painting's own door, unfolded from `scene1-plate.webp` as seen from the starting camera with the leaf ajar (`features/intro/tools/paintleaf.py`; the backpack and vines that overlap it were filled with wood) | 682 x 1463 |
| `door-painted-normal.webp`, `door-painted-rough.webp` | its relief and sheen, so it catches the light as it turns (a Sobel normal map and an inverted-luminance roughness map of the face) | same as the face |
| `scene1-vines.webp` | the vines and flowers over the hinge side, cut from the painting so they stay in front of the leaf | any |
| `scene1-depth.png` | how far away each part of Scene 1 is (made by `tools/depth.py`): the painting is pushed into depth so near and far parts slide against each other as the camera drifts | half size |
| `door-painted-unfolded.webp` | the door face as `tools/paintleaf.py` unfolds it; `tools/cleanface.py` rebuilds its smeared hinge side into `door-painted.webp` and remakes the relief and sheen maps | 682 x 1463 |
| `scene2-world.webp` | the Vibers World | 1671 × 941 |
| `scene2-glider-patch.webp` | sky to paint out the painted paraglider once the real one takes off (`GLIDER_PATCH` in `living.ts`) | as cut |
| `paraglider.webp` | the paraglider with a clean transparent background | 1672 × 941 |
| `canopy-fabric.webp` | the canopy's cloth that fills the screen | any, landscape |

Same size and composition: replace the file and you're done. A new Scene 1 with the door somewhere else: change the doorway box in `params.ts` (`DOOR`, in the painting's pixels) the boxes of the cut-outs (`PACK`, `SKATEBOARD`), the painted-door overlay (`OVER` in `stage.ts`) and the angle the painted door stands at (`AJAR`).

## Changing the door
`world/door.ts`: the front is carved: its panels (`PANELS`, in the face's pixels) are sunk `RECESS` deep with bevelled edges, and once the door moves the scene's light takes over from the painted glow, so the carving reads. `DOOR.thickness` in `params.ts` is its depth; the battens and brace on the back, the hinge knuckles and the edge colour are plain three.js meshes. How far it opens: `LEAF_OPEN` in `params.ts` (radians, 90 degrees; further and it swings out behind the painted wall). Which way: positive swings it away from us.

## Wind and depth in Scene 1
`world/stage.ts`: `WIND` is the soft wind (the branch, the vines and their flowers, the pines, the meadow, the mist), with a box for each part in the painting's 0..1; the vines cut-out uses it too. The painting is drawn in depth from `scene1-depth.png`, and the camera drifts gently while you wait (`driftX`, `driftY`; it stands `CLOSER` so the drift never shows past the edges). The depth fades out as the camera walks through the doorway.

The depth map's red channel is the depth (230 is the painting's own plane, the sky sits 160 units behind it), green marks the mountains (cloud shadows drift over them) and blue the meadow (waves of wind roll through it). `tools/depth.py` rebuilds it. The plate is `scene1-plate-3d.webp`: the painting with the branch painted out, because the branch is its own cut-out (`scene1-branch.webp`, from `tools/branch.py`) that sways on its joint with the trunk. The camera's far plane must stay beyond the sky (600), or the sky is clipped. Round the door the wind moves only the vines' leaves and flowers, from `scene1-foliage.png` (`tools/foliage.py`), so the doorframe stays rigid.

`world/life.ts` holds the real three.js objects in front of and inside the painting, each placed at the painting's depth: the swaying branch, five mist banks drifting between the ridges, falling leaves that tumble in the wind, and grass blades and daisies along the bottom that bend in the gusts (shorter in front of the door so the threshold stays clear). Colours in its shaders are picked as painting colours and converted with `pow(c, 2.2)` before output.

## Retiming
The door: `timelines/door.ts`. The flight and canopy: `timelines/flight.ts` (times listed at its top). The curtain on Home: the two tweens in `CanopyReveal.tsx`. In each, the second argument of each tween is the time from the click, the `duration` its length. The camera's framing for each screen shape is `framingFor()` in `params.ts`.


If the painting changes, the door face has to be unfolded again from the new painting, and the handle position (`HANDLE` in `world/door.ts`, in the face's pixels) moved to where the new painting has it. `door-leaf.webp` and its maps are ARPIT's separate panel, no longer used; they are kept until ARPIT says they can go.

## The living Vibers World (Phases 2 and 3)

`WorldScene.tsx` mounts as we start through the door and draws `world/living.ts`: Scene 2's painting through one shader that moves the river, the fire (flicker, sparks, smoke), the lantern, the string lights and the neon sign, the clouds and mist, the leaves and grass, every Viber and the dog (breathing, settling, heads looking about; people are listed in `FIGURES`, the dog in `DOG`, small groups in `CROWDS`), fireflies and the steam off the mug. Every place is in `REGIONS` at the top of `living.ts`, in the painting's pixels, so new art only needs those numbers moved. The view drifts about 6% closer over 24 seconds. Without 3D or with reduced motion the painted still stays.

## The paraglider, the canopy and the hand-over (Phases 4 to 6)

- `timelines/flight.ts` (times are listed at its top): the paraglider (`public/intro/paraglider.webp`) appears exactly over the one painted in the sky, which is painted out (`scene2-glider-patch.webp`), glides across banking, then swoops overhead until its canopy fills the screen; the canopy's cloth (`canopy-fabric.webp`, from ARPIT's canopy picture) takes over and ripples (`canopy.module.css`).
- `world/cover.ts` maps painting pixels to the screen exactly as the living world draws them, so the glider sits on the picture on any screen (on phones it flies in from the right edge).
- The hand-over: the entry raises a flag (`handoff.ts`) and moves to `/home`; `CanopyReveal` (mounted on the Home page, inert on a normal visit) draws the same cloth on Home's first frame and opens it from the middle outward. To retime the curtain, change the two tweens in `CanopyReveal.tsx`.
- Coming back to `/` starts again at Scene 1.

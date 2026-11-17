# The entry experience

Scene 1 "A World Awaits" → a real 3D door opens → the Vibers World → (later phases) a paraglider whose
canopy covers the screen → the real site. One screen, one sequence; demo page `/intro-demo`.

## Files
- `IntroExperience.tsx`: the screen. Scene 1's words and button, the painted still, Scene 2.
- `useIntro.ts`: the sequence (idle → door → entering → world → paraglider → canopy → reveal → active). Only moves forward; `start()` refuses a second click.
- `DoorScene.tsx`: hosts the 3D stage; loads three.js only where `canUse3D()` allows (not with reduced motion or on low-power devices, which keep the painted still).
- `world/stage.ts`: one renderer and camera. The painting is a flat backdrop that moves in the wind (`PLATE_FRAG`: branch, vines, pines, grass), pollen drifts. In Scene 1 the painted door itself shows; it dissolves into the 3D door (standing at the same angle) as the camera starts to move.
- `world/door.ts`: the door. A solid leaf on a hinge, the doorway behind it shows Scene 2 lined up with the screen.
- `world/params.ts`: the numbers the timelines animate, where things sit in the painting, and the camera path for each screen shape.
- `timelines/door.ts`: the walk through the door, with every time written down.

## Replacing the art (`public/intro/`)
| File | What | Size |
|---|---|---|
| `scene1-plate.webp` | Scene 1 without its text | 1672 × 941 |
| `scene1-pack.webp`, `scene1-skateboard.webp` | cut out of Scene 1 so they stay in front of the door | as cut |
| `door-painted.webp` | the front of the 3D door: the painting's own door, unfolded from `scene1-plate.webp` as seen from the starting camera with the leaf ajar (`features/intro/tools/paintleaf.py`; the backpack and vines that overlap it were filled with wood) | 682 x 1463 |
| `door-painted-normal.webp`, `door-painted-rough.webp` | its relief and sheen, so it catches the light as it turns (a Sobel normal map and an inverted-luminance roughness map of the face) | same as the face |
| `scene1-vines.webp` | the vines and flowers over the hinge side, cut from the painting so they stay in front of the leaf | any |
| `scene2-world.webp` | the Vibers World | 1671 × 941 |

Same size and composition: replace the file and you're done. A new Scene 1 with the door somewhere else: change the doorway box in `params.ts` (`DOOR`, in the painting's pixels) the boxes of the cut-outs (`PACK`, `SKATEBOARD`), the painted-door overlay (`OVER` in `stage.ts`) and the angle the painted door stands at (`AJAR`).

## Changing the door
`world/door.ts`: `DOOR.thickness` in `params.ts` is its depth; the battens and brace on the back, the hinge knuckles and the edge colour are plain three.js meshes. How far it opens: `LEAF_OPEN` in `stage.ts` (radians). Which way: positive swings it away from us.

## Retiming
`timelines/door.ts`: the second argument of each tween is the time from the click, the `duration` its length. The camera's framing for each screen shape is `framingFor()` in `params.ts`.


If the painting changes, the door face has to be unfolded again from the new painting, and the handle position (`HANDLE` in `world/door.ts`, in the face's pixels) moved to where the new painting has it. `door-leaf.webp` and its maps are ARPIT's separate panel, no longer used; they are kept until ARPIT says they can go.

## The living Vibers World (Phases 2 and 3)

`WorldScene.tsx` mounts as we start through the door and draws `world/living.ts`: Scene 2's painting through one shader that moves the river, the fire (flicker, sparks, smoke), the lantern, the string lights and the neon sign, the clouds and mist, the leaves and grass, the three Vibers in front (breathing), fireflies and the steam off the mug. Every place is in `REGIONS` at the top of `living.ts`, in the painting's pixels, so new art only needs those numbers moved. The view drifts about 6% closer over 24 seconds. Without 3D or with reduced motion the painted still stays.

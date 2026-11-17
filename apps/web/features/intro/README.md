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
| `door-leaf.webp` | the front of the door, trimmed to the panel and graded to the painting | any, about 0.46 wide per 1 tall |
| `scene2-world.webp` | the Vibers World | 1671 × 941 |

Same size and composition: replace the file and you're done. A new Scene 1 with the door somewhere else: change the doorway box in `params.ts` (`DOOR`, in the painting's pixels) the boxes of the cut-outs (`PACK`, `SKATEBOARD`), the painted-door overlay (`OVER` in `stage.ts`) and the angle the painted door stands at (`AJAR`).

## Changing the door
`world/door.ts`: `DOOR.thickness` in `params.ts` is its depth; the battens and brace on the back, the hinge knuckles and the edge colour are plain three.js meshes. How far it opens: `LEAF_OPEN` in `stage.ts` (radians). Which way: positive swings it away from us.

## Retiming
`timelines/door.ts`: the second argument of each tween is the time from the click, the `duration` its length. The camera's framing for each screen shape is `framingFor()` in `params.ts`.

# Baking the painted intro

`public/film/paint/` holds every painted plate of the intro already turned into knife strokes, so the browser only uploads them. To change a plate (the camp, the canopy, a Viber's look), edit `bake.js` or `vibers.js` and bake again:

```bash
mkdir -p img && cp ../../../../public/camp/blue-bg.webp ../../../../public/camp/canopy.webp img/
node bake.mjs ../../../../public/film/paint      # needs Playwright's Chromium
```

`engine/plate.js` (reference illustration to strokes) is from Lemo-Opuscar's Impasto demo, MIT, like `../impasto.js`.

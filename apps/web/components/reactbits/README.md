# React Bits components

Components copied from [React Bits](https://github.com/DavidHDev/react-bits) (TypeScript + Tailwind variant).
React Bits is copy-in, not an npm package: each component lives here as our own file, so we can edit it.

## Adding one

1. Find it on reactbits.dev, pick **TS + Tailwind**, and note its folder, e.g. `TextAnimations/SplitText`.
2. Copy the file from `src/ts-tailwind/<Category>/<Name>/<Name>.tsx` in the React Bits repo into this folder.
   (`npx shadcn@latest add https://reactbits.dev/r/<Name>-TS-TW` does the same where reactbits.dev is reachable.)
3. Add the header comment (source path, copyright, licence) and, if it uses GSAP, import gsap from `@/lib/motion/gsap`.
4. Install any library it needs (most use `gsap`, `motion` or `ogl`) with an exact version.
5. Check it does nothing, or something calm, with reduced motion turned on.

## Licence

MIT + Commons Clause (see LICENSE.md): we may use the components in Vibers Club, including commercially,
but must not sell or redistribute the components themselves.

## In use

| Component | From | Used in |
| --- | --- | --- |
| SplitText | TextAnimations/SplitText | /lab (landing hero next) |
- `CircularGallery` (JS + CSS): Community on Discover, the Vibers to like, pass or save.
- `CircularCarousel` (JS + CSS): Home, Vibers like you.
- `AccordionGallery` (JS + CSS): My itinerary, plans to start from.
- `PillNav` (JS + CSS): the bottom bar with Home, Discover and Explore (local edits: Winewood theme, `placement="bottom"` opens the folded menu upward).
- `ScrollStack` (JS + CSS): Explore, places in Manali.

The five above are the JavaScript + CSS variant, each with a small `.d.ts` beside it for TypeScript.

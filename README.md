# MetMotion website

Single-page marketing site. Vite + vanilla TypeScript + GSAP + Three.js, no framework.
The hero is a procedural point-cloud that morphs from a "real scan" into a clean
simulation scene as you scroll (drag the slider instead on phones or with reduced
motion enabled).

## Run it

```bash
cd website
npm ci
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build on :4173
```

Node 22+ (`.nvmrc`).

## Wire up the interest form (2 minutes)

The form POSTs to the constant `FORM_ENDPOINT` in `src/config.ts`. Until you set it,
submissions show a "form isn't wired up yet" notice.

1. Create a free form at [formspree.io](https://formspree.io) (Basin and Web3Forms
   also work, same request shape).
2. Paste the endpoint URL into `src/config.ts`:
   `export const FORM_ENDPOINT = 'https://formspree.io/f/yourid'`
3. Rebuild. Submissions land in your Formspree inbox with email notifications.

## Deploy on Vercel

1. Import the repo at vercel.com. In project settings, set **Root Directory** to
   `website`. Vercel auto-detects Vite (build `npm run build`, output `dist`).
2. Set Node.js version to 22.x if asked.
3. Optional but recommended, under Settings → Git → **Ignored Build Step**, use:
   `git diff --quiet HEAD^ HEAD -- .`
   With the root directory set, this skips deploys for commits that don't touch
   `website/`, so Python-only pushes to the repo don't burn build minutes.

`website/vercel.json` already carries clean URLs, immutable caching for hashed
assets, and basic security headers.

## Where things live

```
index.html            all copy and section markup
src/styles/tokens.css the design system (colors, type, spacing, motion) + build stamp
src/hero/             the WebGL morph (scene, sampling, shader, scroll wiring, fallback)
src/sections/         form state machine, count-up stats, pipeline drawing, perturbation demo
public/               favicon/logo SVG, og.jpg, hero-poster.webp, perturb-base.webp
scripts/shoot.mjs     screenshot verification at 320-1440px + reduced motion (needs `npm run preview`)
scripts/assets.mjs    regenerates og.jpg + poster + perturbation base from the live scene
```

Design notes: colors are OKLCH tokens anchored on the logo violet; the logo's
purple-to-blue gradient appears only inside the reproduced mark, never on UI
surfaces. All motion honors `prefers-reduced-motion`, and the scroll-scrubbed
morph switches to a slider below 40rem viewports.

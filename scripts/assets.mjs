// Renders the site's own WebGL scene into the static assets it needs:
// public/hero-poster.webp (fallback), public/perturb-base.webp, public/og.jpg
import { chromium } from 'playwright'

const BASE = process.env.SHOOT_URL ?? 'http://localhost:4173'

const browser = await chromium.launch()

// --- poster + perturbation base: the sim state, canvas only ---
{
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  // hide overlaid chrome so the capture is the raw render
  await page.addStyleTag({
    content: '.nav-pill, .marquee__fold { visibility: hidden !important; }',
  })
  await page.evaluate(() => window.scrollTo({ top: 2100, behavior: 'instant' }))
  await page.waitForTimeout(1600)
  await page.evaluate(() => window.scrollTo({ top: 1590, behavior: 'instant' }))
  await page.waitForTimeout(1600)
  const stage = page.locator('.marquee__stage')
  await stage.screenshot({ path: '/tmp/mm-stage-sim.png' })
  await context.close()
}

// --- og image: the fold with the morph mid-flight at 1200x630 ---
{
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.evaluate(() => window.scrollTo({ top: 640, behavior: 'instant' }))
  await page.waitForTimeout(1600)
  await page.screenshot({ path: '/tmp/mm-og.png' })
  await context.close()
}

await browser.close()
console.log('captured /tmp/mm-stage-sim.png and /tmp/mm-og.png')

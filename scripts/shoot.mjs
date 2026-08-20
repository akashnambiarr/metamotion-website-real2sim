// Verification screenshots: multiple widths, scroll states, reduced motion.
// Usage: node scripts/shoot.mjs [outDir] (defaults to /tmp/mm-shots)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOOT_URL ?? 'http://localhost:4173'
const OUT = process.argv[2] ?? '/tmp/mm-shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()

async function shoot(name, { width, height = 900, reducedMotion = false, scrollTo = 0, fullPage = false, settle = 900 }) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(settle)
  if (scrollTo > 0) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), scrollTo)
    await page.waitForTimeout(1400) // let the scrub catch up
  }
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement
    return el ? el.scrollWidth - el.clientWidth : 0
  })
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
  await context.close()
  return { name, overflow, errors }
}

const results = []
results.push(await shoot('fold-1440', { width: 1440 }))
results.push(await shoot('mid-morph-1440', { width: 1440, scrollTo: 900 }))
results.push(await shoot('sim-1440', { width: 1440, scrollTo: 1700 }))
results.push(await shoot('full-1440', { width: 1440, scrollTo: 0, fullPage: true }))
results.push(await shoot('fold-768', { width: 768 }))
results.push(await shoot('full-768', { width: 768, fullPage: true }))
results.push(await shoot('full-414', { width: 414, height: 896, fullPage: true }))
results.push(await shoot('full-375', { width: 375, height: 812, fullPage: true }))
results.push(await shoot('full-320', { width: 320, height: 680, fullPage: true }))
results.push(await shoot('reduced-1440', { width: 1440, reducedMotion: true }))
results.push(await shoot('reduced-full-1440', { width: 1440, reducedMotion: true, fullPage: true }))

for (const r of results) {
  const flag = r.overflow > 0 ? ` OVERFLOW-X +${r.overflow}px` : ''
  const errs = r.errors.length ? ` ERRORS: ${r.errors.join(' | ')}` : ''
  console.log(`${r.name}${flag}${errs}`)
}

await browser.close()

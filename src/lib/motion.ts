import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SCRUB_MIN_HEIGHT_REM, SCRUB_MIN_VIEWPORT_REM } from '../config'

let registered = false

export function ensureGsap(): typeof gsap {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.config({ ignoreMobileResize: true })
    registered = true
  }
  return gsap
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const SCRUB_QUERY =
  `(min-width: ${SCRUB_MIN_VIEWPORT_REM}rem) and (min-height: ${SCRUB_MIN_HEIGHT_REM}rem)`

export function isNarrowViewport(): boolean {
  return !window.matchMedia(SCRUB_QUERY).matches
}

/** Scroll-scrub is allowed only on viewports big enough to pin, motion enabled. */
export function scrollScrubAllowed(): boolean {
  return !prefersReducedMotion() && !isNarrowViewport()
}

/**
 * Rotating a phone or resizing a window can cross the pin threshold in either
 * direction, so the sections that pin subscribe here and remount themselves
 * instead of staying stuck with whatever mode was picked at load.
 */
export function onScrubModeChange(handler: (allowed: boolean) => void): () => void {
  const queries = [
    window.matchMedia(SCRUB_QUERY),
    window.matchMedia('(prefers-reduced-motion: reduce)'),
  ]
  let last = scrollScrubAllowed()
  const onChange = (): void => {
    const next = scrollScrubAllowed()
    if (next === last) return
    last = next
    handler(next)
  }
  for (const query of queries) query.addEventListener('change', onChange)
  return () => {
    for (const query of queries) query.removeEventListener('change', onChange)
  }
}

export { ScrollTrigger }

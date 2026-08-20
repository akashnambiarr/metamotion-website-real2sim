import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SCRUB_MIN_VIEWPORT_REM } from '../config'

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

export function isNarrowViewport(): boolean {
  return window.matchMedia(`(max-width: ${SCRUB_MIN_VIEWPORT_REM}rem)`).matches
}

/** Scroll-scrub is allowed only on wide viewports with motion enabled. */
export function scrollScrubAllowed(): boolean {
  return !prefersReducedMotion() && !isNarrowViewport()
}

export { ScrollTrigger }

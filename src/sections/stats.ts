import { prefersReducedMotion } from '../lib/motion'

/**
 * Number reveal: counts each stat figure up once when the row enters the
 * viewport. Prefixed ranges ("10-20") keep the prefix and count the last term.
 * Reduced motion renders the final value untouched.
 */
export function initStats(): void {
  const figures = Array.from(
    document.querySelectorAll<HTMLElement>('.stat__figure[data-count]'),
  )
  if (figures.length === 0 || prefersReducedMotion()) return

  const animate = (el: HTMLElement): void => {
    const target = Number(el.dataset.count ?? '0')
    const prefix = el.dataset.prefix ?? ''
    const duration = 1200
    const start = performance.now()
    const ease = (t: number): number => 1 - Math.pow(1 - t, 3)
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      el.textContent = `${prefix}${Math.round(ease(t) * target)}`
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const seen = new WeakSet<Element>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !seen.has(entry.target)) {
          seen.add(entry.target)
          animate(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.6 },
  )
  figures.forEach((el) => observer.observe(el))
}

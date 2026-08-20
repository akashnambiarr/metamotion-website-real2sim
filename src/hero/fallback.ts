/** Poster fallback for no-WebGL2 environments and repeated context loss. */
export function showPoster(stage: HTMLElement): void {
  if (stage.querySelector('.marquee__poster')) return
  const img = document.createElement('img')
  img.src = '/hero-poster.webp'
  img.alt = ''
  img.className = 'marquee__poster'
  img.decoding = 'async'
  stage.prepend(img)
}

export function hidePoster(stage: HTMLElement): void {
  stage.querySelector('.marquee__poster')?.remove()
}

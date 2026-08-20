import { prefersReducedMotion } from '../lib/motion'

/**
 * Perturbation demo: three sliders drive CSS custom properties and one SVG
 * displacement filter on a static render. Filter values change on input
 * events only — nothing animates per-frame except the user-initiated jitter.
 */

function makeGrainTile(): string {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255)
    image.data[i] = v
    image.data[i + 1] = v
    image.data[i + 2] = v
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

function injectDisplacementFilter(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.innerHTML = `
    <filter id="sensor-noise" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
    </filter>`
  document.body.appendChild(svg)
  return svg
}

export function initPerturb(): void {
  const scene = document.getElementById('perturb-scene')
  const img = document.getElementById('perturb-img') as HTMLImageElement | null
  const grain = document.getElementById('perturb-grain')
  const light = document.getElementById('perturb-light') as HTMLInputElement | null
  const noise = document.getElementById('perturb-noise') as HTMLInputElement | null
  const jitter = document.getElementById('perturb-jitter') as HTMLInputElement | null
  if (!scene || !img || !grain || !light || !noise || !jitter) return

  const outputs = {
    light: document.getElementById('perturb-light-out'),
    noise: document.getElementById('perturb-noise-out'),
    jitter: document.getElementById('perturb-jitter-out'),
  }

  grain.style.backgroundImage = `url(${makeGrainTile()})`
  const filterSvg = injectDisplacementFilter()
  const displacement = filterSvg.querySelector('feDisplacementMap')

  // Ghost copy used as the reduced-motion double-exposure for jitter.
  const ghost = img.cloneNode(true) as HTMLImageElement
  ghost.removeAttribute('id')
  ghost.setAttribute('alt', '')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.classList.add('perturb__ghost')
  scene.appendChild(ghost)

  const setVar = (name: string, value: string): void => {
    scene.style.setProperty(name, value)
  }

  const applyLight = (): void => {
    const v = Number(light.value)
    setVar('--p-bright', String(1 + v / 260))
    setVar('--p-sat', String(1 - Math.abs(v) / 500))
    if (outputs.light) outputs.light.textContent = light.value
  }

  const applyNoise = (): void => {
    const v = Number(noise.value)
    setVar('--p-grain', String(v / 300))
    displacement?.setAttribute('scale', String((v / 100) * 8))
    img.style.filter =
      v > 2
        ? 'brightness(var(--p-bright)) saturate(var(--p-sat)) url(#sensor-noise)'
        : ''
    if (outputs.noise) outputs.noise.textContent = noise.value
  }

  const applyJitter = (): void => {
    const v = Number(jitter.value)
    setVar('--p-jit', `${(v / 100) * 5}px`)
    scene.classList.toggle('is-jittering', v > 2)
    if (outputs.jitter) outputs.jitter.textContent = jitter.value
  }

  light.addEventListener('input', applyLight)
  noise.addEventListener('input', applyNoise)
  jitter.addEventListener('input', applyJitter)

  // A quiet starting nudge under reduced motion keeps outputs truthful.
  if (prefersReducedMotion()) {
    applyLight()
    applyNoise()
    applyJitter()
  }
}

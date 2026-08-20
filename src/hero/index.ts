import * as THREE from 'three'
import {
  prefersReducedMotion,
  scrollScrubAllowed,
  ensureGsap,
  onScrubModeChange,
} from '../lib/motion'
import {
  cssToken,
  pickAntialias,
  pickDprCap,
  pickPointBudget,
  pickPowerPreference,
  shouldUsePoster,
} from '../lib/webgl'
import { buildLights, buildTabletopScene } from './scene'
import { samplePoints } from './sampling'
import { createMorphMaterial } from './morphMaterial'
import { buildHeroTimeline, wireScroll, wireSlider } from './heroScroll'
import { showPoster } from './fallback'

/** Parse any CSS color (incl. oklch tokens) through a 2d canvas. */
function tokenColor(name: string): THREE.Color {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  if (!ctx) return new THREE.Color(0.5, 0.5, 0.5)
  ctx.fillStyle = cssToken(name)
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
}

export function initHero(): void {
  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null
  const stage = canvas?.parentElement as HTMLElement | null
  const heroSection = document.getElementById('hero')
  const readoutFill = document.getElementById('hero-readout-fill')
  const cue = document.getElementById('hero-cue')
  const sliderWrap = document.getElementById('hero-slider-wrap')
  const slider = document.getElementById('hero-slider') as HTMLInputElement | null
  if (!canvas || !stage || !heroSection || !readoutFill || !cue || !sliderWrap || !slider) return

  if (shouldUsePoster()) {
    showPoster(stage)
    readoutFill.style.transform = 'scaleX(1)'
    cue.hidden = true
    return
  }

  const reduced = prefersReducedMotion()

  // ---- three setup ----
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: pickAntialias(),
    powerPreference: pickPowerPreference(),
  })
  renderer.setClearColor(tokenColor('--color-paper'), 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pickDprCap()))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30)
  const lookTarget = new THREE.Vector3(0.14, 0.16, -0.05)

  // The dolly runs between these two along the ray through the scene, scaled
  // out by `framing` when the viewport is too tall and narrow to hold the desk.
  const CAM_SCAN = new THREE.Vector3(0.85, 1.3, 2.9)
  const CAM_SIM = new THREE.Vector3(0.85, 1.0, 2.35)
  const dolly = { t: 0 }
  let framing = 1

  const applyCamera = (): void => {
    camera.position.lerpVectors(CAM_SCAN, CAM_SIM, dolly.t).multiplyScalar(framing)
  }
  applyCamera()

  const parts = buildTabletopScene({
    mesh: tokenColor('--canvas-mesh'),
    edge: tokenColor('--canvas-edge'),
    ground: tokenColor('--canvas-ground'),
  })
  scene.add(parts.group)
  for (const light of buildLights(tokenColor('--color-ink-2'), tokenColor('--color-paper-3'))) {
    scene.add(light)
  }

  const budget = pickPointBudget()
  const lidBudget = Math.round(budget * 0.12)
  const staticGeom = samplePoints(parts.staticMeshes, budget - lidBudget)
  const lidGeom = samplePoints(parts.lidMeshes, lidBudget)
  const morph = createMorphMaterial(
    tokenColor('--canvas-point'),
    tokenColor('--canvas-point-dim'),
    (18 * Math.min(window.devicePixelRatio, pickDprCap())) / 2,
  )
  parts.group.add(new THREE.Points(staticGeom, morph))
  parts.lidPivot.add(new THREE.Points(lidGeom, morph))

  // ---- render loop: continuous only while visible, dirty-flag otherwise ----
  let needsRender = true
  let inView = true
  const clock = new THREE.Clock()
  const lidRest = parts.lidPivot.rotation.x

  const render = (): void => {
    camera.lookAt(lookTarget)
    renderer.render(scene, camera)
  }

  const tick = (): void => {
    if (!inView || document.hidden) return
    if (!reduced) {
      const t = clock.getElapsedTime()
      morph.uniforms.uTime.value = t
      const progress = (morph.uniforms.uProgress as { value: number }).value
      const swayIn = THREE.MathUtils.smoothstep(progress, 0.85, 1)
      parts.lidPivot.rotation.x = lidRest + Math.sin(t * 0.9) * 0.05 * swayIn
      needsRender = true
    }
    if (needsRender) {
      needsRender = false
      render()
    }
  }
  const gsap = ensureGsap()
  gsap.ticker.add(tick)

  const markDirty = (): void => {
    needsRender = true
  }

  // ---- sizing ----
  const resize = (): void => {
    const { clientWidth, clientHeight } = stage
    if (clientWidth === 0 || clientHeight === 0) return
    renderer.setSize(clientWidth, clientHeight, false)
    const aspect = clientWidth / clientHeight
    camera.aspect = aspect

    // A phone held upright has barely half the horizontal field of view of a
    // laptop, so the 2.7m desk runs off both edges and the scan ends up
    // directly behind the headline. Dolly back, then shift the frustum down so
    // the scene sits above the text instead of inside it.
    const portrait = THREE.MathUtils.clamp((1.3 - aspect) / 0.75, 0, 1)
    framing = 1 + portrait * 0.45
    if (portrait > 0.01) {
      const lift = clientHeight * portrait * 0.15
      camera.setViewOffset(clientWidth, clientHeight, 0, lift, clientWidth, clientHeight)
    } else {
      camera.clearViewOffset()
    }
    applyCamera()
    camera.updateProjectionMatrix()
    markDirty()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(stage)
  resize()

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries.some((entry) => entry.isIntersecting)
      if (inView) markDirty()
    },
    { rootMargin: '80px' },
  )
  io.observe(stage)

  // ---- the morph timeline, scrubbed or slider-driven ----
  let scrubMode = scrollScrubAllowed()

  const onProgress = (progress: number): void => {
    readoutFill.style.transform = `scaleX(${progress.toFixed(4)})`
    if (scrubMode) cue.classList.toggle('is-hidden', progress > 0.04)
    markDirty()
  }

  const tl = buildHeroTimeline({
    morph,
    dolly,
    applyCamera,
    meshMaterials: parts.meshMaterials,
    edgeMaterials: parts.edgeMaterials,
    meshObjects: [
      ...parts.staticMeshes,
      ...parts.lidMeshes,
      ...parts.group.children.filter((c) => c instanceof THREE.LineSegments),
      ...parts.lidPivot.children.filter((c) => c instanceof THREE.LineSegments),
    ],
    onProgress,
  })

  let scrollTrigger: ReturnType<typeof wireScroll> | null = null
  if (scrubMode) {
    scrollTrigger = wireScroll(tl, heroSection, markDirty)
  } else {
    cue.hidden = true
    sliderWrap.hidden = false
    wireSlider(tl, slider, markDirty)
    if (reduced) {
      // Start at the finished simulation; the slider walks back to the scan.
      tl.progress(1)
      slider.value = '100'
    }
  }

  // ---- context loss ----
  let losses = 0
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    losses += 1
    showPoster(stage)
  })
  canvas.addEventListener('webglcontextrestored', () => {
    if (losses > 1) {
      destroy()
      return
    }
    stage.querySelector('.marquee__poster')?.remove()
    markDirty()
  })

  const onVisibility = (): void => {
    if (!document.hidden) markDirty()
  }
  document.addEventListener('visibilitychange', onVisibility)

  function destroy(): void {
    gsap.ticker.remove(tick)
    scrollTrigger?.kill()
    tl.kill()
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    staticGeom.dispose()
    lidGeom.dispose()
    morph.dispose()
    parts.meshMaterials.forEach((m) => m.dispose())
    parts.edgeMaterials.forEach((m) => m.dispose())
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        ;(object.geometry as THREE.BufferGeometry).dispose()
      }
    })
    renderer.dispose()
  }

  import.meta.hot?.dispose(destroy)
}

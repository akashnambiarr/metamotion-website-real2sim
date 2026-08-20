import type * as THREE from 'three'
import { ensureGsap, ScrollTrigger } from '../lib/motion'

export interface HeroTimelineParts {
  morph: THREE.ShaderMaterial
  /** Normalized dolly position; the caller turns it into a camera transform. */
  dolly: { t: number }
  applyCamera: () => void
  meshMaterials: THREE.MeshStandardMaterial[]
  edgeMaterials: THREE.LineBasicMaterial[]
  meshObjects: THREE.Object3D[]
  onProgress: (progress: number) => void
}

/**
 * One timeline is the single source of truth for the morph, the camera dolly,
 * and the mesh/edge fade. Scroll mode scrubs it; slider mode sets progress on
 * the same object, so both paths exercise identical code. The dolly is a
 * normalized 0-1 so a resize can re-frame the shot without fighting the tween.
 */
export function buildHeroTimeline(parts: HeroTimelineParts): gsap.core.Timeline {
  const gsap = ensureGsap()
  const fade = { mesh: 0, edge: 0 }

  const applyFade = (): void => {
    const anyVisible = fade.mesh > 0.01
    for (const object of parts.meshObjects) object.visible = anyVisible
    for (const m of parts.meshMaterials) m.opacity = fade.mesh * 0.98
    for (const m of parts.edgeMaterials) m.opacity = fade.edge * 0.9
  }

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'none' },
    onUpdate: () => parts.onProgress(tl.progress()),
  })

  tl.to(parts.morph.uniforms.uProgress as { value: number }, { value: 1, duration: 1 }, 0)
    .to(parts.dolly, { t: 1, duration: 1, onUpdate: parts.applyCamera }, 0)
    .to(fade, { mesh: 1, duration: 0.5, onUpdate: applyFade }, 0.4)
    .to(fade, { edge: 1, duration: 0.45, onUpdate: applyFade }, 0.34)

  return tl
}

export function wireScroll(
  tl: gsap.core.Timeline,
  trigger: HTMLElement,
  onRender: () => void,
): ScrollTrigger {
  ensureGsap()
  return ScrollTrigger.create({
    animation: tl,
    trigger,
    start: 'top top',
    end: '+=160%',
    scrub: 0.6,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: onRender,
  })
}

export function wireSlider(
  tl: gsap.core.Timeline,
  slider: HTMLInputElement,
  onRender: () => void,
): void {
  slider.addEventListener('input', () => {
    tl.progress(Number(slider.value) / 100)
    onRender()
  })
}

import { ensureGsap, onScrubModeChange, scrollScrubAllowed } from '../lib/motion'

/**
 * Hand-built SVG line art of one desk scene, drawn in three scrubbed acts:
 * scan points appear (capture), outlines and joints draw on (reconstruct),
 * then the sim viewport brackets and sensor marks land (simulate).
 * On viewports too small to pin, or under reduced motion, the finished drawing
 * is shown static — a pinned column taller than the screen would strand the
 * third stage below the fold with no way to scroll to it.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

function make<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  parent: SVGElement,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  parent.appendChild(node)
  return node
}

// Small deterministic generator so the scan points render identically every load.
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }
}

interface Built {
  points: SVGCircleElement[]
  outlines: SVGElement[]
  camera: SVGGElement
  simMarks: SVGGElement
  stackTop: SVGRectElement
  stackMid: SVGRectElement
  lid: SVGLineElement
  jointArc: SVGPathElement
}

function buildScene(svg: SVGSVGElement): Built {
  const root = make('g', {}, svg)

  // capture act: camera + frustum
  const camera = make('g', { class: 'pl-cam' }, root)
  make('rect', { x: '28', y: '30', width: '26', height: '18', rx: '3', class: 'pl-line' }, camera)
  make('circle', { cx: '41', cy: '39', r: '4', class: 'pl-line' }, camera)
  make('line', { x1: '54', y1: '34', x2: '150', y2: '210', class: 'pl-frustum' }, camera)
  make('line', { x1: '54', y1: '44', x2: '370', y2: '250', class: 'pl-frustum' }, camera)

  // desk
  const outlines: SVGElement[] = []
  const desk = make('line', { x1: '40', y1: '300', x2: '380', y2: '300', class: 'pl-line pl-draw', pathLength: '1' }, root)
  outlines.push(desk)

  // mug with handle
  const mug = make('path', {
    d: 'M 72 262 L 72 296 Q 72 300 76 300 L 106 300 Q 110 300 110 296 L 110 262 Z M 110 270 Q 124 272 122 282 Q 120 290 110 288',
    class: 'pl-line pl-draw',
    pathLength: '1',
  }, root)
  outlines.push(mug)

  // stack of three boxes: instance-split means the top two shift apart
  const stackBase = make('rect', { x: '152', y: '272', width: '76', height: '28', rx: '2', class: 'pl-line pl-draw', pathLength: '1' }, root)
  const stackMid = make('rect', { x: '156', y: '246', width: '70', height: '26', rx: '2', class: 'pl-line pl-draw', pathLength: '1' }, root)
  const stackTop = make('rect', { x: '160', y: '222', width: '64', height: '24', rx: '2', class: 'pl-line pl-draw', pathLength: '1' }, root)
  outlines.push(stackBase, stackMid, stackTop)

  // laptop: base + lid hinged at (266, 290)
  const laptopBase = make('rect', { x: '262', y: '290', width: '92', height: '10', rx: '2', class: 'pl-line pl-draw', pathLength: '1' }, root)
  const lid = make('line', { x1: '266', y1: '290', x2: '266', y2: '218', class: 'pl-line pl-draw pl-lid', pathLength: '1' }, root)
  const jointArc = make('path', { d: 'M 266 262 A 28 28 0 0 1 290 282', class: 'pl-acc pl-draw', pathLength: '1' }, root)
  outlines.push(laptopBase, lid, jointArc)

  // scan points sampled loosely over the objects and desk
  const rand = lcg(97)
  const points: SVGCircleElement[] = []
  const clusters: Array<[number, number, number, number, number]> = [
    [72, 110, 262, 300, 26], // mug
    [152, 228, 222, 300, 34], // stack
    [262, 354, 218, 300, 30], // laptop
    [40, 380, 296, 304, 26], // desk edge
  ]
  for (const [x0, x1, y0, y1, count] of clusters) {
    for (let i = 0; i < count; i += 1) {
      const cx = x0 + rand() * (x1 - x0)
      const cy = y0 + rand() * (y1 - y0)
      points.push(make('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: '1.6', class: 'pl-pt' }, root))
    }
  }

  // simulate act: viewport brackets, parallel-env echo frames, sensor marks
  const simMarks = make('g', { class: 'pl-sim' }, root)
  make('path', { d: 'M 34 208 L 34 190 L 52 190', class: 'pl-acc' }, simMarks)
  make('path', { d: 'M 386 190 L 404 190 L 404 208', class: 'pl-acc' }, simMarks)
  make('path', { d: 'M 404 306 L 404 324 L 386 324', class: 'pl-acc' }, simMarks)
  make('path', { d: 'M 52 324 L 34 324 L 34 306', class: 'pl-acc' }, simMarks)
  make('rect', { x: '46', y: '178', width: '358', height: '146', rx: '4', class: 'pl-echo' }, simMarks)
  make('rect', { x: '58', y: '166', width: '358', height: '146', rx: '4', class: 'pl-echo pl-echo--far' }, simMarks)
  // light source mark with rays
  make('circle', { cx: '340', cy: '196', r: '6', class: 'pl-acc' }, simMarks)
  make('line', { x1: '340', y1: '184', x2: '340', y2: '178', class: 'pl-acc' }, simMarks)
  make('line', { x1: '350', y1: '188', x2: '355', y2: '183', class: 'pl-acc' }, simMarks)
  make('line', { x1: '330', y1: '188', x2: '325', y2: '183', class: 'pl-acc' }, simMarks)

  return { points, outlines, camera, simMarks, stackTop, stackMid, lid, jointArc }
}

export function initPipeline(): void {
  const section = document.getElementById('pipeline')
  const pin = document.getElementById('pipeline-pin')
  const svg = document.getElementById('pipeline-svg') as SVGSVGElement | null
  const stages = Array.from(document.querySelectorAll<HTMLElement>('.pipeline__stage'))
  if (!section || !pin || !svg || stages.length === 0) return

  const built = buildScene(svg)
  const gsap = ensureGsap()

  const animated = [
    ...built.points,
    ...built.outlines,
    built.simMarks,
    built.camera,
    built.stackTop,
    built.stackMid,
    built.lid,
  ]

  const setStage = (index: number): void => {
    stages.forEach((stage, i) => stage.classList.toggle('is-active', i === index))
  }

  let tl: gsap.core.Timeline | null = null

  const mountScrub = (): void => {
    svg.classList.remove('pipeline__svg--done')
    section.classList.add('pipeline--live')
    setStage(0)

    gsap.set(built.points, { opacity: 0 })
    gsap.set(built.outlines, { strokeDashoffset: 1 })
    gsap.set(built.simMarks, { opacity: 0 })
    gsap.set(built.camera, { opacity: 0 })

    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: '+=140%',
        scrub: 0.5,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setStage(self.progress < 0.33 ? 0 : self.progress < 0.7 ? 1 : 2)
        },
      },
    })

    tl.to(built.camera, { opacity: 1, duration: 0.06 }, 0)
      .to(built.points, { opacity: 0.9, duration: 0.2, stagger: 0.0012 }, 0.04)
      .to(built.outlines, { strokeDashoffset: 0, duration: 0.3, stagger: 0.02 }, 0.34)
      .to(built.points, { opacity: 0.18, duration: 0.2 }, 0.42)
      .to(built.stackTop, { x: -7, duration: 0.08 }, 0.52)
      .to(built.stackMid, { x: 5, duration: 0.08 }, 0.52)
      .to(built.lid, { rotation: 18, svgOrigin: '266 290', duration: 0.1 }, 0.56)
      .to(built.camera, { opacity: 0.25, duration: 0.1 }, 0.7)
      .to(built.simMarks, { opacity: 1, duration: 0.16 }, 0.72)

    void document.fonts?.ready.then(() => tl?.scrollTrigger?.refresh())
  }

  const unmountScrub = (): void => {
    // kill(true) reverts the pin so the section stops reserving scroll distance
    tl?.scrollTrigger?.kill(true)
    tl?.kill()
    tl = null
    section.classList.remove('pipeline--live')
    stages.forEach((stage) => stage.classList.remove('is-active'))
    gsap.set(animated, { clearProps: 'all' })
    svg.classList.add('pipeline__svg--done')
  }

  if (scrollScrubAllowed()) mountScrub()
  else unmountScrub()

  onScrubModeChange((allowed) => {
    if (allowed) mountScrub()
    else unmountScrub()
  })
}

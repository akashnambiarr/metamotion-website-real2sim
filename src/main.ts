import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/sections.css'
import { initForm } from './sections/form'
import { initStats } from './sections/stats'
import { initPerturb } from './sections/perturb'
import { initPipeline } from './sections/pipeline'

initForm()
initStats()
initPipeline()

// The perturbation demo builds its grain tile only when the section approaches.
const perturbSection = document.getElementById('perturb')
if (perturbSection) {
  const observer = new IntersectionObserver(
    (entries, self) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        self.disconnect()
        initPerturb()
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(perturbSection)
}

// The hero is above the fold, so start loading immediately after first paint;
// the dynamic import keeps three.js out of the critical path.
requestAnimationFrame(() => {
  void import('./hero').then((hero) => hero.initHero())
})

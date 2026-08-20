// Form submissions POST here. Create a free form at https://formspree.io
// (or Basin / Web3Forms — same request shape) and paste the endpoint URL.
// While it contains REPLACE_ME the form shows a "not wired up yet" notice.
export const FORM_ENDPOINT = 'https://formspree.io/f/REPLACE_ME'

export const HERO_POINTS_DESKTOP = 50_000
export const HERO_POINTS_MOBILE = 18_000
export const DPR_CAP_DESKTOP = 2
export const DPR_CAP_MOBILE = 1.5

// Pinned scroll-scrubbing needs a viewport that can hold a whole pinned section.
// The width matches the 56rem two-column breakpoint: below it the pipeline stacks
// into a ~900px column that no phone can show while pinned. Outside these bounds
// the hero is slider-driven and the pipeline drawing is static.
export const SCRUB_MIN_VIEWPORT_REM = 56
export const SCRUB_MIN_HEIGHT_REM = 40

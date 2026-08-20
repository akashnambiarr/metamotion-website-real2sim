import { FORM_ENDPOINT } from '../config'

type FormPhase = 'idle' | 'submitting' | 'success' | 'error'

const MIN_SPINNER_MS = 400

export function initForm(): void {
  const form = document.getElementById('interest-form') as HTMLFormElement | null
  const submit = document.getElementById('interest-submit') as HTMLButtonElement | null
  const status = document.getElementById('interest-status')
  const email = document.getElementById('f-email') as HTMLInputElement | null
  const emailError = document.getElementById('f-email-error')
  if (!form || !submit || !status || !email || !emailError) return

  const submitLabel = submit.textContent
  let phase: FormPhase = 'idle'
  let emailTouched = false

  const endpointReady = !FORM_ENDPOINT.includes('REPLACE_ME')

  function validateEmail(): boolean {
    if (!email || !emailError) return false
    const bad = email.validity.valueMissing || email.validity.typeMismatch
    if (bad && emailTouched) {
      email.setAttribute('aria-invalid', 'true')
      email.setAttribute('aria-describedby', 'f-email-error')
      emailError.textContent = email.validity.valueMissing
        ? 'We need an email to reply to. Add your work address.'
        : 'That address is missing an @ or a domain. Check the format.'
      return false
    }
    email.removeAttribute('aria-invalid')
    emailError.textContent = ''
    return !bad
  }

  email.addEventListener('blur', () => {
    emailTouched = true
    validateEmail()
  })
  email.addEventListener('input', () => {
    if (emailTouched) validateEmail()
  })

  function setPhase(next: FormPhase, message = ''): void {
    phase = next
    if (!submit || !status || !form) return
    status.classList.toggle('is-error', next === 'error')
    status.classList.toggle('is-success', next === 'success')
    status.textContent = message
    if (next === 'submitting') {
      submit.dataset.state = 'submitting'
      submit.disabled = true
      submit.textContent = 'Sending'
    } else {
      delete submit.dataset.state
      submit.disabled = false
      submit.textContent = submitLabel
    }
    form.classList.toggle('is-done', next === 'success')
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (phase === 'submitting') return

    emailTouched = true
    if (!validateEmail()) {
      email.focus()
      return
    }
    if (!form.reportValidity()) return

    if (!endpointReady) {
      setPhase(
        'error',
        'The form isn’t wired up yet. Set FORM_ENDPOINT in src/config.ts (see website/README.md).',
      )
      return
    }

    setPhase('submitting')
    const started = performance.now()
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      })
      const elapsed = performance.now() - started
      if (elapsed < MIN_SPINNER_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPINNER_MS - elapsed))
      }
      if (!response.ok) throw new Error(`status ${response.status}`)
      setPhase('success', 'Got it. Expect a reply from a founder.')
    } catch {
      setPhase(
        'error',
        'That didn’t send. Check your connection and try again in a moment.',
      )
    }
  })
}

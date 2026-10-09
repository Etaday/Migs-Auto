/** Scroll to the field that still needs filling, highlight it and focus it. */
export function goToField(form: HTMLFormElement, field: string) {
  const q = (sel: string) => form.querySelector<HTMLElement>(sel)
  const target =
    field === 'items' ? q('.bgrid__services')
    : field === 'startTime' ? q('.bgrid__time')
    : (q(`[name="${field}"]`)?.closest<HTMLElement>('.cgrid__field, .bgrid__agree') ?? q(`[name="${field}"]`))
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('is-missing')
  const clear = () => target.classList.remove('is-missing')
  target.addEventListener('input', clear, { once: true })
  target.addEventListener('change', clear, { once: true })
  target.addEventListener('click', clear, { once: true })
  window.setTimeout(clear, 6000)
  const focusable = target.matches('input:not([type=hidden]),select,textarea,button') ? target : target.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea,button')
  window.setTimeout(() => focusable?.focus({ preventScroll: true }), 350)
}

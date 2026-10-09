import type { Lang } from '@/lib/faqBot'

/**
 * Voice for the chat assistant, built on the browser's own speech tools (no
 * account, no key, no cost). Listening needs Chrome, Edge or Safari; speaking
 * works in every modern browser. The voices come from the visitor's device.
 */

type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void; abort: () => void
}
type RecCtor = new () => Rec

const recCtor = (): RecCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canListen = () => typeof window !== 'undefined' && recCtor() !== null
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Asks the browser for the microphone first, so a block or a missing mic is reported clearly. */
export async function checkMic(): Promise<'ok' | 'denied' | 'none' | 'unsupported'> {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    s.getTracks().forEach((t) => t.stop())
    return 'ok'
  } catch (e) {
    const n = (e as { name?: string }).name
    return n === 'NotFoundError' || n === 'OverconstrainedError' ? 'none' : 'denied'
  }
}

const LOCALE: Record<Lang, string> = { en: 'en-US', fil: 'fil-PH' }

/** Starts one listening turn. Returns a function that stops it. */
export function listen(lang: Lang, cb: { onText: (t: string) => void; onEnd: (heard: boolean) => void; onError: (code: string) => void }): () => void {
  const R = recCtor()
  if (!R) { cb.onError('unsupported'); return () => undefined }
  const r = new R()
  r.lang = LOCALE[lang]
  r.interimResults = false
  r.continuous = false
  r.maxAlternatives = 1
  let heard = false
  r.onresult = (e) => {
    const t = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim()
    if (t) { heard = true; cb.onText(t) }
  }
  r.onerror = (e) => cb.onError(e.error)
  r.onend = () => cb.onEnd(heard)
  try { r.start() } catch { cb.onError('busy') }
  return () => { try { r.abort() } catch { /* already stopped */ } }
}

const clean = (t: string) => t.replace(/https?:\/\/\S+/g, '').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim()

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

const norm = (l: string) => l.replace('_', '-').toLowerCase()
const matches = (v: SpeechSynthesisVoice, lang: Lang) => {
  const l = norm(v.lang)
  return lang === 'fil' ? /^(fil|tl)\b/.test(l) : l.startsWith('en')
}
/** Better-sounding voices first: network, natural and enhanced ones beat the basic built-in. */
const quality = (v: SpeechSynthesisVoice) => (/natural|neural|premium|enhanced|google|online/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1)

/** The voices this device offers for a language, best first. */
export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  return window.speechSynthesis.getVoices().filter((v) => matches(v, lang)).sort((a, b) => quality(b) - quality(a) || a.name.localeCompare(b.name))
}

/** Calls fn now and whenever the browser finishes loading its voice list. */
export function onVoices(fn: () => void) {
  if (!canSpeak()) return () => undefined
  fn()
  window.speechSynthesis.addEventListener('voiceschanged', fn)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', fn)
}

const PREF = (lang: Lang) => `jd-voice-${lang}`
export const savedVoice = (lang: Lang) => { try { return localStorage.getItem(PREF(lang)) || '' } catch { return '' } }
export const saveVoice = (lang: Lang, uri: string) => { try { localStorage.setItem(PREF(lang), uri) } catch { /* storage unavailable */ } }

/** Reads text aloud in the chosen voice and language; calls done when it finishes. */
export function speak(text: string, lang: Lang, done?: () => void) {
  if (!canSpeak()) { done?.(); return }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(clean(text))
  const list = voicesFor(lang)
  const v = list.find((x) => x.voiceURI === savedVoice(lang)) ?? list[0]
  if (v) { u.voice = v; u.lang = v.lang } else u.lang = LOCALE[lang]
  u.rate = 1
  u.onend = () => done?.()
  u.onerror = () => done?.()
  synth.speak(u)
}

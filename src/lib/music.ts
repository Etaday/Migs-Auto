import { motionReduced } from '@/lib/a11y'

/**
 * The studio's background music. There is no on-screen button: it starts by
 * itself the first time the visitor taps, clicks or presses a key (browsers
 * do not allow sound before that), fades in quietly and repeats. Switching it
 * off is in the Accessibility menu, and the choice is remembered.
 */

const SRC = '/audio/jps-music.mp3'
const KEY = 'jd-music-v2'
const VOLUME = 0.3
const EVENT = 'jd-music-change'

let audio: HTMLAudioElement | null = null
let fade: number | undefined
let playing = false
let starting = false
let held = false // a voice conversation is on: music stays off, then comes back
let resumeAfter = false

export const musicWanted = () => {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
export const musicPlaying = () => playing

const announce = () => window.dispatchEvent(new Event(EVENT))
export const onMusicChange = (fn: () => void) => {
  window.addEventListener(EVENT, fn)
  return () => window.removeEventListener(EVENT, fn)
}

function ramp(el: HTMLAudioElement, to: number, done?: () => void) {
  window.clearInterval(fade)
  if (motionReduced()) { el.volume = to; done?.(); return }
  fade = window.setInterval(() => {
    const step = to > el.volume ? 0.02 : -0.02
    const next = Math.min(1, Math.max(0, el.volume + step))
    el.volume = next
    if (Math.abs(next - to) < 0.021) { el.volume = to; window.clearInterval(fade); done?.() }
  }, 60)
}

export function startMusic() {
  if (playing || starting || held) return
  if (!audio) {
    audio = new Audio()
    audio.preload = 'none'
    audio.src = SRC
    audio.loop = true
    audio.volume = 0
  }
  const el = audio
  starting = true
  void el.play().then(() => { starting = false; playing = true; ramp(el, VOLUME); announce() }).catch(() => { starting = false; playing = false })
}

export function stopMusic() {
  playing = false
  if (audio) { const el = audio; ramp(el, 0, () => el.pause()) }
  announce()
}

/** The Accessibility switch: remembers the choice and acts on it straight away. */
export function setMusicWanted(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* storage unavailable */ }
  if (on) startMusic()
  else stopMusic()
  announce()
}

/** While the visitor talks to the voice assistant the music goes quiet; the choice they made is untouched. */
export function holdMusic() {
  if (held) return
  held = true
  resumeAfter = playing
  if (playing) stopMusic()
}

/** The conversation is over: bring the music back only if it was playing before. */
export function releaseMusic() {
  if (!held) return
  held = false
  if (resumeAfter && musicWanted()) startMusic()
  resumeAfter = false
}

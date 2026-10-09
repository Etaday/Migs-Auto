import { useEffect } from 'react'
import { musicPlaying, musicWanted, onMusicChange, startMusic } from '@/lib/music'

/** Starts the background music as early as the browser allows: at once if it permits, otherwise on the first tap, click or key press. Renders nothing. */
export default function MusicAutoplay() {
  useEffect(() => {
    // Desktop browsers differ on which events unlock sound (Safari wants click, Chrome and Firefox also accept mousedown), so listen
    // for all of them in the capture phase, where no page element can swallow them, and keep trying until the music is playing.
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'touchend', 'keydown'] as const
    const go = () => { if (musicWanted() && !musicPlaying()) startMusic() }
    const off = () => events.forEach((e) => window.removeEventListener(e, go, true))
    events.forEach((e) => window.addEventListener(e, go, { capture: true, passive: true }))
    const stop = onMusicChange(() => { if (musicPlaying()) off() })
    go() // allowed straight away on sites the visitor has played sound on before; harmless when refused
    return () => { off(); stop() }
  }, [])
  return null
}

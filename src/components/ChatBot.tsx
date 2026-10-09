import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChatCircleDots, X, PaperPlaneTilt, Microphone, SpeakerHigh, SpeakerSlash } from '@/components/slab'
import { answer, STARTERS, WELCOME, type BotLink, type Lang } from '@/lib/faqBot'
import { listVehicles } from '@/lib/db'
import type { Vehicle } from '@/types/vehicle'
import { canListen, canSpeak, checkMic, listen, onVoices, saveVoice, savedVoice, speak, stopSpeaking, voicesFor } from '@/lib/voice'

/**
 * ChatBot - a floating FAQ assistant. Answers come from the studio's own
 * prices, policies and FAQs (see lib/faqBot.ts); it is not an AI and it
 * hands anything unknown to the team.
 */

type Msg = { id: number; from: 'bot' | 'you'; text: string; links?: BotLink[] }


function LinkBtn({ l, onGo }: { l: BotLink; onGo: () => void }) {
  return l.to ? (
    <Link className="chat__link" to={l.to} onClick={onGo}>{l.label}</Link>
  ) : (
    <a className="chat__link" href={l.href} target={l.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{l.label}</a>
  )
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  useEffect(() => { if (open) listVehicles().then(setVehicles).catch(() => setVehicles([])) }, [open])
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'bot', text: WELCOME[/^(fil|tl)\b/i.test(navigator.language) ? 'fil' : 'en'] }])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  // Starts in Filipino for browsers set to Filipino, then follows what the visitor types.
  const [lang, setLang] = useState<Lang>(() => (/^(fil|tl)\b/i.test(navigator.language) ? 'fil' : 'en'))
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const idRef = useRef(1)
  // Voice: tap the mic to talk; replies are read aloud and the mic reopens for the next question.
  const [talking, setTalking] = useState(false)
  const [listening, setListening] = useState(false)
  const [muted, setMuted] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const talkRef = useRef(false)
  const mutedRef = useRef(false)
  const langRef = useRef<Lang>(lang)
  const stopRef = useRef<() => void>(() => undefined)
  const hearRef = useRef<() => void>(() => undefined)
  const voiceOk = canListen()
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([])
  const [voicePick, setVoicePick] = useState('')
  useEffect(() => onVoices(() => setVoiceList(voicesFor(langRef.current))), [])
  useEffect(() => {
    const l = voicesFor(lang)
    setVoiceList(l)
    setVoicePick(savedVoice(lang) || l[0]?.voiceURI || '')
  }, [lang])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [msgs, typing, open])
  useEffect(() => {
    if (open) inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => { langRef.current = lang }, [lang])
  useEffect(() => { mutedRef.current = muted; if (muted) stopSpeaking() }, [muted])

  const stopTalking = () => {
    talkRef.current = false
    setTalking(false)
    setListening(false)
    stopRef.current()
    stopSpeaking()
  }
  // Closing the chat ends the conversation.
  useEffect(() => { if (!open) stopTalking() }, [open])
  useEffect(() => stopTalking, [])

  const hear = () => {
    setVoiceNote('')
    setListening(true)
    stopRef.current = listen(langRef.current, {
      onText: (t) => askRef.current(t, true),
      onEnd: (heard) => {
        setListening(false)
        if (!heard && talkRef.current) { setVoiceNote(langRef.current === 'fil' ? 'Walang narinig. Pindutin ulit ang mic.' : 'I did not hear anything. Tap the mic to try again.'); stopTalking() }
      },
      onError: (code) => {
        setListening(false)
        const fil = langRef.current === 'fil'
        const say = (en: string, tl: string) => setVoiceNote(fil ? tl : en)
        if (code === 'language-not-supported' && langRef.current === 'fil') {
          // This browser has no Filipino listening; carry on in English.
          langRef.current = 'en'
          setVoiceNote('Filipino listening is not available here, so I will listen in English.')
          if (talkRef.current) hearRef.current()
          return
        }
        if (code === 'not-allowed' || code === 'service-not-allowed') say('The microphone is blocked. Click the lock icon in the address bar, allow Microphone, then reload.', 'Naka-block ang mikropono. I-allow ito sa lock icon sa address bar, tapos i-reload.')
        else if (code === 'audio-capture') say('No microphone was found on this device.', 'Walang nakitang mikropono.')
        else if (code === 'network') say('Voice needs an internet connection. Please check yours and try again.', 'Kailangan ng internet para sa boses. Subukan ulit.')
        else if (code === 'unsupported') setVoiceNote('Voice needs Chrome, Edge or Safari.')
        else if (code !== 'no-speech' && code !== 'aborted') setVoiceNote(`Voice problem (${code}). Please try again.`)
        if (code !== 'no-speech') stopTalking()
      },
    })
  }
  hearRef.current = hear

  const toggleTalk = async () => {
    if (talkRef.current) { stopTalking(); return }
    talkRef.current = true
    setTalking(true)
    setVoiceNote(langRef.current === 'fil' ? 'Humihingi ng pahintulot sa mikropono...' : 'Waiting for microphone permission...')
    stopSpeaking()
    const mic = await checkMic()
    if (!talkRef.current) return
    if (mic === 'denied') { setVoiceNote(langRef.current === 'fil' ? 'Naka-block ang mikropono. I-allow ito sa lock icon sa address bar, tapos i-reload.' : 'The microphone is blocked. Click the lock icon in the address bar, allow Microphone, then reload.'); stopTalking(); return }
    if (mic === 'none') { setVoiceNote(langRef.current === 'fil' ? 'Walang nakitang mikropono.' : 'No microphone was found on this device.'); stopTalking(); return }
    hear()
  }

  const ask = (q: string, byVoice = false) => {
    const question = q.trim()
    if (!question || typing) return
    setMsgs((m) => [...m, { id: idRef.current++, from: 'you', text: question }])
    setText('')
    setTyping(true)
    const reply = answer(question, lang, vehicles)
    if (reply.lang) setLang(reply.lang)
    window.setTimeout(() => {
      setMsgs((m) => [...m, { id: idRef.current++, from: 'bot', ...reply }])
      setTyping(false)
      const again = () => { if (talkRef.current) hearRef.current() }
      if (byVoice && !mutedRef.current && canSpeak()) speak(reply.text, reply.lang ?? langRef.current, again)
      else if (byVoice) again()
    }, 450)
  }
  const askRef = useRef(ask)
  askRef.current = ask

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(text)
  }

  return (
    <>
      <button type="button" className={`chat__fab${open ? ' is-hidden' : ''}`} onClick={() => setOpen(true)} aria-label={voiceOk ? 'Open chat and voice assistant' : 'Open chat assistant'} aria-expanded={open}>
        <ChatCircleDots size={26} weight="fill" aria-hidden="true" />
        {voiceOk && <span className="chat__fab-mic" aria-hidden="true"><Microphone size={13} weight="fill" /></span>}
      </button>

      {open && (
        <section className="chat" role="dialog" aria-label="Chat assistant">
          <header className="chat__head">
            <div>
              <b>Migs Auto assistant</b>
              <small>{lang === 'fil' ? 'Awtomatikong sagot tungkol sa mga sasakyan namin' : 'Automated answers about our vehicles'}</small>
            </div>
            {canSpeak() && voiceOk && (
              <button type="button" className="chat__close" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Turn spoken replies on' : 'Turn spoken replies off'} aria-pressed={muted} title={muted ? 'Spoken replies off' : 'Spoken replies on'}>
                {muted ? <SpeakerSlash size={18} weight="bold" /> : <SpeakerHigh size={18} weight="bold" />}
              </button>
            )}
            <button type="button" className="chat__close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} weight="bold" /></button>
          </header>

          <div className="chat__log" ref={logRef} role="log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`chat__msg chat__msg--${m.from}`}>
                <p>{m.text}</p>
                {m.links && (
                  <span className="chat__links">
                    {m.links.map((l) => <LinkBtn key={l.label} l={l} onGo={() => setOpen(false)} />)}
                  </span>
                )}
              </div>
            ))}
            {typing && <div className="chat__msg chat__msg--bot chat__typing" aria-label="Assistant is typing"><i /><i /><i /></div>}
            {msgs.length === 1 && (
              <div className="chat__starters">
                {STARTERS[lang].map((s) => <button key={s} type="button" onClick={() => ask(s)}>{s}</button>)}
              </div>
            )}
          </div>

          {(talking || voiceNote) && (
            <p className="chat__voice" role="status">{voiceNote || (listening ? (lang === 'fil' ? 'Nakikinig po...' : 'Listening...') : typing ? '...' : (lang === 'fil' ? 'Sumasagot...' : 'Speaking...'))}</p>
          )}
          {voiceOk && (
            <div className="chat__voicebar">
              <span role="group" aria-label="Voice language">
                <button type="button" className={lang === 'en' ? 'is-on' : ''} onClick={() => { setLang('en'); stopSpeaking() }} aria-pressed={lang === 'en'}>EN</button>
                <button type="button" className={lang === 'fil' ? 'is-on' : ''} onClick={() => { setLang('fil'); stopSpeaking() }} aria-pressed={lang === 'fil'}>FIL</button>
              </span>
              {canSpeak() && (voiceList.length > 0 ? (
                <select value={voicePick} aria-label="Assistant voice" onChange={(e) => {
                  setVoicePick(e.target.value); saveVoice(lang, e.target.value)
                  speak(lang === 'fil' ? 'Kumusta po! Ito ang boses ko.' : 'Hello! This is my voice.', lang)
                }}>
                  {voiceList.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                </select>
              ) : (
                <small>{lang === 'fil' ? 'Walang Filipino na boses sa device na ito. Gagamitin ang default.' : 'No voices found for this language on this device.'}</small>
              ))}
            </div>
          )}
          <form className="chat__form" onSubmit={submit}>
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={lang === 'fil' ? 'I-type ang tanong ninyo' : 'Type your question'} aria-label={lang === 'fil' ? 'Tanong ninyo' : 'Your question'} maxLength={200} />
            {voiceOk && (
              <button type="button" className={`chat__mic${talking ? ' is-on' : ''}${listening ? ' is-listening' : ''}`} onClick={toggleTalk} aria-label={talking ? 'Stop voice conversation' : 'Talk to the assistant'} aria-pressed={talking}>
                <Microphone size={18} weight="fill" />
              </button>
            )}
            <button type="submit" aria-label="Send" disabled={!text.trim() || typing}><PaperPlaneTilt size={18} weight="fill" /></button>
          </form>
        </section>
      )}
    </>
  )
}

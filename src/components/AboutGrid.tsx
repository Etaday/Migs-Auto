import { useEffect, useState, type CSSProperties } from 'react'
import { Phone, NotePencil, VideoCamera, Scissors, PaperPlaneTilt, EnvelopeSimple, MapPin, type Icon } from '@/components/slab'
import ThemedImg from '@/components/ThemedImg'
import { profile } from '@/data/profile'

/**
 * AboutGrid - the About view as a fixed viewport.
 *
 * One glass sheet, two columns: who the studio is on the left, the mark on
 * the right. Sized to the panel, so nothing here scrolls.
 */

type Capability = {
  index: string
  title: string
  Icon: Icon
}

const CAPABILITIES: Capability[] = [
  { index: '01', title: 'Glass and 360 photo booths', Icon: NotePencil },
  { index: '02', title: 'Cake mapping and event coverage', Icon: VideoCamera },
  { index: '03', title: 'Studio and food photography', Icon: Scissors },
  { index: '04', title: 'Fast delivery, ready to share', Icon: PaperPlaneTilt },
]


/** Current time in Kuwait (Asia/Kuwait, UTC+3, no daylight saving), refreshed every 30s. */
const kuwaitTime = () =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuwait', hour: 'numeric', minute: '2-digit' }).format(new Date())

function useKuwaitTime() {
  const [time, setTime] = useState(kuwaitTime)
  useEffect(() => {
    const id = window.setInterval(() => setTime(kuwaitTime()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

export default function AboutGrid() {
  const time = useKuwaitTime()
  return (
    <section className="pgrid agrid" aria-labelledby="about-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">About</span>
        <h1 className="pgrid__title" id="about-title">
          About the studio.
        </h1>
        <p className="pgrid__lede">
          We bring photo booths, cake mapping and photo and video coverage to events, and shoot studio and food photography.
        </p>
      </header>

      <div className="home__glass agrid__glass">
        <div className="agrid__copy">
          <p className="agrid__lead">
            Great events deserve great memories.
            <span> We make them easy to share.</span>
          </p>

          <p className="agrid__note">
            <strong>{profile.name}</strong>, established in January 2017, works with event hosts, businesses and restaurants.
            One small crew handles setup, shooting and delivery, so the people you talk to
            are the people who show up.
          </p>

          <ul className="agrid__caps" role="list">
            {CAPABILITIES.map((c) => (
              <li key={c.index} className="agrid__cap">
                <span className="agrid__cap-marks">
                  <span className="agrid__mark" style={{ '--i': 1 } as CSSProperties}>
                    <c.Icon size={18} weight="duotone" aria-hidden="true" />
                  </span>
                </span>
                <span className="agrid__cap-title">{c.title}</span>
                <span className="agrid__cap-index" aria-hidden="true">
                  {c.index}
                </span>
              </li>
            ))}
          </ul>

          {/* One plate, two cells sharing a mark / title / meta anatomy. */}
          <div className="agrid__bar">
            <a className="agrid__cell" href={`tel:${profile.phoneTel}`}>
              <span className="agrid__cell-mark">
                <Phone size={16} weight="fill" aria-hidden="true" />
              </span>
              <span className="agrid__cell-copy">
                <span className="agrid__cell-title">{profile.phone}</span>
                <span className="agrid__cell-meta">Call or message us</span>
              </span>
            </a>

            <a className="agrid__cell agrid__cell--wide" href={`mailto:${profile.email}`}>
              <span className="agrid__cell-mark">
                <EnvelopeSimple size={16} weight="fill" aria-hidden="true" />
              </span>
              <span className="agrid__cell-copy">
                <span className="agrid__cell-title">{profile.email}</span>
                <span className="agrid__cell-meta">Replies within one business day</span>
              </span>
            </a>

            <div className="agrid__cell agrid__cell--wide">
              <span className="agrid__cell-mark">
                <MapPin size={16} weight="fill" aria-hidden="true" />
              </span>
              <span className="agrid__cell-copy">
                <span className="agrid__cell-title">Kuwait</span>
                <span className="agrid__cell-meta">{time} Kuwait time</span>
              </span>
            </div>
          </div>
        </div>

        <div className="agrid__portrait">
          <ThemedImg
            light="/logo.png"
            dark="/logo-dark.png"
            alt="Judeng Production Studio logo"
            loading="eager"
            decoding="async"
            width={400}
          />
        </div>
      </div>
    </section>
  )
}

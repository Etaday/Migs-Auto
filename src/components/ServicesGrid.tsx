import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { SERVICES as CATALOG, money, packagesOf, stylesOf } from '@/data/catalog'
import PriceList from '@/components/PriceList'
import { PARTNERS } from '@/data/partners'
import { NotePencil, VideoCamera, Scissors, CheckCircle, type Icon as PhosphorIcon } from '@/components/slab'
type Icon = PhosphorIcon

/**
 * ServicesGrid - the Services view on one glass sheet: the studio's three-step
 * process on a dark plate, then the five services as cards.
 */

/* ---------- The method ---------- */

type Stage = {
  index: string
  label: string
  body: string
  Icon: Icon
  chips: string[]
}

const STAGES: Stage[] = [
  {
    index: '01',
    label: 'Book',
    body: 'Tell us the date, venue and what you need. We confirm availability and send a clear quote.',
    Icon: NotePencil,
    chips: ['Date', 'Venue', 'Quote'],
  },
  {
    index: '02',
    label: 'Shoot',
    body: 'We arrive early, set up and run the booth, or shoot so you can enjoy the day.',
    Icon: VideoCamera,
    chips: ['Setup', 'Crew', 'On site'],
  },
  {
    index: '03',
    label: 'Deliver',
    body: 'Edited photos, videos and prints are delivered fast, ready to share or publish.',
    Icon: Scissors,
    chips: ['Edit', 'Gallery', 'Share'],
  },
]

/* ---------- The services ---------- */

type Service = {
  id: string
  index: string
  title: string
  description: string
  chip: string
  Icon: Icon
  bullets: string[]
}

const SERVICES: Service[] = CATALOG.filter((c) => !c.addon).map((c, i) => {
  const priced = packagesOf(c).filter((o) => o.price !== null)
  const byCode = new Map<string, { name: string; min: number }>()
  for (const o of priced) {
    const prev = byCode.get(o.code)
    if (!prev || (o.price as number) < prev.min) byCode.set(o.code, { name: o.name, min: o.price as number })
  }
  const min = priced.length ? Math.min(...priced.map((o) => o.price as number)) : null
  return {
    id: c.id,
    index: String(i + 1).padStart(2, '0'),
    title: c.name,
    description: c.blurb,
    chip: min === null ? 'Quote' : `From ${money(min)}`,
    Icon: c.Icon,
    bullets: priced.length
      ? [...(stylesOf(c).length ? [`Styles: ${stylesOf(c).join(', ')}`] : []), ...[...byCode.values()].map((v) => `${v.name}: ${money(v.min)}`)]
      : ['Discussed personally with the team'],
  }
})

/* ---------- The page ---------- */

export default function ServicesGrid() {
  return (
    <section className="pgrid sgrid" aria-labelledby="services-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Services</span>
        <h1 className="pgrid__title" id="services-title">
          Booths, cake mapping and photography.
        </h1>
        <p className="pgrid__lede">
          Six services with clear prices in KWD. Book online and pay a 30% deposit.
        </p>
      </header>

      <div className="home__glass sgrid__glass">
        {/* One dark plate, the headline on the left, the three stages wired
            in order on the right with a signal running them. */}
        <div className="sgrid__method" aria-labelledby="method-title">
          <div className="sgrid__method-copy">
            <span className="sgrid__method-eyebrow">How we work</span>
            <h2 className="sgrid__method-title" id="method-title">
              Book. Shoot. Deliver.
              <br />
              <span>Three steps, one team.</span>
            </h2>
            <p className="sgrid__method-sub">
              One team from booking to delivery, so nothing gets lost between steps.
            </p>
          </div>

          <ol className="sgrid__stages" role="list">
            {STAGES.map((s, i) => {
              const StageIcon = s.Icon
              return (
                <li key={s.index} className="sgrid__stage" style={{ '--i': i } as CSSProperties}>
                  <span className="sgrid__stage-ghost" aria-hidden="true">{s.index}</span>
                  <span className="sgrid__stage-icon" aria-hidden="true">
                    <StageIcon size={22} weight="duotone" />
                  </span>
                  <h3 className="sgrid__stage-label">{s.label}.</h3>
                  <p className="sgrid__stage-body">{s.body}</p>
                  <ul className="sgrid__stage-chips" role="list" aria-label={`${s.label} touches`}>
                    {s.chips.map((c) => (
                      <li key={c} className="sgrid__stage-chip">{c}</li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        </div>

        {/* One card per service. */}
        <div className="sgrid__offers">
          <div className="sgrid__offers-head">
            <h2 className="sgrid__offers-title">What we offer</h2>
            <p className="sgrid__offers-sub">Mix and match. Full price list below.</p>
          </div>
          <ul className="bento sgrid__services" role="list">
            {SERVICES.map((s) => (
              <li key={s.title} className="bento__card sgrid__service">
                <span className="bento__head">
                  <span className="sgrid__service-top">
                    <span className="bento__icon"><s.Icon size={20} weight="duotone" aria-hidden="true" /></span>
                    <span className="sgrid__service-index" aria-hidden="true">{s.index} / {String(SERVICES.length).padStart(2, '0')}</span>
                  </span>
                  <span className="bento__title">{s.title}</span>
                  <span className="bento__desc">{s.description}</span>
                </span>
                <span className="sgrid__chip" aria-hidden="true">{s.chip}</span>
                <ul className="sgrid__bullets" role="list">
                  {s.bullets.map((b) => (
                    <li key={b} className="sgrid__bullet">
                      <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link className="sgrid__book" to={s.chip === 'Quote' ? `/quote?service=${s.id}` : `/book?service=${s.id}`}>{s.chip === 'Quote' ? 'Request a quote' : 'Book this'}</Link>
              </li>
            ))}
          </ul>
        </div>

        <PriceList />

        <section className="partners" aria-labelledby="partners-title">
          <div className="sgrid__offers-head">
            <h2 className="sgrid__offers-title" id="partners-title">Collaborator partner</h2>
            <p className="sgrid__offers-sub">The specialists we collaborate with.</p>
          </div>
          <ul className="partners__list" role="list">
            {PARTNERS.map((p) => (
              <li key={p.name} className="partners__card">
                <span className="partners__logo">
                  <img src={p.logo} alt={`${p.name} logo`} width={1400} height={560} loading="lazy" decoding="async" />
                </span>
                <span className="partners__body">
                  <span className="partners__role">{p.role}</span>
                  <strong className="partners__name">{p.name}</strong>
                  <span className="partners__blurb">{p.blurb}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}

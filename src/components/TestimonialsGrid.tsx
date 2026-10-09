import { Link } from 'react-router-dom'
import { ArrowUpRight, Buildings, Megaphone, Users } from '@/components/slab'
import type { Icon } from '@/components/slab'
import { SHOTS } from '@/data/portfolio'
import Reviews from '@/components/Reviews'
import { BRANDS } from '@/data/clients'

/**
 * TestimonialsGrid - the Clients view: a sample of the portfolio on the left
 * and the client ledger on the right. When real client testimonials exist,
 * add them as rows to CLIENTS below.
 */

const TEASER = [SHOTS[8], SHOTS[5], SHOTS[10], SHOTS[19]]

/* The client ledger. `logoSrc` is optional - without it the medallion falls
   back to the icon. */

type Client = {
  index: string
  name: string
  role: string
  daily: string
  work: string[]
  logoSrc?: string
  Icon: Icon
}

const CLIENTS: Client[] = [
  {
    index: '01',
    name: 'Event hosts',
    role: 'Weddings, birthdays and parties',
    daily: 'Glass and 360 photo booths, cake mapping and coverage that guests remember and share.',
    work: ['Booths', 'Cake mapping', 'Coverage'],
    Icon: Buildings,
  },
  {
    index: '02',
    name: 'Brands and businesses',
    role: 'Launches and corporate events',
    daily: 'Branded booths and photo and video coverage that put your name in front of guests.',
    work: ['Booths', 'Coverage', 'Studio'],
    Icon: Megaphone,
  },
  {
    index: '03',
    name: 'Restaurants and cafes',
    role: 'Menus, packaging and social',
    daily: 'Food photography that makes the dish look as good as it tastes.',
    work: ['Food', 'Menu', 'Social'],
    Icon: Users,
  },
]

export default function TestimonialsGrid() {
  return (
    <section className="pgrid tgrid" aria-labelledby="testimonials-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Clients</span>
        <h1 className="pgrid__title" id="testimonials-title">
          Who we work with.
        </h1>
        <p className="pgrid__lede">
          Event hosts, brands and restaurants across Kuwait, plus what they say about us.
        </p>
      </header>

      <div className="home__glass tgrid__glass">
        <div className="tgrid__reel">
          <ul className="tgrid__mosaic" role="list">
            {TEASER.map((t) => (
              <li key={t.id}>
                <img src={t.thumb} alt={t.alt} width={t.w} height={t.h} loading="lazy" decoding="async" />
              </li>
            ))}
          </ul>
          <Link className="sgrid__book tgrid__more" to="/projects">
            See the full portfolio <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </div>

        {/* Right: the client ledger, one row per client. */}
        <div className="tgrid__ledger">
          <div className="tgrid__ledger-head">
            <h2 className="tgrid__ledger-title">Who we work with</h2>
            <p className="tgrid__ledger-sub">The kinds of clients we shoot for.</p>
          </div>

          {/* One plate, three rows split by hairlines. Three boxed cards each
              carrying their own border read as three separate widgets; a
              single ledger reads as one record. */}
          <ul className="tgrid__clients" role="list">
            {CLIENTS.map((c) => {
              const FallbackIcon = c.Icon
              return (
                <li key={c.index} className="tgrid__client">
                  <span className="tgrid__client-ghost" aria-hidden="true">{c.index}</span>
                  <span className="tgrid__client-mark" aria-hidden="true">
                    {c.logoSrc ? (
                      <img src={c.logoSrc} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <FallbackIcon size={22} weight="duotone" />
                    )}
                  </span>

                  <span className="tgrid__client-body">
                    <span className="tgrid__client-head">
                      <span className="tgrid__client-name">{c.name}</span>
                      <span className="tgrid__client-role">{c.role}</span>
                    </span>
                    <span className="tgrid__client-daily">{c.daily}</span>
                    <ul className="tgrid__client-tags" role="list">
                      {c.work.map((w, i) => (
                        <li key={`${w}-${i}`} className="tgrid__client-tag">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <section className="cbrands" aria-labelledby="cbrands-title">
          <div className="sgrid__offers-head">
            <h2 className="sgrid__offers-title" id="cbrands-title">Brands we have worked with</h2>
          </div>
          <ul className="cbrands__grid" role="list">
            {BRANDS.map((b) => {
              const body = (
                <>
                  <img src={b.logo} alt={`${b.name} logo`} width={72} height={72} loading="lazy" decoding="async" />
                  <span><b>{b.name}</b><small>{b.what}</small></span>
                </>
              )
              return (
                <li key={b.name}>
                  {b.href ? <a className="cbrands__card" href={b.href} target="_blank" rel="noopener noreferrer" aria-label={`${b.name} on Facebook`}>{body}</a> : <div className="cbrands__card">{body}</div>}
                </li>
              )
            })}
          </ul>
        </section>

        <Reviews />
      </div>
    </section>
  )
}

import type React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  FolderOpen,
  User,
  Camera,
  Medal,
  Stack,
  Quotes,
  VideoCamera,
  Sparkle,
  ArrowsClockwise,
  Cake,
  Aperture,
  ForkKnife,
  Confetti,
  SealCheck,
  Buildings,
  Megaphone,
} from '@/components/slab'
import ThemedImg from '@/components/ThemedImg'
import { WORK } from '@/data/work'

/**
 * Home's showcase: one card per rail view, each an index of what that view
 * holds. Every card is a link.
 *
 * Motion is transform-only on a clipped inner track, so a card never adds
 * height and Home stays a single viewport.
 */

const poster = (tone: [string, string]) =>
  ({ background: `linear-gradient(135deg, ${tone[0]}, ${tone[1]})` }) as React.CSSProperties

const OFFERS = [
  { Icon: Sparkle, title: 'Booths and Prints', note: 'Glass, studio, look up and roving booths' },
  { Icon: ArrowsClockwise, title: '360 Photo Booth', note: 'Slow-motion spin videos' },
  { Icon: Cake, title: 'Cake Mapping', note: 'Wedding, debut and kids cakes' },
  { Icon: Aperture, title: 'Studio shots', note: 'Portrait, product, campaign' },
  { Icon: VideoCamera, title: 'Photo and video coverage', note: 'Events, weddings, corporate' },
  { Icon: ForkKnife, title: 'Food photography', note: 'Menus, packaging, social' },
] as const

const CLIENTS = [
  { Icon: Confetti, name: 'Event hosts', role: 'Weddings, birthdays and parties', work: 'Booths · Coverage' },
  { Icon: Buildings, name: 'Brands and businesses', role: 'Launches and corporate events', work: 'Photo · Video' },
  { Icon: Megaphone, name: 'Restaurants and cafes', role: 'Menus and social content', work: 'Food · Studio' },
]

const SHOOTS = WORK.map((w) => ({ id: w.id, name: w.title, Icon: w.Icon }))

function CardHead({
  Icon,
  title,
  desc,
}: {
  Icon: typeof FolderOpen
  title: string
  desc: string
}) {
  return (
    <header className="bento__head">
      <span className="bento__label">
        <span className="bento__icon">
          <Icon size={20} weight="fill" aria-hidden="true" />
        </span>
        <h3 className="bento__title">{title}</h3>
      </span>
      <p className="bento__desc">{desc}</p>
      <ArrowUpRight size={15} weight="bold" aria-hidden="true" className="bento__arrow" />
    </header>
  )
}

export default function HomeBento() {
  const half = Math.ceil(SHOOTS.length / 2)
  const toolRows = [SHOOTS.slice(0, half), SHOOTS.slice(half)]

  return (
    <nav className="bento" aria-label="Explore the studio">
      {/* Work: poster frames drift upward on a looped track. */}
      <Link to="/projects" className="bento__card bento__card--projects">
        <CardHead Icon={FolderOpen} title="Work" desc="Booths, cake mapping and photography." />
        <div className="bento__media bento__reel" aria-hidden="true">
          <div className="bento__reel-track">
            {[...WORK.slice(0, 4), ...WORK.slice(0, 4)].map((w, i) => (
              <span key={i} className="bento__shot work__shot" style={poster(w.tone)}>
                <w.Icon size={30} weight="duotone" />
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* About: a fanned stack of photos. */}
      <Link to="/about" className="bento__card bento__card--about">
        <CardHead Icon={User} title="About" desc="A small crew that cares about the craft." />
        <div className="bento__media bento__fan" aria-hidden="true">
          {WORK.slice(0, 3).map((w, i) => (
            <span key={w.id} className="bento__photo work__shot" style={{ ...poster(w.tone), ['--i' as string]: i }}>
              <w.Icon size={28} weight="duotone" />
            </span>
          ))}
        </div>
      </Link>

      {/* What we shoot: two chip rows scrolling against each other. */}
      <Link to="/services" className="bento__card bento__card--ai">
        <CardHead Icon={Camera} title="What we shoot" desc="Photo booths, shoots and events." />
        <div className="bento__media bento__chips" aria-hidden="true">
          {toolRows.map((row, r) => (
            <div key={r} className="bento__chip-row" data-dir={r ? 'right' : 'left'}>
              <div className="bento__chip-track">
                {[...row, ...row].map((n, i) => (
                  <span key={`${n.id}-${i}`} className="bento__chip">
                    <n.Icon size={15} weight="duotone" />
                    {n.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Link>

      {/* Studio: the mark, on its plate. */}
      <Link to="/about" className="bento__card bento__card--creds">
        <CardHead Icon={Medal} title="Studio" desc="Full-service video and photo production." />
        <div className="bento__media bento__badge" aria-hidden="true">
          <span className="bento__badge-ring">
            <ThemedImg light="/emblem.png" dark="/emblem-dark.png" width={72} height={72} />
          </span>
          <span className="bento__badge-tag">
            <SealCheck size={14} weight="fill" />
            Full-service studio
          </span>
        </div>
      </Link>

      {/* Services: the five offers as a compact index. */}
      <Link to="/services" className="bento__card bento__card--services">
        <CardHead Icon={Stack} title="Services" desc="Booths, cake mapping and photography." />
        <ul className="bento__media bento__offers" role="list">
          {OFFERS.map(({ Icon, title, note }, i) => (
            <li key={title} className="bento__offer" style={{ '--i': i } as React.CSSProperties}>
              <span className="bento__offer-tile">
                <Icon size={15} weight="duotone" aria-hidden="true" />
              </span>
              <span className="bento__offer-text">
                <span className="bento__offer-title">{title}</span>
                <span className="bento__offer-note">{note}</span>
              </span>
              <span className="bento__offer-num" aria-hidden="true">
                0{i + 1}
              </span>
            </li>
          ))}
        </ul>
      </Link>

      {/* Testimonials: client cards drifting up a clipped column. */}
      <Link to="/testimonials" className="bento__card bento__card--quotes">
        <CardHead Icon={Quotes} title="Clients" desc="Who we make films and photos for." />
        <div className="bento__media bento__reviews" aria-hidden="true">
          <div className="bento__reviews-track">
            {[...CLIENTS, ...CLIENTS].map((c, i) => (
              <span key={i} className="bento__review">
                <span className="bento__review-top">
                  <c.Icon size={14} weight="fill" />
                  <b>{c.name}</b>
                </span>
                <span className="bento__review-role">{c.role}</span>
                <span className="bento__review-work">{c.work}</span>
              </span>
            ))}
          </div>
        </div>
      </Link>
    </nav>
  )
}

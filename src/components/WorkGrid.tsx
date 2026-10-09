import { useState, type CSSProperties } from 'react'
import { ArrowUpRight } from '@/components/slab'
import { WORK, type WorkItem } from '@/data/work'
import PortfolioGallery from '@/components/PortfolioGallery'
import { SHOTS, STUDIO_SHOTS, COVERAGE_SHOTS, CAKE_SHOTS, BOOTH360_SHOTS } from '@/data/portfolio'

/**
 * WorkGrid - the Work view: one glass sheet, one card per kind of production.
 * Content lives in src/data/work.ts.
 */

function Poster({ item }: { item: WorkItem }) {
  const style = { '--from': item.tone[0], '--to': item.tone[1] } as CSSProperties
  return (
    <div className="bento__media work__poster" style={style} aria-hidden="true">
      {item.imageSrc ? (
        <img src={item.imageSrc} alt="" loading="lazy" decoding="async" />
      ) : (
        <>
          <span className="work__frame" />
          <item.Icon size={44} weight="duotone" />
        </>
      )}
    </div>
  )
}

function Card({ item, onOpen }: { item: WorkItem; onOpen: (id: GalleryId) => void }) {
  const target = PORTFOLIO_OF[item.id]
  const body = (
    <>
      <span className="bento__head">
        <span className="bento__icon">
          <item.Icon size={20} weight="duotone" aria-hidden="true" />
        </span>
        <span className="work__kicker">{item.kicker}</span>
        <span className="bento__title">{item.title}</span>
        <span className="bento__desc">{item.desc}</span>
        {item.href && <ArrowUpRight size={15} weight="bold" aria-hidden="true" className="bento__arrow" />}
        {target && <span className="work__more">{'See the portfolio\u00A0\u203A'}</span>}
      </span>
      <Poster item={item} />
    </>
  )
  const cls = `bento__card bento__card--btn${item.span === 2 ? ' bento__card--wide' : ''}`
  return item.href ? (
    <a className={cls} href={item.href} target="_blank" rel="noopener noreferrer" data-id={item.id}>
      {body}
    </a>
  ) : target ? (
    <button type="button" className={cls} data-id={item.id} onClick={() => onOpen(target)}>
      {body}
    </button>
  ) : (
    <div className={cls} data-id={item.id}>
      {body}
    </div>
  )
}

const GALLERIES = [
  { id: 'booth360', tab: '360 booth', title: '360 photo booth portfolio', shots: BOOTH360_SHOTS, tag: '360 photo booth', barrel: true },
  { id: 'cake', tab: 'Cake mapping', title: 'Cake mapping portfolio', shots: CAKE_SHOTS, tag: 'Cake mapping', barrel: false },
  { id: 'studio', tab: 'Studio', title: 'Studio shoot portfolio', shots: STUDIO_SHOTS, tag: 'Studio shoot', barrel: true },
  { id: 'coverage', tab: 'Coverage', title: 'Photo and video coverage portfolio', shots: COVERAGE_SHOTS, tag: 'Coverage', barrel: true },
  { id: 'food', tab: 'Food', title: 'Food photography portfolio', shots: SHOTS, tag: 'Food photography', barrel: true },
] as const

type GalleryId = (typeof GALLERIES)[number]['id']
/** Which portfolio each service card opens. */
const PORTFOLIO_OF: Record<string, GalleryId> = { 'booth-360': 'booth360', 'cake-mapping': 'cake', studio: 'studio', coverage: 'coverage', food: 'food' }

export default function WorkGrid() {
  const [tab, setTab] = useState<GalleryId>(GALLERIES[0].id)
  const openPortfolio = (id: GalleryId) => {
    setTab(id)
    window.setTimeout(() => document.getElementById('portfolio-tabs')?.scrollIntoView({ behavior: document.documentElement.dataset.a11yMotion === 'true' ? 'auto' : 'smooth', block: 'start' }), 30)
  }
  return (
    <section className="pgrid wgrid" aria-labelledby="work-title">
      <header className="pgrid__head">
        <span className="pgrid__eyebrow">Work</span>
        <h1 className="pgrid__title" id="work-title">
          What we do.
        </h1>
        <p className="pgrid__lede">
          Our services, and a look at our work. Tap a service to see its portfolio, or ask for samples of any other service and we will send them over.
        </p>
      </header>

      <div className="home__glass pgrid__glass">
        <div className="bento bento--projects">
          {WORK.map((w) => (
            <Card key={w.id} item={w} onOpen={openPortfolio} />
          ))}
        </div>

        <div className="gtabs" id="portfolio-tabs" role="tablist" aria-label="Portfolio">
          {GALLERIES.map((g) => (
            <button key={g.id} type="button" role="tab" id={`tab-${g.id}`} aria-selected={tab === g.id} aria-controls={`panel-${g.id}`} onClick={() => setTab(g.id)}>
              {g.tab}<small>{g.shots.length}</small>
            </button>
          ))}
        </div>
        {GALLERIES.filter((g) => g.id === tab).map((g) => (
          <div key={g.id} role="tabpanel" id={`panel-${g.id}`} aria-labelledby={`tab-${g.id}`}>
            <PortfolioGallery id={g.id} title={g.title} sub="Tap a photo to view it larger." shots={g.shots} tag={g.tag} barrel={g.barrel} />
          </div>
        ))}
      </div>
    </section>
  )
}

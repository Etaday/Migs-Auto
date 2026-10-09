import { Link } from 'react-router-dom'
import { Clock, EnvelopeSimple, MapPin, Phone } from '@/components/slab'
import { FINANCING_AVAILABLE, profile } from '@/data/profile'

/** The footer on every public page: a red brand card and three link columns. */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <img src="/logo-wide.png" alt="Migs Auto" width={120} height={69} />
        <p>Quality cars and motorcycles, mags and accessories. Browse the inventory, trade in your ride and book a test drive.</p>
        <ul className="site-footer__social" role="list" aria-label="Social profiles">
          {profile.socials.map(({ label, href, Icon }) => (
            <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18} aria-hidden="true" /></a></li>
          ))}
        </ul>
      </div>
      <nav className="site-footer__col" aria-label="Quick links">
        <h2>Quick Links</h2>
        <Link to="/">Home</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/trade-in">Trade-in</Link>
        <Link to="/test-drive">Test Drive</Link>
        <Link to="/financing">Financing{FINANCING_AVAILABLE ? '' : ' (coming soon)'}</Link>
        <Link to="/about">About</Link>
      </nav>
      <nav className="site-footer__col" aria-label="Categories">
        <h2>Category</h2>
        <Link to="/inventory?type=car">Cars</Link>
        <Link to="/inventory?type=motorcycle">Motorcycles</Link>
        <Link to="/accessories?category=mags">Mags</Link>
        <Link to="/accessories?category=accessories">Accessories</Link>
      </nav>
      <div className="site-footer__col">
        <h2>Contact Us</h2>
        <a href={`tel:${profile.phoneTel}`}><Phone size={15} aria-hidden="true" /> {profile.phone}</a>
        <a href={`mailto:${profile.email}`}><EnvelopeSimple size={15} aria-hidden="true" /> {profile.email}</a>
        <span><MapPin size={15} aria-hidden="true" /> {profile.location}</span>
        <span><Clock size={15} aria-hidden="true" /> {profile.hours}</span>
      </div>
      <p className="site-footer__legal">© {new Date().getFullYear()} {profile.name}. <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
    </footer>
  )
}

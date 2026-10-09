import { ArrowLeft } from '@/components/slab'
import { useNavigate } from 'react-router-dom'
import { profile } from '@/data/profile'

/**
 * Terms of Service. A plain-language draft; have it reviewed before relying
 * on it. Project contracts are agreed separately for each job.
 */
export default function ToS() {
  const navigate = useNavigate()

  return (
    <main className="legal-page" aria-label="Terms of Service">
      <div className="legal-page__card">
        <button
          className="legal-page__back"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <ArrowLeft weight="bold" size={15} aria-hidden="true" />
          Back to home
        </button>

        <h1 className="legal-page__title">Terms of Service</h1>
        <p className="legal-page__updated">Last updated: October 3, 2026</p>

        <div className="legal-page__body">
          <h2>Using this site</h2>
          <p>You may browse this site for personal or business research. Do not misuse it or attempt to disrupt it.</p>

          <h2>Listings and prices</h2>
          <p>Vehicle details and prices on this site are shown in good faith and can change or sell out without notice. An inquiry, reservation request or test drive request is not a confirmed sale: we confirm availability, price and any financing with you directly.</p>
          <p>Financing figures on this site are estimates only. The final rate and terms depend on the approved plan. Trade-in values are offers made after we assess the vehicle.</p>

          <h2>Ownership</h2>
          <p>The content of this site belongs to Migs Auto.</p>

          <h2>Liability</h2>
          <p>This site is provided as is. To the extent the law allows, we are not liable for losses arising from using it.</p>

          <h2>Contact</h2>
          <p>
            Questions about these terms: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
        </div>
      </div>
    </main>
  )
}

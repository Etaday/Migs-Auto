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

          <h2>Bookings and payment</h2>
          <p>A booking request is not a confirmed booking. We check availability and then confirm your date. A 30% deposit of the total booking price is required to confirm, and the remaining 70% is paid at the venue on the event date. Any location charge for your area is added once to the total before the deposit is worked out.</p>
          <p>We accept WAMD and cash. Photo and video coverage and food photography are quoted individually with the studio. Cancellation and rescheduling terms are agreed with the studio when your booking is confirmed.</p>

          <h2>Ownership</h2>
          <p>The content of this site belongs to Judeng Production Studio. Rights in the finished work are set out in each project agreement.</p>

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

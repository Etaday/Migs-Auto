import { ArrowLeft } from '@/components/slab'
import { useNavigate } from 'react-router-dom'
import { profile } from '@/data/profile'

/**
 * Privacy Policy. A plain-language draft; have it reviewed against local law
 * before relying on it.
 */
export default function Privacy() {
  const navigate = useNavigate()

  return (
    <main className="legal-page" aria-label="Privacy Policy">
      <div className="legal-page__card">
        <button
          className="legal-page__back"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <ArrowLeft weight="bold" size={15} aria-hidden="true" />
          Back to home
        </button>

        <h1 className="legal-page__title">Privacy Policy</h1>
        <p className="legal-page__updated">Last updated: October 3, 2026</p>

        <div className="legal-page__body">
          <h2>Who this covers</h2>
          <p>This site is run by Migs Auto, a seller of cars and motorcycles. This policy applies to this website only.</p>

          <h2>What is collected</h2>
          <p>
            When you send an inquiry, trade-in, financing or test drive request we receive your name, phone number, email and message, the vehicle you asked about, and the details you enter in that form (for example a test drive date or your vehicle's year and mileage).
            We do not run advertising trackers.
          </p>

          <h2>How it is used</h2>
          <p>We use it only to reply to you, prepare offers and financing estimates, and arrange test drives and sales. We do not sell your data.</p>

          <h2>Where it is stored</h2>
          <p>
            Requests are stored in a secured online database that only the dealership can read. We may contact you by phone call, WhatsApp, SMS or email.
          </p>
          <p>Your browser keeps small settings on your own device, such as light or dark mode. The chat assistant gives automated answers and does not store your questions.</p>

          <h2>How long it is kept</h2>
          <p>We keep inquiries and sales records for as long as needed to serve you and for our business records. To ask us to correct or delete your data, email or message us and we will do so.</p>

          <h2>Contact</h2>
          <p>
            Questions about this policy: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
        </div>
      </div>
    </main>
  )
}

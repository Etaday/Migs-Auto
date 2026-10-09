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
          <p>This site is run by Judeng Production Studio. This policy applies to this website only.</p>

          <h2>What is collected</h2>
          <p>
            When you send a booking request we receive your name, email, phone number, the services you chose, the event date, time, area and venue, your guest count and any notes.
            The contact form collects your name, email and message, and the review form collects your name, email, service and review text.
            We do not run advertising trackers.
          </p>

          <h2>How it is used</h2>
          <p>We use it only to check availability, reply to you, prepare quotes, invoices and receipts, and to run your booking. Approved reviews are shown on this site with your first name or the name you gave; your email is never shown. We do not sell your data.</p>

          <h2>Where it is stored</h2>
          <p>
            Requests and messages are stored in a secured online database that only the studio can read. We also use Google Calendar to keep our event schedule, and WhatsApp, email or a phone call to contact you.
            The invoice and receipt links we send you are private: anyone with the link can view that one document, so do not share it.
          </p>
          <p>Your browser keeps small settings on your own device, such as light or dark mode. The chat assistant gives automated answers and does not store your questions.</p>

          <h2>How long it is kept</h2>
          <p>We keep bookings, invoices and receipts for as long as needed to serve you and for our business records. To ask us to correct or delete your data, email or message us and we will do so.</p>

          <h2>Contact</h2>
          <p>
            Questions about this policy: <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </p>
        </div>
      </div>
    </main>
  )
}

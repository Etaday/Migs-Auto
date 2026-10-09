import { ArrowLeft } from '@/components/slab'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <main className="legal-page" aria-label="Page not found">
      <div className="legal-page__card">
        <button
          className="legal-page__back"
          onClick={() => navigate('/')}
          aria-label="Back to home"
        >
          <ArrowLeft weight="bold" size={15} aria-hidden="true" />
          Back to home
        </button>

        <p className="legal-page__updated">404</p>
        <h1 className="legal-page__title">Page not found.</h1>

        <div className="legal-page__body">
          <p>
            That page does not exist. If you followed a link that should work,
            please contact us and we will look into it.
          </p>
        </div>
      </div>
    </main>
  )
}

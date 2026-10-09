import { useEffect, useState, type FormEvent } from 'react'
import { Star, CheckCircle, WarningCircle, PaperPlaneTilt } from '@/components/slab'
import { REVIEWS as STATIC_REVIEWS, type Review } from '@/data/reviews'
import { useSearchParams } from 'react-router-dom'
import { approvedReviews, checkReviewCode, type ReviewInvite } from '@/lib/db'
import { readReview, submitReview } from '@/lib/review'
import { SubmitError } from '@/lib/contact'

/**
 * Reviews - what customers say, plus a form to leave one. Reviews shown come
 * from src/data/reviews.ts plus approved ones in the database. Leaving one is
 * by invitation: the studio sends each customer a private one-time link
 * (?review=CODE), and the review waits for approval in the dashboard.
 */

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <span className="reviews__stars" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} weight={i <= n ? 'fill' : 'regular'} aria-hidden="true" />
      ))}
    </span>
  )
}

const fmt = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

export default function Reviews() {
  const [rating, setRating] = useState(0)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | { error: string }>('idle')
  const [live, setLive] = useState<Review[]>([])
  const code = useSearchParams()[0].get('review') ?? ''
  const [invite, setInvite] = useState<ReviewInvite | null | 'checking'>(code ? 'checking' : null)
  useEffect(() => {
    if (!code) return
    let alive = true
    void checkReviewCode(code).then((r) => { if (alive) setInvite(r) })
    return () => { alive = false }
  }, [code])
  useEffect(() => {
    let alive = true
    void approvedReviews().then((rows) => {
      if (alive) setLive(rows.map((r) => ({ name: r.name, service: r.service, rating: r.rating as Review['rating'], text: r.text, date: r.created_at.slice(0, 10) })))
    })
    return () => { alive = false }
  }, [])
  const REVIEWS = [...live, ...STATIC_REVIEWS]
  const avg = REVIEWS.length ? REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length : 0

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const parsed = readReview(new FormData(e.currentTarget))
    if ('error' in parsed) return setState({ error: parsed.error })
    if (parsed.review.website) return
    setState('sending')
    try {
      await submitReview(code, parsed.review)
      setState('sent')
    } catch (err) {
      setState({ error: err instanceof SubmitError ? err.message : 'That did not go through. Please email us instead.' })
    }
  }

  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="sgrid__offers-head">
        <h2 className="sgrid__offers-title" id="reviews-title">Reviews</h2>
        <p className="sgrid__offers-sub">
          {REVIEWS.length ? `${avg.toFixed(1)} out of 5 from ${REVIEWS.length} review${REVIEWS.length > 1 ? 's' : ''}` : 'What our customers say.'}
        </p>
      </div>

      {REVIEWS.length ? (
        <ul className="reviews__grid" role="list">
          {REVIEWS.map((r, i) => (
            <li key={`${r.name}-${i}`} className="reviews__card">
              <Stars n={r.rating} />
              <blockquote>{r.text}</blockquote>
              <p className="reviews__who">
                <strong>{r.name}</strong>
                <span>{[r.service, fmt(r.date)].filter(Boolean).join(' · ')}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="reviews__empty">
          <Stars n={0} size={22} />
          <p><strong>No reviews yet.</strong> After your event we will send you a private link to share your experience.</p>
        </div>
      )}

      <div className="reviews__form-wrap">
        {state === 'sent' ? (
          <div className="reviews__thanks" role="status">
            <CheckCircle size={28} weight="fill" aria-hidden="true" />
            <p><strong>Thank you!</strong> Your review is with the team. We check each review before it is shown on the site.</p>
          </div>
        ) : !invite || invite === 'checking' ? (
          <p className="reviews__invite" role="status">
            {invite === 'checking' ? 'Checking your review link.' : code ? 'This review link is not valid or has already been used.' : 'Reviews are by invitation. After your event we send each customer a private link to leave one.'}
          </p>
        ) : (
          <form className="reviews__form" onSubmit={onSubmit} noValidate>
            <h3>Leave a review{invite.service ? ` for ${invite.service}` : ''}</h3>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cgrid__trap" />
            <input type="hidden" name="rating" value={rating} />
            <div className="reviews__pick" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} className={i <= rating ? 'is-on' : ''} onClick={() => setRating(i)}>
                  <Star size={26} weight={i <= rating ? 'fill' : 'regular'} aria-hidden="true" />
                </button>
              ))}
            </div>
            <label className="cgrid__field"><span className="cgrid__label">Your name (shown with the review)</span><input type="text" name="name" autoComplete="name" maxLength={80} defaultValue={invite.name} /></label>
            <label className="cgrid__field"><span className="cgrid__label">Your review</span><textarea name="text" rows={4} maxLength={2000} placeholder="How was your experience?" /></label>
            <div className="cgrid__actions">
              <button type="submit" className="cgrid__submit" disabled={state === 'sending'}>
                <span className="cgrid__submit-plane" aria-hidden="true"><PaperPlaneTilt size={17} weight="fill" /></span>
                <span className="cgrid__submit-label">{state === 'sending' ? 'Sending' : 'Submit review'}</span>
              </button>
              {typeof state === 'object' && (
                <span className="cgrid__status" role="alert"><WarningCircle size={16} weight="fill" aria-hidden="true" />{state.error}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

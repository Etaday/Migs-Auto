import { submitInvitedReview } from '@/lib/db'
import { sanitize } from '@/lib/contact'

/** A review left through a private, one-time link the studio sends after an
 *  event (see supabase/review-invites.sql). The code proves the reviewer was a
 *  customer; the review stays pending until it is approved in the dashboard. */

export type ReviewDraft = { name: string; rating: number; text: string; website: string }

export function readReview(data: FormData): { review: ReviewDraft } | { error: string } {
  const f = (k: string, max: number, nl = false) => sanitize(String(data.get(k) ?? '').trim(), nl).slice(0, max)
  const review: ReviewDraft = {
    name: f('name', 80),
    rating: Number(data.get('rating')) || 0,
    text: f('text', 2000, true),
    website: String(data.get('website') ?? ''),
  }
  if (!review.name) return { error: 'Add your name.' }
  if (review.rating < 1 || review.rating > 5) return { error: 'Choose a star rating.' }
  if (review.text.length < 10) return { error: 'Tell us a little about your experience.' }
  return { review }
}

export async function submitReview(code: string, r: ReviewDraft): Promise<void> {
  await submitInvitedReview(code, { name: r.name, rating: r.rating, text: r.text })
}

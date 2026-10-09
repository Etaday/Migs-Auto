/**
 * Customer reviews. Add real ones only, exactly as the customer wrote them
 * (and with their permission), e.g.
 *
 *   { name: 'Maria S.', service: 'Glass Photo Booth', rating: 5,
 *     text: 'The booth was the hit of our party.', date: '2026-09-12' },
 *
 * With the list empty the page shows how reviews work (by invitation).
 */
export type Review = {
  name: string
  service: string
  rating: 1 | 2 | 3 | 4 | 5
  text: string
  /** ISO date, e.g. 2026-09-12. Optional. */
  date?: string
}

export const REVIEWS: Review[] = []

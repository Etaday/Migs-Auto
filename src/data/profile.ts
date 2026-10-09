/**
 * Migs Auto identity: name, logo, contact details and the Home headline.
 * PLACEHOLDERS: phone, email, address and hours are not confirmed; replace them here, in one place.
 */

import { Car, Motorcycle, Wrench, type Icon } from '@/components/slab'

export type SocialLink = {
  label: string
  href: string
  iconPath: string
}

/** A proof fact on the phone's Home: a glyph, a short value, a caption. */
export type Stat = { value: string; label: string; Icon: Icon }

export type Profile = {
  name: string
  /** First name, used in "Hi, I'm ___." on About. */
  firstName: string
  handle: string
  /** Short role line under the handle on phones. */
  role: string
  /** Square image. An SVG, WebP or PNG with a transparent background looks best. */
  avatarSrc: string
  /** Tooltip / screen-reader label on the verified tick next to your name. */
  verifiedLabel: string
  email: string
  /** Display format, and the digits for tel: links. */
  phone: string
  phoneTel: string
  location: string
  hours: string
  /** WhatsApp number, digits only. */
  whatsapp: string
  /** Three short proof facts shown on phones under the Home lede. */
  stats: Stat[]
  displayName: { line1: string; line2: string }
  hero: {
    body: string
    portraitSrc: string
    portraitAlt: string
  }
  socials: SocialLink[]
}

export const profile: Profile = {
  name: 'Migs Auto',
  firstName: 'Migs',
  handle: 'Cars and motorcycles',
  role: 'Cars and motorcycles for sale',
  avatarSrc: '/avatar.png',
  verifiedLabel: 'Car and motorcycle dealer',
  email: 'hello@migsauto.example',
  phone: '+63 000 000 0000',
  phoneTel: '+630000000000',
  location: 'Address to be confirmed',
  hours: 'Mon-Sat 9:00 AM - 6:00 PM',
  whatsapp: '630000000000',
  stats: [
    { value: 'Cars', label: 'Sedans, SUVs, vans', Icon: Car },
    { value: 'Bikes', label: 'Scooters to sport', Icon: Motorcycle },
    { value: 'Service', label: 'Trade-in and financing', Icon: Wrench },
  ],
  displayName: { line1: 'Drive home', line2: 'something great.' },
  hero: {
    body: 'Migs Auto sells quality cars and motorcycles. Browse the inventory, trade in your ride, get financing and book a test drive.',
    portraitSrc: '/avatar.png',
    portraitAlt: 'Migs Auto logo',
  },
  socials: [],
}

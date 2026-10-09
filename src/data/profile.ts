/**
 * Studio identity: name, handle, logo, socials, email and the Home headline.
 * Only the Facebook link is real. Add other profile URLs as needed.
 */

import { Sparkle, Cake, Camera, type Icon } from '@/components/slab'

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
  name: 'Judeng Production Studio',
  firstName: 'Judeng',
  handle: '@judeng_production.kw',
  role: 'Photo booths, cake mapping and photography',
  avatarSrc: '/avatar.png',
  verifiedLabel: 'Photo and video studio',
  email: 'angelo@judengproduction.com',
  phone: '+965 9797 4135',
  phoneTel: '+96597974135',
  location: 'Available for projects',
  // Pick any icon from https://phosphoricons.com and import it above.
  stats: [
    { value: 'Booths', label: 'Glass & 360', Icon: Sparkle },
    { value: 'Mapping', label: 'Cake mapping', Icon: Cake },
    { value: 'Photo', label: 'Studio, food, events', Icon: Camera },
  ],
  // The intro types this line, then flies it into the Home headline.
  // Keep it short: two halves, 5-8 words total.
  displayName: { line1: 'Moments worth sharing.', line2: 'Captured in style.' },
  hero: {
    body: 'Judeng Production Studio runs glass and 360 photo booths, cake mapping, studio and food photography, and photo and video coverage for events and businesses.',
    portraitSrc: '/avatar.png',
    portraitAlt: 'Judeng Production Studio logo',
  },
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/judeng_production.kw', iconPath: '/icons/instagram.svg' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@judeng_production.kw', iconPath: '/icons/tiktok.svg' },
    { label: 'Facebook page', href: 'https://www.facebook.com/judeterciano', iconPath: '/icons/facebook.svg' },
  ],
}

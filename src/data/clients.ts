/**
 * Brands the studio has worked with. Add a logo to public/clients/ and a row
 * here; the card links to the brand's page when `href` is set.
 */
export type Brand = { name: string; what: string; logo: string; href?: string }

export const BRANDS: Brand[] = [
  {
    name: 'Balwarte Kuwait',
    what: 'Restaurant, Old Souk Salmiya',
    logo: '/clients/balwarte.jpg',
    href: 'https://www.facebook.com/profile.php?id=61592868626604',
  },
]

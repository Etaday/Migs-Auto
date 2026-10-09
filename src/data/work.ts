import { Sparkle, ArrowsClockwise, Cake, Aperture, VideoCamera, ForkKnife, type Icon } from '@/components/slab'

/**
 * The studio's work, one card per service. To feature a real
 * project, add `href` (a YouTube/Vimeo/portfolio link) and, optionally,
 * `imageSrc` (a still in public/work/); the card then links out and shows
 * the still instead of the poster artwork.
 */
export type WorkItem = {
  id: string
  kicker: string
  title: string
  desc: string
  Icon: Icon
  /** Poster gradient: [from, to]. Ignored when imageSrc is set. */
  tone: [string, string]
  href?: string
  imageSrc?: string
  span?: 2
}

export const WORK: WorkItem[] = [
  {
    id: 'glass-booth',
    kicker: 'Photo booth',
    title: 'Booths and Prints',
    desc: 'A sleek see-through booth that makes a showpiece of your event, with instant prints and shares.',
    Icon: Sparkle,
    tone: ['#4A4742', '#201D22'],
    span: 2,
  },
  {
    id: 'booth-360',
    kicker: 'Photo booth',
    title: '360 Photo Booth',
    desc: 'Guests step on the platform and a rotating camera captures slow-motion spins they can share on the spot.',
    Icon: ArrowsClockwise,
    tone: ['#D7191F', '#4A4742'],
    imageSrc: '/portfolio/tb02.jpg',
  },
  {
    id: 'cake-mapping',
    kicker: 'Event',
    title: 'Cake Mapping',
    desc: 'Three hours of projection mapping that turns your cake into a moving show, for weddings, debuts and kids birthdays. The wedding package includes a photo booth.',
    Icon: Cake,
    tone: ['#D9541E', '#201D22'],
    imageSrc: '/work/cake-mapping.jpg',
  },
  {
    id: 'studio',
    kicker: 'Photo',
    title: 'Studio shots',
    desc: 'Portraits, product and campaign images shot in our studio with controlled lighting.',
    Icon: Aperture,
    tone: ['#303030', '#D9541E'],
    imageSrc: '/portfolio/ts03.jpg',
  },
  {
    id: 'coverage',
    kicker: 'Photo and video',
    title: 'Photo and video coverage',
    desc: 'Weddings, birthdays, launches and corporate events, captured in photo and video.',
    Icon: VideoCamera,
    tone: ['#201D22', '#4A4742'],
    imageSrc: '/portfolio/tc06.jpg',
    span: 2,
  },
  {
    id: 'food',
    kicker: 'Photo',
    title: 'Food photography',
    desc: 'Menu, packaging and social images that make the dish look as good as it tastes.',
    Icon: ForkKnife,
    imageSrc: '/portfolio/t11.jpg',
    tone: ['#D7191F', '#201D22'],
  },
]

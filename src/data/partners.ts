/** Partners shown on the Services page. */
export type Partner = {
  name: string
  role: string
  blurb: string
  logo: string
  icon: string
}

export const PARTNERS: Partner[] = [
  {
    name: 'Habi AI',
    role: 'Business automation specialist',
    blurb: 'Our collaborator partner for AI workflow automation, setting up automated systems that take repetitive tasks off the team so we can focus on shooting.',
    logo: '/partners/habiai-banner.jpg',
    icon: '/partners/habiai-icon.png',
  },
]

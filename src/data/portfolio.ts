/**
 * Portfolio photos. `thumb` is the grid size, `full` opens in the lightbox.
 * Drop new images in public/portfolio/ and add a row here.
 */
export type Shot = { id: string; thumb: string; full: string; w: number; h: number; alt: string }

const dims: [number, number][] = [
  [1400, 1063], [1400, 1400], [787, 1399], [1400, 1063], [787, 1400], [1400, 1063], [1400, 1400], [787, 1400],
  [1399, 1400], [1400, 1063], [1400, 1063], [1399, 787], [787, 1400], [1400, 1400], [1400, 1400], [787, 1399],
  [787, 1400], [787, 1400], [787, 1399], [1400, 1400], [787, 1399], [1400, 1063],
]

const alts = [
  'Loaded breakfast sandwich', 'Chocolate cups with nuts', 'Splashing lime drink on black', 'Chicken sandwich on pink',
  'Fried bites floating over a plate', 'Chocolate cake with ice cream and berries', 'Shrimp tempura rolls', 'Iced coffee pour with splash',
  'Cheeseburger', 'Box of mini pizzas', 'Orange iced tea in a branded cup', 'Plated appetizers on marble',
  'Coffee beans floating above a cup', 'Crispy rolls with sauce', 'Flatbread pizza slice pull', 'Berry drink splash',
  'Pastries floating above a basket', 'Dessert cake with floating treats', 'Pancakes with chocolate and berries', 'Chocolates and pecans',
  'Layered fruit drink splash', 'Cheesecake with chocolate glaze',
]

export const SHOTS: Shot[] = dims.map(([w, h], i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: `p${n}`, thumb: `/portfolio/t${n}.jpg`, full: `/portfolio/p${n}.jpg`, w, h, alt: alts[i] }
})

/** Studio shoots: portraits and couples shot in the studio. */
const studioDims: [number, number][] = [[1600, 900], [1600, 900], [900, 1600], [533, 958], [1080, 1080], [900, 1600], [1080, 1086]]
const studioAlts = ['Portrait lying on a blue-lit staircase', 'Black and white couple portrait with window blind shadows', 'Portrait in a red hoodie holding a basketball on purple', 'Portrait in a red dress with warm light', 'Couple making a heart with their arms on a gold backdrop', 'Portrait in a pink Judeng Production Studio jacket on purple', 'Nine expressions in a studio portrait grid']
export const STUDIO_SHOTS: Shot[] = studioDims.map(([w, h], i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: `s${n}`, thumb: `/portfolio/ts${n}.jpg`, full: `/portfolio/s${n}.jpg`, w, h, alt: studioAlts[i] }
})

/** Photo and video coverage: the crew at weddings, corporate events and shoots. */
const coverageDims: [number, number][] = [[1600, 900], [1600, 900], [1600, 1143], [1600, 900], [1600, 1010], [1600, 1200], [1600, 1066], [1600, 1024]]
const coverageAlts = ['The crew with a wedding couple in matching Judeng Production shirts', 'The crew with a guest at the Piyestang Pinoy sa Kuwait event', 'Photo booth strip of the crew in team shirts and varsity jackets', 'The crew with cameras and headsets at a corporate staff party', 'The crew with a wedding couple under a flower arch', 'Lights, cameras and a live monitor set up for a studio interview shoot', 'The crew in pink vests with a gimbal and cameras at an event', 'Crew filming a wedding ceremony on stage']
export const COVERAGE_SHOTS: Shot[] = coverageDims.map(([w, h], i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: `c${n}`, thumb: `/portfolio/tc${n}.jpg`, full: `/portfolio/c${n}.jpg`, w, h, alt: coverageAlts[i] }
})

/** Cake mapping: projection mapping shows on cakes. Add more photos here as they come in. */
export const CAKE_SHOTS: Shot[] = [
  { id: 'cm01', thumb: '/portfolio/tcm01.jpg', full: '/portfolio/cm01.jpg', w: 840, h: 1255, alt: 'Five-tier wedding cake with names and wedding rings projected on it' },
]

/** 360 photo booth: guests on the rotating platform. */
export const BOOTH360_SHOTS: Shot[] = [
  { id: 'b01', thumb: '/portfolio/tb01.jpg', full: '/portfolio/b01.jpg', w: 1536, h: 1024, alt: 'Bride and groom posing on the 360 photo booth platform' },
  { id: 'b02', thumb: '/portfolio/tb02.jpg', full: '/portfolio/b02.jpg', w: 1536, h: 1024, alt: 'Three friends celebrating a birthday on the 360 photo booth' },
  { id: 'b03', thumb: '/portfolio/tb03.jpg', full: '/portfolio/b03.jpg', w: 1536, h: 1024, alt: 'Couple dancing on the 360 photo booth at a formal event' },
]

import type { Product } from '@/types/product'

/** Sample mags and accessories for the local demo and for supabase/sample-products.sql (same items). */
export const SAMPLE_PRODUCTS: Omit<Product, 'id' | 'created_at'>[] = [
  {
    "category": "mags",
    "name": "Enkei 17\" Mags (set of 4)",
    "brand": "Enkei",
    "size": "17 inch, 5x114.3",
    "fits": "Honda Civic, Honda Accord, Mazda 3",
    "condition": "new",
    "price": 56000,
    "stock": 2,
    "description": "Lightweight 10-spoke alloy set, brand new in the box. Includes center caps. Come see them fitted on a car before you buy.",
    "photos": [
      "/samples/mag-enkei.svg"
    ],
    "listed": true
  },
  {
    "category": "mags",
    "name": "BBS-style 16\" Mags (set of 4)",
    "brand": "BBS",
    "size": "16 inch, 4x100",
    "fits": "Toyota Vios, Honda City, Mazda 2",
    "condition": "new",
    "price": 21500,
    "stock": 3,
    "description": "Classic mesh design in a polished finish. Popular upgrade for sedans. Tires not included.",
    "photos": [
      "/samples/mag-bbs.svg"
    ],
    "listed": true
  },
  {
    "category": "mags",
    "name": "Rays 18\" Mags (set of 4)",
    "brand": "Rays",
    "size": "18 inch, 5x114.3",
    "fits": "Toyota Camry, Honda Accord, Subaru Legacy",
    "condition": "used",
    "price": 48000,
    "stock": 1,
    "description": "Used set in good condition with light surface marks. No bends or cracks. One set only.",
    "photos": [
      "/samples/mag-te37.svg"
    ],
    "listed": true
  },
  {
    "category": "mags",
    "name": "15\" Alloy Mags (set of 4)",
    "brand": "",
    "size": "15 inch, 4x100",
    "fits": "Toyota Wigo, Hyundai Eon, Suzuki Celerio",
    "condition": "new",
    "price": 14500,
    "stock": 6,
    "description": "Affordable alloy set for small cars. Brand new. Ask about matching tires.",
    "photos": [
      "/samples/mag-15.svg"
    ],
    "listed": true
  },
  {
    "category": "mags",
    "name": "20\" Mags (set of 4)",
    "brand": "",
    "size": "20 inch, 6x139.7",
    "fits": "Toyota Fortuner, Toyota Hilux, Mitsubishi Montero",
    "condition": "new",
    "price": 72000,
    "stock": 1,
    "description": "Split-spoke 20 inch set for SUVs and pickups. Brand new. Ask us to confirm fitment for your model.",
    "photos": [
      "/samples/mag-20.svg"
    ],
    "listed": true
  },
  {
    "category": "mags",
    "name": "Motorcycle Mags 17\" (pair)",
    "brand": "",
    "size": "17 inch, 1.6 / 1.85 front and rear",
    "fits": "Honda Click, Yamaha Mio, Suzuki Raider",
    "condition": "new",
    "price": 6800,
    "stock": 5,
    "description": "Five-spoke sport mags for scooters and underbones. Front and rear pair, brand new.",
    "photos": [
      "/samples/mag-bike.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Dash Cam 1080p (front and rear)",
    "brand": "Viofo",
    "size": "",
    "fits": "Universal",
    "condition": "new",
    "price": 4500,
    "stock": 12,
    "description": "Records front and rear in full HD with night vision. Loop recording and parking mode. Memory card sold separately.",
    "photos": [
      "/samples/acc-dashcam.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Leatherette Seat Covers (full set)",
    "brand": "",
    "size": "Sedan, 5 seats",
    "fits": "Most sedans",
    "condition": "new",
    "price": 3200,
    "stock": 8,
    "description": "Easy-to-clean leatherette with red stitching. Covers front and rear seats and headrests.",
    "photos": [
      "/samples/acc-seat.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "All-Weather Floor Mats (set of 5)",
    "brand": "",
    "size": "Universal",
    "fits": "Most sedans and hatchbacks",
    "condition": "new",
    "price": 1800,
    "stock": 15,
    "description": "Raised-edge mats that keep mud and water off the floor. Trim to fit.",
    "photos": [
      "/samples/acc-mats.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "LED Headlight Bulbs H4 (pair)",
    "brand": "",
    "size": "H4",
    "fits": "Cars and motorcycles with H4 sockets",
    "condition": "new",
    "price": 1650,
    "stock": 20,
    "description": "Bright white LED upgrade for H4 headlights. Plug and play for most vehicles.",
    "photos": [
      "/samples/acc-led.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Motorcycle Phone Mount with USB Charger",
    "brand": "",
    "size": "Handlebar 22-32 mm",
    "fits": "Motorcycles and scooters",
    "condition": "new",
    "price": 950,
    "stock": 14,
    "description": "Holds phones up to 6.7 inches with a fast-charge USB port. Water-resistant switch.",
    "photos": [
      "/samples/acc-phone.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Full-Face Helmet",
    "brand": "",
    "size": "M / L / XL",
    "fits": "Riders",
    "condition": "new",
    "price": 3900,
    "stock": 6,
    "description": "Full-face helmet with a clear visor and removable liner. Please try on a size before buying.",
    "photos": [
      "/samples/acc-helmet.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Portable Tire Inflator (12V)",
    "brand": "",
    "size": "12V, 150 PSI",
    "fits": "Cars and motorcycles",
    "condition": "new",
    "price": 1450,
    "stock": 9,
    "description": "Digital gauge with auto shut-off. Plugs into the car's 12V socket. Handy for road trips.",
    "photos": [
      "/samples/acc-inflator.svg"
    ],
    "listed": true
  },
  {
    "category": "accessories",
    "name": "Waterproof Car Cover",
    "brand": "",
    "size": "Sedan",
    "fits": "Most sedans",
    "condition": "new",
    "price": 1250,
    "stock": 10,
    "description": "UV and rain protection with elastic hem and tie-down straps.",
    "photos": [
      "/samples/acc-cover.svg"
    ],
    "listed": true
  }
]

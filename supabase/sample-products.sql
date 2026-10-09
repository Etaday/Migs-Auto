-- Migs Auto: sample mags and accessories.
-- Run in the Supabase SQL Editor. Safe to run twice (an item that already exists by name is skipped).
-- Every sample uses a photo under /samples/, so they are easy to find and remove later:
--   delete from public.products where photos[1] like '/samples/%';

insert into public.products (category, name, brand, size, fits, condition, price, stock, description, photos, listed)
select v.* from (values
  ('mags', 'Enkei 17" Mags (set of 4)', 'Enkei', '17 inch, 5x114.3', 'Honda Civic, Honda Accord, Mazda 3', 'new', 56000, 2, 'Lightweight 10-spoke alloy set, brand new in the box. Includes center caps. Come see them fitted on a car before you buy.', array['/samples/mag-enkei.svg']::text[], true),
  ('mags', 'BBS-style 16" Mags (set of 4)', 'BBS', '16 inch, 4x100', 'Toyota Vios, Honda City, Mazda 2', 'new', 21500, 3, 'Classic mesh design in a polished finish. Popular upgrade for sedans. Tires not included.', array['/samples/mag-bbs.svg']::text[], true),
  ('mags', 'Rays 18" Mags (set of 4)', 'Rays', '18 inch, 5x114.3', 'Toyota Camry, Honda Accord, Subaru Legacy', 'used', 48000, 1, 'Used set in good condition with light surface marks. No bends or cracks. One set only.', array['/samples/mag-te37.svg']::text[], true),
  ('mags', '15" Alloy Mags (set of 4)', '', '15 inch, 4x100', 'Toyota Wigo, Hyundai Eon, Suzuki Celerio', 'new', 14500, 6, 'Affordable alloy set for small cars. Brand new. Ask about matching tires.', array['/samples/mag-15.svg']::text[], true),
  ('mags', '20" Mags (set of 4)', '', '20 inch, 6x139.7', 'Toyota Fortuner, Toyota Hilux, Mitsubishi Montero', 'new', 72000, 1, 'Split-spoke 20 inch set for SUVs and pickups. Brand new. Ask us to confirm fitment for your model.', array['/samples/mag-20.svg']::text[], true),
  ('mags', 'Motorcycle Mags 17" (pair)', '', '17 inch, 1.6 / 1.85 front and rear', 'Honda Click, Yamaha Mio, Suzuki Raider', 'new', 6800, 5, 'Five-spoke sport mags for scooters and underbones. Front and rear pair, brand new.', array['/samples/mag-bike.svg']::text[], true),
  ('accessories', 'Dash Cam 1080p (front and rear)', 'Viofo', '', 'Universal', 'new', 4500, 12, 'Records front and rear in full HD with night vision. Loop recording and parking mode. Memory card sold separately.', array['/samples/acc-dashcam.svg']::text[], true),
  ('accessories', 'Leatherette Seat Covers (full set)', '', 'Sedan, 5 seats', 'Most sedans', 'new', 3200, 8, 'Easy-to-clean leatherette with red stitching. Covers front and rear seats and headrests.', array['/samples/acc-seat.svg']::text[], true),
  ('accessories', 'All-Weather Floor Mats (set of 5)', '', 'Universal', 'Most sedans and hatchbacks', 'new', 1800, 15, 'Raised-edge mats that keep mud and water off the floor. Trim to fit.', array['/samples/acc-mats.svg']::text[], true),
  ('accessories', 'LED Headlight Bulbs H4 (pair)', '', 'H4', 'Cars and motorcycles with H4 sockets', 'new', 1650, 20, 'Bright white LED upgrade for H4 headlights. Plug and play for most vehicles.', array['/samples/acc-led.svg']::text[], true),
  ('accessories', 'Motorcycle Phone Mount with USB Charger', '', 'Handlebar 22-32 mm', 'Motorcycles and scooters', 'new', 950, 14, 'Holds phones up to 6.7 inches with a fast-charge USB port. Water-resistant switch.', array['/samples/acc-phone.svg']::text[], true),
  ('accessories', 'Full-Face Helmet', '', 'M / L / XL', 'Riders', 'new', 3900, 6, 'Full-face helmet with a clear visor and removable liner. Please try on a size before buying.', array['/samples/acc-helmet.svg']::text[], true),
  ('accessories', 'Portable Tire Inflator (12V)', '', '12V, 150 PSI', 'Cars and motorcycles', 'new', 1450, 9, 'Digital gauge with auto shut-off. Plugs into the car''s 12V socket. Handy for road trips.', array['/samples/acc-inflator.svg']::text[], true),
  ('accessories', 'Waterproof Car Cover', '', 'Sedan', 'Most sedans', 'new', 1250, 10, 'UV and rain protection with elastic hem and tie-down straps.', array['/samples/acc-cover.svg']::text[], true)
) as v(category, name, brand, size, fits, condition, price, stock, description, photos, listed)
where not exists (select 1 from public.products p where p.name = v.name);

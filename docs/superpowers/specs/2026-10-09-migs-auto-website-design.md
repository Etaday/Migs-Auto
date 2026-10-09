# Migs Auto Website: Design

## Goal
A website for Migs Auto, a dealer selling cars and motorcycles. Visitors browse inventory and contact Migs (inquire, trade in, finance, book a test drive). Migs manages everything from an admin dashboard.

## Approach
Copy an existing Vite, React 19, TypeScript, GSAP and Supabase portfolio-site template into this repo and re-skin it. Reuse routing, admin, forms, chatbot, invoices and the booking calendar. Fresh build rejected: slower, less functionality.

## Brand
- Near-black background, silver text/logo, red accents and buttons only.
- Logo files from the user for header, favicon, share image and invoice header.
- 3D intro replaced by a short logo reveal.
- Currency: PHP (₱).

## Public pages
- **Home:** hero, featured vehicles, Cars/Motorcycles switch, shortcuts to services.
- **Inventory:** filter by type, brand, price, year. Vehicle detail page: photo gallery, specs, Inquire/Reserve.
- **Trade-in:** form (vehicle description, photos, asking price).
- **Financing:** payment calculator and inquiry form.
- **Test drive:** date/time picker for a chosen vehicle (reuse the template's date picker).
- **About, Contact:** map link, WhatsApp, call, Messenger.
- **Chatbot:** answers questions about inventory.

## Admin (`/admin`)
- Add/edit vehicles; mark sold or reserved; photo upload.
- Inbox for inquiries, trade-ins, financing requests, test drives, each with a status.
- Quote, invoice and receipt tools kept and relabelled for vehicle sales.
- Sign-in restricted to emails in the `admins` table.

## Data and hosting
- New Supabase project: vehicles, inquiries, admins. Creating it needs user approval at that point.
- Demo mode with sample vehicles until Supabase is connected (as in the template).
- Vercel deploy and any `git push` only on explicit user request; show on localhost first.
- Remote: `https://github.com/Etaday/Migs-Auto-Website.git` (unverified).

## Removed from the template
Photo/video portfolio, price list, music autoplay.

## Open inputs (placeholders until supplied)
Migs's phone, WhatsApp, address, hours; vehicle photos and specs.

## Testing
Build passes; forms and filters tested; reviewed on localhost at desktop and mobile widths.

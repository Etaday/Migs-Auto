# Judeng Production Studio

Website for Judeng Production Studio, a video and photo production studio.
Built on the brewed-ops portfolio template (Vite, React 19, TypeScript, Three.js, GSAP).

## Deploy (Vercel)

Import the repo in Vercel, set the Root Directory to `site`, and deploy; `vercel.json` handles the build and the page routes. Or from this folder run `npx vercel --prod`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

## Studio dashboard (/admin)

The owner manages everything at `/admin`: booking requests (status, deposit received, reschedule, notes, WhatsApp/call/email links, CSV export), a calendar, invoices and receipts made from a booking, reviews to approve, and contact messages.

Without a database it runs in **demo mode** (sample data, saved only in the browser). To make it real, connect a free Supabase project:

1. The Supabase project and tables are already set up (`supabase/schema.sql` was applied). Only the emails in the `admins` table can open the dashboard: `angelo@judengproduction.com` and `elvistaday@gmail.com`. To add another owner, run `insert into public.admins values ('name@example.com');` in the Supabase SQL Editor.
2. In Supabase: **Authentication > Users > Add user > Create new user**. Use an email from the admins list, set a password, and tick **Auto confirm user**. Also switch off **Allow new users to sign up** (Sign In / Providers).
3. In Vercel, **Settings > Environment Variables**, add `VITE_SUPABASE_URL` (`https://wxzjxhnlwuhczrgowvju.supabase.co`) and `VITE_SUPABASE_ANON_KEY` (Supabase **Project Settings > API > anon public key**), then redeploy. Locally these live in `.env.local`, which is not uploaded.

Then bookings, messages and reviews sent from the website land in the dashboard, approved reviews appear on the Clients page, and dates the owner has confirmed show a warning on the booking form.

## Google Doc as the knowledge base

Prices and the location charge table follow the studio's Google Doc "Judeng Production - AI Knowledge Base" (document id `17ciFOmNEjfhKvHXq2Y-8XlQHmj25G3TJz5oLA-HXTec`, change it with the `GOOGLE_DOC_ID` variable in Vercel).

- `api/knowledge.ts` reads the doc, `src/lib/knowledgeParse.ts` picks out the 20 option prices, the location table and the "TBA" list, and the site applies them (`src/lib/knowledgeClient.ts`). Changes in the doc reach the site within about 5 minutes (visitors may need one more page load).
- It reads the doc's sentences, so keep their shape when editing, for example `Wedding cake, 6 layers, with photo booth package: 120 KWD` and `Basic: 95 KWD, photo booth only`. If the doc cannot be read or looks wrong, the site keeps the built-in values in `src/data/catalog.ts`.
- The doc must be shared as **Anyone with the link: Viewer** (not Editor).
- New services, new packages and policy wording still need a developer change, because the site only reads prices and areas from the doc.

## Edit the content

- `src/data/profile.ts` - name, email, social links (still `#`), hero copy
- `src/data/work.ts` - the Work page and Home cards. Add `href` and `imageSrc` to an item to link a real project
- `src/data/faqs.ts` - FAQ answers
- `src/components/BookingGrid.tsx` and `src/lib/booking.ts` - the booking form at `/book` (services come from `work.ts`; set `VITE_CONTACT_ENDPOINT` to receive submissions, otherwise it opens the visitor's mail app)
- `src/data/catalog.ts` - ALL prices (KWD), location charges and the 30% deposit rule. Edit here and the Services page, price list, booking form and invoice maker all update
- `src/components/ServicesGrid.tsx` - services and process
- `src/components/TestimonialsGrid.tsx` - the Clients page
- `src/styles/tokens.css` - brand colors
- `public/avatar.svg`, `public/favicon.svg`, `public/placeholders/logo.svg` - logo mark (replace with the real logo)

Licensed under the template's MIT license (see LICENSE).

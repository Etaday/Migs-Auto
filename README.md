# Migs Auto

Website for Migs Auto, a dealer of cars and motorcycles: inventory, vehicle pages, trade-in, financing, test drives, and an owner dashboard.
Built with Vite, React 19, TypeScript and GSAP.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (vitest)
npm run build    # outputs dist/
```

## Public pages

Home, Inventory (filter by type, brand, price, year), vehicle detail with modifications and an Inquire / Reserve form, Trade-in, Financing calculator, Test drive booking, About, Contact.

## Dealer dashboard (/admin)

- **Overview:** stock, inventory value, new leads, sales and profit this month, upcoming test drives, longest in stock.
- **Inventory:** add, edit and delete listings; status Available / Reserved / Sold; photo links; modifications; private cost for margin; CSV export.
  Enter a **VIN** and press **Get real specs** to fill in make, model, year, engine, fuel and transmission from the US NHTSA vehicle database (free, US-market vehicles; anything it does not know is entered by hand).
- **Leads:** inquiries, test drives, financing and trade-in requests with status and one-tap call, WhatsApp and email.
- **Sales:** sold vehicles, revenue and gross profit, with one-tap Invoice and Receipt.
- **Invoices & receipts:** numbered documents (MA-INV-2026-0001, MA-REC-2026-0001) with discounts and partial payments; a receipt carries earlier payments forward. Print or save as PDF.
- **Team:** who can sign in.

Without a database it runs in **demo mode** (sample vehicles, saved only in the browser). To make it real:

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor. Add the owner's email to the `admins` table (`insert into public.admins values ('owner@example.com');`).
2. In Supabase **Authentication > Users**, create the owner user and turn off public sign-ups.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (in `.env.local` locally, and in the host's environment variables when deployed).

Visitors can read listed (not sold) vehicles but never the private cost, sold price or sold date; that is enforced in the database (`schema.sql`).

## Details to fill in

Phone, WhatsApp, email, address and opening hours are placeholders in `src/data/profile.ts`.

## Deploy

`vercel.json` handles the build and page routes. Deploy to Vercel or any static host that serves `dist/`.

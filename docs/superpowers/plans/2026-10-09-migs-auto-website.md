# Migs Auto Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Migs Auto car and motorcycle dealer site (inventory, inquiries, trade-in, financing, test drives, admin dashboard) built by re-skinning an existing portfolio-site template.

**Architecture:** Copy `upload-B` into this repo, keep its shell (Rail/TabBar, lazy routes, admin, `lib/db.ts` demo-or-Supabase data layer, ChatBot). Add two tables, `vehicles` and `inquiries` (one table; `kind` = `inquiry | trade_in | financing | test_drive`). Pure logic (`inventory.ts`, `financing.ts`) is unit-tested with vitest; UI is verified by typecheck, build and localhost.

**Tech Stack:** Vite, React 19, TypeScript, react-router-dom 7, GSAP, Supabase (REST via `lib/db.ts`), vitest (new, dev-only).

**Spec:** `docs/superpowers/specs/2026-10-09-migs-auto-website-design.md`

## Global Constraints

- Source to clone: the template folder (exclude `node_modules`, `dist`, `my-portfolio`, `.git`, `.env*`).
- Brand: near-black background, silver text, red used only for accents and buttons. Currency ₱ (PHP). Business name "Migs Auto".
- Logo files come from the user (images in the chat). Until files exist in `public/`, use a text wordmark "MIGS AUTO" and do not block on them.
- Contact details (phone, WhatsApp, address, hours) live in ONE file, `src/data/profile.ts`, with obvious placeholders.
- Supabase project creation, `git push` and Vercel deploy happen only on explicit user request. Show on localhost first.
- Remote `origin` is `https://github.com/Etaday/Migs-Auto-Website.git` (unverified).
- Admin sign-in is restricted to emails in the `admins` table.
- Removed from the template: photo/video portfolio, price list, music autoplay.

## Review Focus

- Inventory filter with no matches shows an empty state, not a blank grid.
- Vehicle detail for an unknown or sold id shows "not available" with a link back, not a crash.
- Financing calculator with 0% interest, 0 down payment, or down payment ≥ price returns sensible numbers (no NaN, no negative).
- Public forms reject empty name or empty contact and do not double-submit on repeated clicks.
- Vehicle with zero photos renders a placeholder image in the card, detail page and admin.
- Marking a vehicle sold hides it from the default public listing but keeps it in admin.

---

## File Structure

- `src/types/vehicle.ts`: `Vehicle`, `VehicleType`, `VehicleStatus`, `Inquiry`, `InquiryKind`.
- `src/lib/inventory.ts`: `filterVehicles`, `sortVehicles`; pure.
- `src/lib/financing.ts`: `monthlyPayment`; pure.
- `src/lib/db.ts` (modify): add tables `vehicles`, `inquiries`, demo seed, `submitPublic('inquiries')`, public `listVehicles`.
- `supabase/schema.sql` (modify): add the two tables and policies.
- `src/data/profile.ts` (modify): Migs Auto name and contact placeholders.
- `src/components/inventory/`: `InventoryView.tsx`, `VehicleCard.tsx`, `VehicleDetail.tsx`.
- `src/components/forms/`: `InquiryForm.tsx` (inquire/reserve and test drive), `TradeInView.tsx`, `FinancingView.tsx`.
- `src/components/admin/`: `VehiclesView.tsx`, `InquiriesView.tsx` (new); `AdminApp.tsx` (modify tabs).
- `tests/`: `inventory.test.ts`, `financing.test.ts`.

---

### Task 1: Clone and rebrand scaffold

**Files:**
- Create: `.gitignore`, everything copied from `upload-B`
- Modify: `package.json` (name `migs-auto-website`, add `vitest`, `"test": "vitest run"`), `index.html` (title, meta), `public/manifest.webmanifest`, `src/styles/tokens.css`, `src/App.tsx` (titles), `README.md`

**Interfaces:**
- Produces: a building project at repo root; tokens `--bg`, `--text`, `--accent` (red) used by later tasks via existing token names.

- [ ] **Step 1:** `rsync -a --exclude node_modules --exclude dist --exclude my-portfolio --exclude .git --exclude '.env*' --exclude supabase/functions upload-B/ Migs-Auto-Website/`, then add `.gitignore` (`node_modules`, `dist`, `.env*`).
- [ ] **Step 2:** In `package.json` set the name, run `npm install` and `npm install -D vitest`.
- [ ] **Step 3:** In `tokens.css` replace the palette: near-black `#0B0B0D` background, silver `#D8DADF` text, red `#D7191F` accent and hover `#EF3A40`; keep existing variable names so the other stylesheets keep working. Replace the template strings in `index.html`, manifest and `App.tsx` titles (`Home`, `Inventory`, `Trade-in`, `Financing`, `Test drive`, `About`, `Contact`).
- [ ] **Step 4:** Run `npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `chore: clone template shell and apply Migs Auto palette`.

### Task 2: Vehicle and inquiry data layer

**Files:**
- Create: `src/types/vehicle.ts`, `src/lib/inventory.ts`, `src/lib/financing.ts`, `tests/inventory.test.ts`, `tests/financing.test.ts`
- Modify: `src/lib/db.ts`, `supabase/schema.sql`

**Interfaces:**
- Produces:
  - `type VehicleType = 'car' | 'motorcycle'`, `type VehicleStatus = 'available' | 'reserved' | 'sold'`
  - `type Vehicle = { id; type; brand; model; year; price; mileage; transmission; fuel; color; description; photos: string[]; status; featured: boolean; created_at }`
  - `type InquiryKind = 'inquiry' | 'trade_in' | 'financing' | 'test_drive'`
  - `type Inquiry = { id; kind; vehicle_id: string | null; name; phone; email; message; details: Record<string, unknown>; status: 'new' | 'contacted' | 'closed'; created_at }`
  - `filterVehicles(list: Vehicle[], f: { type?: VehicleType; brand?: string; minPrice?: number; maxPrice?: number; minYear?: number; includeSold?: boolean }): Vehicle[]`
  - `monthlyPayment(price: number, down: number, annualRatePct: number, months: number): number`
  - `db.ts`: `Table` gains `'vehicles' | 'inquiries'`; `listVehicles(): Promise<Vehicle[]>` (public, no sign-in); `submitPublic` accepts `'inquiries'`.

- [ ] **Step 1: Write failing tests.** `inventory.test.ts`: `filterVehicles` hides `sold` by default, shows with `includeSold`, filters by type, price range and year, returns `[]` for no match. `financing.test.ts`: `monthlyPayment(1_000_000, 200_000, 0, 48)` equals `16666.67` (rounded to 2 dp); with rate 12%, result is greater than the 0% result; `down >= price` returns `0`; `months <= 0` returns `0`; never returns `NaN`.
- [ ] **Step 2:** Run `npx vitest run`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement both modules. Standard amortization formula; zero-rate branch is straight division.
- [ ] **Step 4:** Run `npx vitest run`. Expected: PASS.
- [ ] **Step 5:** Extend `db.ts` (types, `Rows`, demo seed of 6 sample vehicles, 3 cars and 3 motorcycles with placeholder photos, demo storage key `migs-demo-db-v1`, session keys renamed `migs-*`) and add the two tables with RLS to `schema.sql`: admins full access; anon insert on `inquiries`; anon select on `vehicles` where `status <> 'sold'`.
- [ ] **Step 6:** Run `npm run typecheck`. Expected: PASS. Commit `feat: vehicles and inquiries data layer`.

### Task 3: Public inventory pages

**Files:**
- Create: `src/components/inventory/InventoryView.tsx`, `VehicleCard.tsx`, `VehicleDetail.tsx`
- Modify: `src/main.tsx` (routes `/inventory`, `/inventory/:id`), `src/components/Rail.tsx`, `TabBar.tsx` (nav items: Home, Inventory, Trade-in, Financing, Test drive, About, Contact), `src/components/Home.tsx` (hero, featured vehicles, Cars/Motorcycles switch, service shortcuts), `src/data/profile.ts`

**Interfaces:**
- Consumes: `listVehicles`, `filterVehicles` from Task 2.
- Produces: route `/inventory?type=car|motorcycle`; `VehicleDetail` renders `InquiryForm` (Task 4) with `vehicleId` prop.

- [ ] **Step 1:** `InventoryView`: loads vehicles, filter bar (type tabs, brand select, price range, min year), grid of `VehicleCard`; empty state text "No vehicles match. Clear filters."; reads `?type=`.
- [ ] **Step 2:** `VehicleDetail`: photo gallery, spec table, price in ₱ (`toLocaleString('en-PH')`), Inquire/Reserve button, and for unknown or sold ids "This vehicle is no longer available" with a link to `/inventory`. Zero photos renders a placeholder.
- [ ] **Step 3:** Update Home, nav and `profile.ts` (name, placeholder phone, WhatsApp, address, hours).
- [ ] **Step 4:** Run `npm run build`. Expected: PASS. Open `http://localhost:5173/inventory`, check filters, a detail page, an unknown id, and phone width.
- [ ] **Step 5:** Commit `feat: inventory, vehicle detail and home`.

### Task 4: Inquiry, trade-in, financing and test-drive forms

**Files:**
- Create: `src/components/forms/InquiryForm.tsx`, `TradeInView.tsx`, `FinancingView.tsx`, `TestDriveView.tsx`
- Modify: `src/main.tsx` (routes `/trade-in`, `/financing`, `/test-drive`), `src/lib/contact.ts` (shared validation: name required, phone or email required)

**Interfaces:**
- Consumes: `submitPublic('inquiries', row)`, `monthlyPayment`, existing `DatePicker`.
- Produces: `InquiryForm({ vehicleId?: string; kind?: InquiryKind })`; `validateContact(v: { name: string; phone: string; email: string }): string | null` in `contact.ts`.

- [ ] **Step 1: Write failing test** `tests/contact.test.ts`: `validateContact` returns an error for empty name and for neither phone nor email; returns `null` for a valid entry.
- [ ] **Step 2:** Run it; expected FAIL. Implement `validateContact`; run again; expected PASS.
- [ ] **Step 3:** Build the four forms. Submit button disables while sending and after success shows a confirmation (no double submit). Trade-in stores description, photos and asking price in `details`; financing stores price, down payment, term and the computed monthly payment; test drive stores `vehicle_id`, date and time from `DatePicker`.
- [ ] **Step 4:** `npm run build`, then submit each form on localhost in demo mode and confirm each appears in the Task 5 admin inbox.
- [ ] **Step 5:** Commit `feat: inquiry, trade-in, financing and test-drive forms`.

### Task 5: Admin dashboard

**Files:**
- Create: `src/components/admin/VehiclesView.tsx`, `InquiriesView.tsx`
- Modify: `src/components/admin/AdminApp.tsx` (TABS: Overview, Vehicles, Inquiries, Invoices, Quotation, Finance, Team), `Overview.tsx`, `data.tsx`, `InvoicesView.tsx` and `QuoteView.tsx` (relabel to vehicle sales)
- Delete: `BookingsView.tsx`, `CalendarView.tsx`, `ReviewsView.tsx`, `MessagesView.tsx`, `QuotesView.tsx`, `BookingDrawer.tsx`, `AddEventDrawer.tsx` and their imports, only if nothing else imports them

**Interfaces:**
- Consumes: `listRows('vehicles' | 'inquiries')`, `addRow`, `updateRow`, `deleteRow`.

- [ ] **Step 1:** `VehiclesView`: table with add/edit form, status select (available/reserved/sold), featured toggle, photo URLs list (file upload is out of scope for the first release; photos are entered as image paths or URLs).
- [ ] **Step 2:** `InquiriesView`: list filtered by kind, status select (new/contacted/closed), WhatsApp/call/email links from the row, CSV export.
- [ ] **Step 3:** Update tabs and `Overview` counts (available vehicles, new inquiries). Fix imports.
- [ ] **Step 4:** `npm run typecheck && npm run build`. Expected: PASS. In demo mode on `/admin`: add a vehicle, mark it sold, confirm it leaves `/inventory` but stays in admin; change an inquiry status.
- [ ] **Step 5:** Commit `feat: admin vehicles and inquiries`.

### Task 6: Chatbot, cleanup and docs

**Files:**
- Modify: `src/lib/faqBot.ts`, `src/data/faqs.ts`, `api/knowledge.ts`, `src/components/ChatBot.tsx`, `README.md`
- Delete: `MusicAutoplay`, portfolio/work/price-list components, data files and public assets not used by Migs Auto

**Interfaces:**
- Consumes: `listVehicles` for inventory answers.

- [ ] **Step 1: Write failing test** `tests/faqBot.test.ts`: the bot's answer for "do you have a motorcycle" mentions an available demo motorcycle; "what are your hours" returns the hours from `profile.ts`.
- [ ] **Step 2:** Run; expected FAIL. Rewrite the FAQ content and the bot's lookup for Migs Auto; run again; expected PASS.
- [ ] **Step 3:** Remove the dropped features and unused assets, drop unused routes and imports, update `README.md` (run, build, Supabase setup, deploy placeholders).
- [ ] **Step 4:** Run `npx vitest run && npm run typecheck && npm run lint && npm run build`. Expected: all PASS.
- [ ] **Step 5:** Commit `chore: Migs Auto chatbot, cleanup and README`.

### Task 7: Final verification on localhost

- [ ] **Step 1:** `npm run dev`, open `http://localhost:5173`, and walk through Home, Inventory (filters, detail, unknown id), the four forms, `/admin` demo mode and the chatbot at desktop and phone widths.
- [ ] **Step 2:** Fix anything found, re-run the Task 6 Step 4 command set, and commit.
- [ ] **Step 3:** Report to the user. Do not push or deploy; wait for an explicit request.

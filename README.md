# DukaanMitra — Setup Guide

This zip contains the full source for the app (frontend + backend). `node_modules`
is **not** included (some packages ship OS-specific native binaries), so install
dependencies fresh on your machine.

## 1. Backend

```bash
cd backend
npm install
```

Edit `backend/.env` and confirm these are set:
```
PORT=5000
DATABASE_URL=postgres://<user>:<password>@localhost:5432/<database>
JWT_SECRET=<any-long-random-string>
CLIENT_URL=http://localhost:5173
```

Create the database and load the schema/seed data (in order):
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/migration.sql
psql "$DATABASE_URL" -f db/seed.sql
```

Start the API:
```bash
npm run dev      # http://localhost:5000
```

Login with the seeded account: **raj@sharma.in / password123**

## 2. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:8443 (or 5173, see vite.config.ts)
```

## What changed in this build

- **Sales page**: filter buttons show a pointer cursor; the 4 summary cards
  (Total Sales, Bills Created, Avg Order Value, Items Sold) now navigate to
  Reports, Billing, Billing, and Inventory respectively.
- **Reports page**: "Export CSV" (icon + button) downloads a real CSV per
  report; "View Report" navigates to the matching page; the "Generate" custom
  report button calls a new `GET /api/reports/custom?start=&end=` endpoint and
  downloads a combined CSV for the chosen date range.
- **Insights page**: "+ Add Stock" opens a modal to enter a quantity and calls
  a new `PATCH /api/products/:id/restock` endpoint to increase stock.
- **Backend**: added `restockProduct` (products), `getCustomReport` (reports),
  and fixed `insightsController` to include product `id` in its response
  (required for restocking to target the right product).

No existing UI text, labels, or previously-working functionality were changed.

## What changed in this build (round 2)

- **Sales filters (bug fix)**: "Yesterday" was previously matching
  `created_at >= yesterday` with no upper bound, so it silently included
  today's bills too. It now uses a proper lower+upper date range, so
  Today / Yesterday / 7 Days / 30 Days each show only their own window.
- **Shop Info UPI field (bug fix)**: the `shop_settings` table was missing
  the `upi_id` column the form and update query already referenced, so
  saving the "Shop Info" tab always failed. Added the column via
  `migration.sql` (safe to re-run on an existing database).
- **Seeded login (bug fix)**: the demo password hash in `seed.sql` wasn't
  actually generated from `password123`, so the seeded account could never
  log in. Replaced it with a real bcrypt hash of `password123`.
- **Dashboard**: the header date now refreshes automatically every minute,
  so it stays correct if the page is left open across midnight — no code
  changed the layout or copy.
- **Reports & Help downloads are now PDF**: both the per-report "Export"
  button/icon and the custom date-range "Generate" button now produce a
  branded PDF (via `jspdf` + `jspdf-autotable`) instead of CSV. Help's
  "User Manual" button now downloads a real PDF instead of showing an
  alert. The "Export CSV" label was updated to "Export PDF" since it now
  produces a PDF; no other button text changed.
- **Profile photo upload**: Settings → Profile → "Change Photo" now
  actually uploads a JPG/PNG/WEBP (max 2MB) via a new
  `POST /api/settings/avatar` endpoint (multer, served from `/uploads`),
  and the photo appears immediately in Settings, the sidebar, and the
  top-right avatar.
- **Real logged-in user everywhere**: added a small `AuthContext` that
  fetches `/api/auth/me` once and shares it across the app. The sidebar
  and top navbar no longer hardcode "Raj Sharma" / "R" — they show the
  actual logged-in user's name, role, and avatar (or initial).
- **Top navbar avatar is now a real dropdown**: clicking it opens a menu
  with Profile, Settings, and Logout (closes on outside click or
  navigation), matching how a typical production app behaves.
- Security, Preferences, and Notifications tabs in Settings were already
  wired to the backend correctly — verified end-to-end, no changes needed
  beyond the UPI bug fix above.

No existing UI layout or previously-working functionality was changed
beyond what's listed above.

## What changed in this build (round 3)

- **Language options reduced to exactly three**: Settings → Preferences →
  Language now offers only **English**, **తెలుగు (Telugu)**, and
  **English + తెలుగు** (removed Hindi/Marathi, which were never part of
  the requirement). Same three options on the public landing page.
- **Language now changes the whole app, live**: previously the landing
  page had its own separate, local language toggle that didn't affect
  anything else. Language is now a single app-wide setting (in
  `SettingsContext`): picking it on the landing page, or in
  Settings → Preferences, updates the sidebar, top bar, page headers, and
  Settings page immediately — no save button needed, no reload — and is
  remembered for next time (in the database once logged in, in the
  browser beforehand). The Settings language dropdown also now behaves
  exactly like the Theme dropdown already did (instant preview + saved
  automatically).
- **Theme fix**: confirmed and re-verified the Light/Dark/System Default
  toggle in Settings → Preferences applies immediately when clicked
  (via `applyThemeToDocument`) — this already worked correctly, dark-mode
  CSS overrides exist for the whole app; no separate bug found here beyond
  what's now covered by the same instant-apply pattern used for language.
- **Profile photo confirmed optional**: verified end-to-end (registration
  form has no photo field at all; the users table's `avatar_url` defaults
  to null; Settings and the sidebar/top bar fall back to a colored initial
  avatar when there's no photo). Updated the helper text under "Change
  Photo" to explicitly say "(optional)" so this is clear in the UI too.
- **New shared translation system**: added `frontend/src/i18n/translations.ts`
  with a small, extensible dictionary and a `t(key)` helper exposed from
  `useSettings()`. Applied it to the sidebar navigation, top bar profile
  menu, the full Settings page (all tab labels, field labels, and
  buttons), and every page's header title/subtitle (Inventory, Customers,
  Expenses, Sales, Reports, Insights, Notifications, Help). The landing
  page's existing English/Telugu copy was rewired to use this same shared
  language state instead of its own separate one.
- **No dummy/mock data found**: searched the full frontend and backend for
  placeholder, mock, or dummy content — none exists in application logic.
  `db/seed.sql` remains as an optional, clearly-separate seed script for
  local development (as documented above), not something the app itself
  depends on.
- **Verified production-readiness**: `npm run build` (Vite) completes
  with zero errors, `tsc --noEmit` reports zero type errors across the
  frontend, and every backend `.js` file passes `node --check` (syntax
  validation). `node_modules` and build output were removed from this zip
  as before — run `npm install` in both `frontend/` and `backend/` after
  extracting.

## What changed in this build (round 4) — routing fix

- **Bug**: opening the site's root URL (`/`) did not always show the
  Landing Page. `frontend/src/App.tsx` restored whichever page the app
  was last on from `localStorage.getItem("currentPage")` on every load —
  so if someone had last been on Dashboard, Billing, Settings, etc.,
  reopening or refreshing `/` immediately showed that page instead of
  Landing.
- **Note on "React Router"**: this project does not use the `react-router`
  library (it isn't in `package.json`, and there was no router
  configuration file to find) — navigation has always been plain React
  state in `App.tsx` (`page`/`onNavigate`), with every page rendered at
  the same URL. To satisfy real per-page URLs (so `/dashboard` can be
  opened directly, refreshed, bookmarked, or navigated with browser
  Back/Forward) without adding a second routing system, `App.tsx` now
  syncs that same state with the URL using the browser's native History
  API (`pushState` + `popstate`) — no new dependency, no second router.
- **Fix**: `App.tsx` now derives the initial page from
  `window.location.pathname` via a small `PATH_TO_PAGE` map, defaulting
  to `"landing"` for `/` and for any unrecognized path — never from
  localStorage. Navigating (`onNavigate`, unchanged prop used by every
  page/component) now also pushes the matching URL via
  `PAGE_TO_PATH`, and a `popstate` listener keeps state in sync with
  Back/Forward.
- **Path map** (existing `Page`/component names, not invented ones):
  `/` → `Landing`, `/login` → `Login`, `/register` → `Register`,
  `/dashboard` → `Dashboard`, `/products` (and `/inventory`) →
  `Inventory` (this is the existing Products/Inventory page/component —
  there's no separately named "Products" component in the project),
  `/billing` → `Billing`, `/customers` → `Customers`, `/expenses` →
  `Expenses`, `/sales` → `Sales`, `/reports` → `Reports`, `/insights` →
  `Insights`, `/notifications` → `Notifications`, `/settings` →
  `Settings`, `/help` → `Help`.
- **Nothing else changed**: authentication flow is untouched (Login/
  Register still call `onNavigate("dashboard")` on success, exactly as
  before); no route was removed, renamed, or auto-redirected; no backend
  API route was touched; no visual/design change was made.
- **Verified**: `tsc --noEmit` and `npm run build` both pass with zero
  errors after this change. Started the dev server and confirmed via
  HTTP that `/`, `/dashboard`, `/login`, `/register`, `/products`,
  `/billing`, `/settings`, and an unrecognized path all return `200` and
  serve the same single-page-app shell (Vite's built-in SPA fallback
  serves `index.html` for every path in dev and in `preview`; the actual
  page shown is resolved client-side from the URL by the logic above, so
  `/` reliably resolves to Landing and `/dashboard` reliably resolves to
  Dashboard).

# Partaey

**"like you"** — a Nigeria-first events discovery and ticketing platform, built to serve all 36 states plus the FCT. Think Eventbrite, but designed around how Nigerians actually find and share events — nationwide, not Lagos-only.

## What it does

Partaey lets event organizers self-serve create and manage events, and lets attendees discover, book, and pay for tickets securely — across every category: raves, concerts, comedy shows, conferences, festivals, sports, meetups, and more.

## Live Version: 
click the link => https://partaeyyy.vercel.app/  
Note: the events currently listed are from friends i sent the link to for testing.

## Features

- **Auth** — Email/password authentication via Supabase Auth, with a database trigger syncing `auth.users` → `public.users`
- **Event creation** — Category chips, full list of Nigerian states, ticket tiers, free/RSVP toggle, 18+ age-gating, cover image upload to Supabase Storage
- **Payments** — Paystack inline checkout with server-side payment verification before any order is written
- **Organizer payouts** — Paystack subaccount splits with a configurable platform fee
- **Dashboard** — Bucket list and attended-event counts with date-based logic
- **Profile** — Editable user profiles
- **My Events** — Organizer view with sales stats, edit, and cancel
- **Edit Event** — Update event details post-creation
- **Payout Account setup** — Organizer bank/payout configuration
- **Event photo gallery** — Per-event image galleries
- **Contact Us** page
- **Discover** — Browse upcoming events only, filtered server-side
- **Mobile-responsive** — Tailwind breakpoints (`sm:`, `md:`, `lg:`) across all major pages

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2.15, React 18.3.1 |
| Styling | Tailwind CSS v3.4.4 |
| Backend / Auth / DB | Supabase (Auth, Postgres, Storage) |
| Payments | Paystack (inline checkout, subaccounts, webhooks) |
| Hosting | Vercel |

## Getting started

### Prerequisites

- Node.js
- A Supabase project (Auth, Postgres, Storage enabled)
- A Paystack account (test or live keys)

### Installation

```bash
git clone https://github.com/NOMANLIKEOLA/partaeyyy.git
cd partaeyyy
npm install
```

> ⚠️ This project pins exact dependency versions (no `^` prefixes) in `package.json`. Avoid running `npm update` or regenerating `package.json` from `create-next-app` defaults — the Next.js 14 stack is sensitive to version drift.

### Environment variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
PARTAEY_PLATFORM_FEE_PERCENT=
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `NEXT_PUBLIC_` — doing so exposes it to the client bundle.

### Run locally

```bash
npm run dev
```

## Project structure notes

- `lib/nigeria.ts` — single source of truth for all Nigerian state names
- `lib/types.ts` — shared TypeScript interfaces
- `middleware.ts` — handles Supabase cookie/session refresh in Server Components
- `next.config.js` — kept as `.js`, not `.ts`, due to a resolution conflict between Next.js 14 and 16 tooling
- `postcss.config.mjs`, `tailwind.config.ts` — explicit config files, not framework-generated defaults

## Known build gotchas

- Supabase joined queries (one-to-many vs. many-to-one) may need explicit type casting to avoid TypeScript build failures on Vercel, even when local dev builds pass.
- Supabase Storage buckets must be set to **public** for uploaded images to render.
- Missing rows in `public.users` after signup are handled via a backfill + DB trigger — if you see 409 conflicts, check that the trigger is installed.

## Roadmap

Planned fraud-prevention features (not yet implemented):
- Delayed payouts / holdback period
- Report button on events
- Phone verification
- Manual review queue
- BVN verification

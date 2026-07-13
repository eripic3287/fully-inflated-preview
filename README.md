# Fully Inflated

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. `.env.local` is
git-ignored — real keys must never be committed to this repo. In Vercel,
set the same variables under Project Settings → Environment Variables.

- `STRIPE_SECRET_KEY` — server-side only (used in `lib/stripe.js`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — safe for the browser (used in `lib/stripe-client.js`).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials.

Keys currently in use are Stripe **test-mode** keys (`sk_test_...` / `pk_test_...`).

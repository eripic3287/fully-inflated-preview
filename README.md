# Fully Inflated

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values. `.env.local` is
git-ignored — real keys must never be committed to this repo. In Vercel,
set the same variables under Project Settings → Environment Variables.

- `STRIPE_SECRET_KEY` — server-side only (used in `lib/stripe.js`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — safe for the browser (used in `lib/stripe-client.js`).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials.

Keys currently in use are Stripe **test-mode** keys (`sk_test_...` / `pk_test_...`).

## Database schema

`supabase/migrations/20260713000000_initial_schema.sql` creates the v1.0
tables (`businesses`, `clients`, `client_contracts`, `inventory_items`,
`invoices`, `invoice_history`, `invoice_line_items`) with RLS policies that
scope every row to the caller's own business. Apply it against the existing
Supabase project (already created — don't provision a new one) with:

```
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste the file into the Supabase Dashboard's SQL editor.

Notable decisions baked into the migration — flag if any of these don't match
the prototype's actual behavior before frontend code is written against it:

- **One business per account** (rule 1) is enforced by a `unique (user_id)`
  constraint on `businesses`, not just app logic.
- **Soft delete** (rule 3): `clients` and `inventory_items` have no `delete`
  RLS policy at all — archiving must go through `is_archived = true` updates.
- **Append-only history** (rule 4): `invoice_history` has `select`/`insert`
  policies only, so RLS itself blocks edits and deletes.
- **Client IDs** (`FI-2026-0001` format) are generated per business by a
  count-based trigger — fine for v1.0's expected write volume, but not
  safe under concurrent inserts for the same business; revisit if that
  changes.
- **`payment_collection_method`** on `invoices` (`stripe` | `self_collected`)
  implements rule 7 and isn't in the brief's literal column list — added
  because the rule requires it.
- **`pay_status`** (`unpaid` / `deposit_paid` / `paid_in_full`) and
  **`job_status`** (`upcoming` / `in_progress` / `completed` / `cancelled`)
  value sets are inferred from the brief, not specified verbatim there —
  confirm against the prototype's exact vocabulary.

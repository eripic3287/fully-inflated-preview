-- Fully Inflated — initial schema (v1.0)
-- One migration, reviewed as a whole before any frontend code is written
-- against it (per kickoff brief). See README.md "Database schema" section
-- for the decisions called out below.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------
-- my_business_id() (the auth.uid() -> business_id lookup used by every
-- RLS policy below) is defined further down, right after `businesses` is
-- created — as a `language sql` function, Postgres resolves the table
-- reference in its body at CREATE FUNCTION time, so it can't be declared
-- before the table it queries exists.

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- businesses (1:1 with an auth user for v1.0)
-- ---------------------------------------------------------------------
-- Architecture rule 1: one business per account at Tier 1, enforced at
-- the DB level. The `unique (user_id)` constraint below is what
-- enforces it — a second insert for the same user_id is rejected by
-- Postgres regardless of what the UI allows. When multi-business ships
-- in v2, this becomes a tier-gated check (e.g. a function that counts
-- existing businesses for the user against their plan limit) instead of
-- a hard unique constraint; nothing else in this schema assumes 1:1, so
-- that change is additive.
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  business_name text not null,
  business_email text,
  business_phone text,
  brand_color text,
  logo_url text,
  invoice_style text not null default 'itemized'
    check (invoice_style in ('itemized', 'simple')),
  simple_description text,
  sales_tax_rate numeric(6, 4) not null default 0,
  coach_name text,
  coach_mode text not null default 'full'
    check (coach_mode in ('full', 'advisory', 'off')),
  tax_disclaimer_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

-- Returns the caller's business id, or null if they have none yet.
-- Centralizes the auth.uid() -> business_id lookup used by every RLS
-- policy below, so ownership logic lives in one place.
create or replace function my_business_id()
returns uuid
language sql
stable
as $$
  select id from businesses where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------
-- id is the human-readable "FI-2026-0001" format from the brief, so it
-- doubles as the primary key other tables reference. Generated
-- per-business (each business's clients start at 0001) by the trigger
-- below rather than a global sequence. This is a count-based generator,
-- which is simple and fine for v1.0's expected concurrency (one owner
-- adding clients one at a time); if that ever becomes a race under
-- concurrent inserts, swap it for a per-business counter table without
-- changing the id format or any FK that points at clients.id.
create table clients (
  id text primary key,
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  mailing_address text,
  is_demo boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function set_client_id()
returns trigger
language plpgsql
as $$
declare
  next_num integer;
begin
  if new.id is null then
    select count(*) + 1 into next_num
      from clients
      where business_id = new.business_id;
    new.id := 'FI-' || extract(year from now())::text || '-'
      || lpad(next_num::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger clients_set_id
  before insert on clients
  for each row execute function set_client_id();

create index clients_business_id_idx on clients (business_id);

-- ---------------------------------------------------------------------
-- client_contracts
-- ---------------------------------------------------------------------
create table client_contracts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references clients (id) on delete cascade,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

create index client_contracts_client_id_idx on client_contracts (client_id);

-- ---------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  label text,
  cat text not null check (cat in ('consumable', 'reusable_asset')),
  cost numeric(10, 2) not null default 0,
  price numeric(10, 2) not null default 0,
  qty integer not null default 0,
  reorder_threshold integer,
  lead_time_days integer,
  tax_paid boolean not null default false,
  used_count integer not null default 0,
  is_archived boolean not null default false,
  barcode text,
  is_bag boolean not null default false,
  units_per_bag integer,
  units_remaining integer,
  charge_method text check (charge_method in ('whole_bag', 'per_unit')),
  deduct_method text check (deduct_method in ('whole_bag', 'estimate', 'exact')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inventory_items_set_updated_at
  before update on inventory_items
  for each row execute function set_updated_at();

create index inventory_items_business_id_idx on inventory_items (business_id);

-- ---------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------
-- pay_status / job_status value sets below are a reasonable v1.0 default
-- inferred from the brief (deposit/balance tracking, job status +
-- reasons) — confirm these against the prototype's exact vocabulary
-- before wiring up the frontend.
--
-- payment_collection_method implements architecture rule 7: it's picked
-- per invoice, independent of pay_status, and is not in the brief's
-- column list verbatim but is required by that rule.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  client_id text not null references clients (id),
  doc_type text not null default 'quote' check (doc_type in ('quote', 'invoice')),
  pay_status text not null default 'unpaid'
    check (pay_status in ('unpaid', 'deposit_paid', 'paid_in_full')),
  job_status text not null default 'upcoming'
    check (job_status in ('upcoming', 'in_progress', 'completed', 'cancelled')),
  job_status_reason text,
  voided boolean not null default false,
  total numeric(10, 2) not null default 0,
  true_profit numeric(10, 2),
  paycheck numeric(10, 2),
  tax_amount numeric(10, 2) not null default 0,
  tax_pct numeric(6, 4) not null default 0,
  deposit_amount numeric(10, 2),
  balance_amount numeric(10, 2),
  pay_type text check (pay_type in ('deposit', 'retainer')),
  deposit_pct numeric(5, 2),
  terms text,
  fulfill_type text check (fulfill_type in ('event', 'pickup', 'delivery', 'none')),
  event_date date,
  venue_address text,
  payment_collection_method text not null default 'self_collected'
    check (payment_collection_method in ('stripe', 'self_collected')),
  snapshot jsonb,
  biz_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger invoices_set_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create index invoices_business_id_idx on invoices (business_id);
create index invoices_client_id_idx on invoices (client_id);

-- ---------------------------------------------------------------------
-- invoice_history (append-only)
-- ---------------------------------------------------------------------
-- Architecture rule 4: no update/delete policy is defined further down,
-- so RLS itself blocks edits/deletes for every non-owner role — the
-- append-only guarantee holds even if application code has a bug.
create table invoice_history (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  label text not null,
  "when" timestamptz not null default now()
);

create index invoice_history_invoice_id_idx on invoice_history (invoice_id);

-- ---------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------
create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  inventory_item_id uuid references inventory_items (id),
  line_type text not null
    check (line_type in ('item', 'fee', 'travel', 'labor', 'discount', 'markup')),
  description text,
  qty numeric(10, 2),
  unit_price numeric(10, 2),
  unit_cost numeric(10, 2),
  created_at timestamptz not null default now()
);

create index invoice_line_items_invoice_id_idx on invoice_line_items (invoice_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Every table is scoped to the caller's own business via my_business_id().
-- Soft-delete tables (clients, inventory_items) and immutable-history
-- tables (invoices, invoice_history) deliberately have no delete policy —
-- "deleting" is an update (is_archived / voided), enforced here, not just
-- in the UI (architecture rules 3 and 4).

alter table businesses enable row level security;
alter table clients enable row level security;
alter table client_contracts enable row level security;
alter table inventory_items enable row level security;
alter table invoices enable row level security;
alter table invoice_history enable row level security;
alter table invoice_line_items enable row level security;

-- businesses: a user manages only their own row.
create policy businesses_select on businesses
  for select using (user_id = auth.uid());
create policy businesses_insert on businesses
  for insert with check (user_id = auth.uid());
create policy businesses_update on businesses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- clients: no delete policy — archive via update instead.
create policy clients_select on clients
  for select using (business_id = my_business_id());
create policy clients_insert on clients
  for insert with check (business_id = my_business_id());
create policy clients_update on clients
  for update using (business_id = my_business_id()) with check (business_id = my_business_id());

-- client_contracts: uploaded once, read many; no update/delete.
create policy client_contracts_select on client_contracts
  for select using (
    client_id in (select id from clients where business_id = my_business_id())
  );
create policy client_contracts_insert on client_contracts
  for insert with check (
    client_id in (select id from clients where business_id = my_business_id())
  );

-- inventory_items: no delete policy — archive via update instead.
create policy inventory_items_select on inventory_items
  for select using (business_id = my_business_id());
create policy inventory_items_insert on inventory_items
  for insert with check (business_id = my_business_id());
create policy inventory_items_update on inventory_items
  for update using (business_id = my_business_id()) with check (business_id = my_business_id());

-- invoices: no delete policy — void & reissue via update instead.
create policy invoices_select on invoices
  for select using (business_id = my_business_id());
create policy invoices_insert on invoices
  for insert with check (business_id = my_business_id());
create policy invoices_update on invoices
  for update using (business_id = my_business_id()) with check (business_id = my_business_id());

-- invoice_history: insert + select only — see comment on the table above.
create policy invoice_history_select on invoice_history
  for select using (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );
create policy invoice_history_insert on invoice_history
  for insert with check (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );

-- invoice_line_items: fully editable while an invoice is a draft; once
-- finalized, invoices.snapshot is the historically-accurate record
-- (architecture rule 2), so mutating line items afterward doesn't
-- threaten past-invoice accuracy.
create policy invoice_line_items_select on invoice_line_items
  for select using (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );
create policy invoice_line_items_insert on invoice_line_items
  for insert with check (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );
create policy invoice_line_items_update on invoice_line_items
  for update using (
    invoice_id in (select id from invoices where business_id = my_business_id())
  ) with check (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );
create policy invoice_line_items_delete on invoice_line_items
  for delete using (
    invoice_id in (select id from invoices where business_id = my_business_id())
  );

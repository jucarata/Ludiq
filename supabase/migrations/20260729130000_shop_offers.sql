-- Shop catalog (USDT prices editable in DB) + purchase ledger.

create table public.shop_offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  koins integer not null check (koins > 0),
  price_usdt numeric(12, 6) not null check (price_usdt > 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.koin_purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  offer_id uuid not null references public.shop_offers (id) on delete restrict,
  koins integer not null check (koins > 0),
  price_usdt numeric(12, 6) not null check (price_usdt > 0),
  tx_hash text not null unique,
  buyer_wallet text not null,
  created_at timestamptz not null default now()
);

create index koin_purchases_profile_id_idx on public.koin_purchases (profile_id);
create index koin_purchases_created_at_idx on public.koin_purchases (created_at desc);

insert into public.shop_offers (slug, koins, price_usdt, sort_order, active)
values
  ('koin_50', 50, 0.5, 1, true),
  ('koin_120', 120, 1, 2, true),
  ('koin_500', 500, 3, 3, true);

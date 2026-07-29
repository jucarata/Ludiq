-- Party mode tables and data migration (after enums exist).

update public.game_rooms
set mode = 'party'
where mode = 'competitive';

update public.game_rooms
set pot_status = 'open'
where pot_status = 'funded';

create table if not exists public.game_room_contributions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  player_id uuid references public.game_room_players (id) on delete set null,
  wallet_address text not null,
  pool_amount_usdt numeric(12, 6) not null check (pool_amount_usdt > 0),
  fee_amount_usdt numeric(12, 6) not null check (fee_amount_usdt >= 0),
  tx_hash text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists game_room_contributions_tx_hash_uidx
  on public.game_room_contributions (tx_hash);

create index if not exists game_room_contributions_room_id_idx
  on public.game_room_contributions (room_id);

drop index if exists game_room_players_entry_tx_hash_uidx;

alter table public.game_room_players
  add column if not exists contributed_pool_usdt numeric(12, 6) not null default 0;

alter table public.game_rooms
  add column if not exists open_tx_hash text;

create unique index if not exists game_rooms_open_tx_hash_uidx
  on public.game_rooms (open_tx_hash)
  where open_tx_hash is not null;

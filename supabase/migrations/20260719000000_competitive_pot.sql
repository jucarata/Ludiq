-- Competitive room escrow / pot tracking (Celo Sepolia).

create type public.pot_status as enum (
  'none',
  'funded',
  'locked',
  'settled',
  'refunded'
);

alter table public.game_rooms
  add column if not exists escrow_room_key text,
  add column if not exists pot_amount_usdt numeric(12, 6) not null default 0,
  add column if not exists pot_status public.pot_status not null default 'none',
  add column if not exists deposit_tx_hash text,
  add column if not exists refund_tx_hash text,
  add column if not exists payout_tx_hash text;

create unique index if not exists game_rooms_escrow_room_key_uidx
  on public.game_rooms (escrow_room_key)
  where escrow_room_key is not null;

create unique index if not exists game_rooms_deposit_tx_hash_uidx
  on public.game_rooms (deposit_tx_hash)
  where deposit_tx_hash is not null;

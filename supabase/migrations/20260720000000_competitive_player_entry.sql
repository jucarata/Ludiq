-- Competitive: track per-player entry payment + pot accrues 0.15 per payer.

alter table public.game_room_players
  add column if not exists entry_paid boolean not null default false,
  add column if not exists entry_tx_hash text;

create unique index if not exists game_room_players_entry_tx_hash_uidx
  on public.game_room_players (entry_tx_hash)
  where entry_tx_hash is not null;

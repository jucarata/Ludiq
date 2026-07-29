-- Unused move log (online sync uses game_states) and legacy competitive deposit column.
drop table if exists public.game_moves cascade;

drop index if exists public.game_rooms_deposit_tx_hash_uidx;
alter table public.game_rooms drop column if exists deposit_tx_hash;

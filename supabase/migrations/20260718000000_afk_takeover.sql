-- Persist auto mode per seat and AFK bot takeover on the shared game state.
-- When the decision timer expires with auto on, the server sets afk_takeover
-- instead of skipping the turn so the bot can finish moving with no extra time.

alter table public.game_room_players
  add column if not exists auto_enabled boolean not null default false;

alter table public.game_states
  add column if not exists afk_takeover boolean not null default false;

comment on column public.game_room_players.auto_enabled is
  'Player opted into AFK bot takeover when their decision timer expires.';

comment on column public.game_states.afk_takeover is
  'Decision timer expired with auto on; bot is finishing this turn. Timer stays at 0.';

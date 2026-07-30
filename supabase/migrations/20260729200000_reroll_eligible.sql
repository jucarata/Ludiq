-- Marks whether the current decision window allows a paid dice reroll.
-- True only when the player already had pieces on the route before this throw
-- (not the turn they leave home, and not a doubles throw that exits more).

alter table public.game_states
  add column if not exists reroll_eligible boolean not null default false;

-- Action identity for live/DB dedupe + last_action for animation gating.

alter table public.game_states
  add column if not exists last_action text
    check (
      last_action is null
      or last_action in ('roll', 'move', 'advance', 'timeout')
    ),
  add column if not exists action_id text;

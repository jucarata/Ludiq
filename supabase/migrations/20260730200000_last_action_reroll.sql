-- Allow paid dice reroll actions on game_states.last_action.
-- Previous check only permitted roll/move/advance/timeout, so reroll writes failed.

alter table public.game_states
  drop constraint if exists game_states_last_action_check;

alter table public.game_states
  add constraint game_states_last_action_check
  check (
    last_action is null
    or last_action in ('roll', 'move', 'advance', 'timeout', 'afk', 'reroll')
  );

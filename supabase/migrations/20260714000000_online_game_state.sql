-- Extra columns for online multiplayer game sync + realtime.

alter table public.game_states
  add column if not exists active_players jsonb not null default '[]'::jsonb,
  add column if not exists exit_roll_attempts integer not null default 0
    check (exit_roll_attempts >= 0 and exit_roll_attempts <= 3),
  add column if not exists last_roll jsonb,
  add column if not exists winner public.player_color,
  add column if not exists turn_started_at timestamptz not null default now();

-- Public SELECT so Privy clients (anon key) can receive Realtime events.
drop policy if exists "Miembros ven estado de su sala" on public.game_states;

create policy "Estados de juego visibles para lobby"
on public.game_states
for select
to anon, authenticated
using (true);

grant select on public.game_states to anon;

alter table public.game_states replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.game_states;
exception
  when duplicate_object then null;
end $$;

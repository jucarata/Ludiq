-- Enable Realtime for lobby sync (join / color / close).
-- Public SELECT is required so the browser anon key can receive events
-- (app auth is Privy, not Supabase Auth).

drop policy if exists "Salas visibles para miembros" on public.game_rooms;
drop policy if exists "Miembros ven jugadores de su sala" on public.game_room_players;

create policy "Salas visibles para lobby"
on public.game_rooms
for select
to anon, authenticated
using (true);

create policy "Jugadores visibles para lobby"
on public.game_room_players
for select
to anon, authenticated
using (true);

grant select on public.game_rooms to anon;
grant select on public.game_room_players to anon;

alter table public.game_rooms replica identity full;
alter table public.game_room_players replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.game_rooms;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.game_room_players;
exception
  when duplicate_object then null;
end $$;

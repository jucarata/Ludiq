-- Ludiq: esquema inicial para perfiles, salas y estado de partida.

create extension if not exists pgcrypto;

create type public.room_status as enum ('waiting', 'playing', 'finished');
create type public.player_color as enum ('red', 'green', 'yellow', 'blue');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  games_played integer not null default 0 check (games_played >= 0),
  games_won integer not null default 0 check (games_won >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid references public.profiles (id) on delete set null,
  status public.room_status not null default 'waiting',
  max_players integer not null default 4 check (max_players between 2 and 4),
  winner public.player_color,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table public.game_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  color public.player_color not null,
  is_ready boolean not null default false,
  is_bot boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, color)
);

create table public.game_states (
  room_id uuid primary key references public.game_rooms (id) on delete cascade,
  current_turn public.player_color,
  turn_phase text,
  pieces jsonb not null default '[]'::jsonb,
  remaining_dice jsonb,
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);

create table public.game_moves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  move_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index game_rooms_code_idx on public.game_rooms (code);
create index game_rooms_status_idx on public.game_rooms (status);
create index game_room_players_room_id_idx on public.game_room_players (room_id);
create index game_room_players_user_id_idx on public.game_room_players (user_id);
create index game_moves_room_id_created_at_idx on public.game_moves (room_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      'Jugador'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'player_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    exit when not exists (
      select 1
      from public.game_rooms
      where code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.profiles enable row level security;
alter table public.game_rooms enable row level security;
alter table public.game_room_players enable row level security;
alter table public.game_states enable row level security;
alter table public.game_moves enable row level security;

create policy "Perfiles visibles para usuarios autenticados"
on public.profiles
for select
to authenticated
using (true);

create policy "Cada usuario edita su perfil"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Salas visibles para miembros"
on public.game_rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.game_room_players
    where game_room_players.room_id = game_rooms.id
      and game_room_players.user_id = auth.uid()
  )
  or host_id = auth.uid()
);

create policy "Usuarios autenticados crean salas"
on public.game_rooms
for insert
to authenticated
with check (host_id = auth.uid());

create policy "Anfitrion actualiza su sala en espera"
on public.game_rooms
for update
to authenticated
using (host_id = auth.uid() and status = 'waiting')
with check (host_id = auth.uid());

create policy "Miembros ven jugadores de su sala"
on public.game_room_players
for select
to authenticated
using (
  exists (
    select 1
    from public.game_room_players membership
    where membership.room_id = game_room_players.room_id
      and membership.user_id = auth.uid()
  )
);

create policy "Usuario se une a una sala"
on public.game_room_players
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Usuario actualiza su fila en la sala"
on public.game_room_players
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Miembros ven estado de su sala"
on public.game_states
for select
to authenticated
using (
  exists (
    select 1
    from public.game_room_players
    where game_room_players.room_id = game_states.room_id
      and game_room_players.user_id = auth.uid()
  )
);

create policy "Miembros ven movimientos de su sala"
on public.game_moves
for select
to authenticated
using (
  exists (
    select 1
    from public.game_room_players
    where game_room_players.room_id = game_moves.room_id
      and game_room_players.user_id = auth.uid()
  )
);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.game_rooms to authenticated;
grant select, insert, update on public.game_room_players to authenticated;
grant select on public.game_states to authenticated;
grant select on public.game_moves to authenticated;
grant execute on function public.generate_room_code() to authenticated;

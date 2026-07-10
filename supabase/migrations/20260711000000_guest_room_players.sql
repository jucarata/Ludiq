-- Allow guest players in rooms (no Privy profile required).

alter table public.game_room_players
  alter column user_id drop not null;

alter table public.game_room_players
  add column if not exists guest_name text,
  add column if not exists guest_session_id text;

alter table public.game_room_players
  drop constraint if exists game_room_players_identity_check;

alter table public.game_room_players
  add constraint game_room_players_identity_check
  check (
    (
      user_id is not null
      and guest_name is null
      and guest_session_id is null
    )
    or
    (
      user_id is null
      and guest_name is not null
      and guest_session_id is not null
    )
  );

create unique index if not exists game_room_players_room_guest_session_uidx
  on public.game_room_players (room_id, guest_session_id)
  where guest_session_id is not null;

-- Align DB helper with 4-character alphanumeric codes used by the app.
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate text;
  i integer;
  idx integer;
begin
  loop
    candidate := '';
    for i in 1..4 loop
      idx := 1 + floor(random() * length(alphabet))::integer;
      candidate := candidate || substr(alphabet, idx, 1);
    end loop;

    exit when not exists (
      select 1
      from public.game_rooms
      where code = candidate
    );
  end loop;

  return candidate;
end;
$$;

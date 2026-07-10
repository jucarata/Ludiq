-- Allow reusing room codes after a party finishes.
-- Only one active room (waiting/playing) may use a given code at a time.

alter table public.game_rooms
  drop constraint if exists game_rooms_code_key;

drop index if exists game_rooms_code_key;
drop index if exists game_rooms_code_idx;

create unique index if not exists game_rooms_active_code_uidx
  on public.game_rooms (code)
  where status in ('waiting', 'playing');

create index if not exists game_rooms_code_idx
  on public.game_rooms (code);

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
        and status in ('waiting', 'playing')
    );
  end loop;

  return candidate;
end;
$$;

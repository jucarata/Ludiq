-- Free vs competitive rooms share the same lobby/game flow.
-- Active uniqueness is scoped by (code, mode) so the same code can exist
-- in both modes at once without colliding.

create type public.room_mode as enum ('free', 'competitive');

alter table public.game_rooms
  add column if not exists mode public.room_mode not null default 'free';

drop index if exists game_rooms_active_code_uidx;

create unique index if not exists game_rooms_active_code_mode_uidx
  on public.game_rooms (code, mode)
  where status in ('waiting', 'playing');

create index if not exists game_rooms_mode_idx
  on public.game_rooms (mode);

create or replace function public.generate_room_code(
  p_mode public.room_mode default 'free'
)
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
        and mode = p_mode
        and status in ('waiting', 'playing')
    );
  end loop;

  return candidate;
end;
$$;

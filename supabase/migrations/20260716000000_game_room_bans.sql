-- Per-room-instance bans: kicked players cannot rejoin the same room row.
-- Codes are reusable across finished rooms, so bans are keyed by room_id (not code).

create table if not exists public.game_room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_session_id text,
  banned_at timestamptz not null default now(),
  banned_by uuid references public.profiles (id) on delete set null,
  constraint game_room_bans_identity_check check (
    (
      user_id is not null
      and guest_session_id is null
    )
    or
    (
      user_id is null
      and guest_session_id is not null
    )
  )
);

create unique index if not exists game_room_bans_room_user_uidx
  on public.game_room_bans (room_id, user_id)
  where user_id is not null;

create unique index if not exists game_room_bans_room_guest_uidx
  on public.game_room_bans (room_id, guest_session_id)
  where guest_session_id is not null;

create index if not exists game_room_bans_room_id_idx
  on public.game_room_bans (room_id);

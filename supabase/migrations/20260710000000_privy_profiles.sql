-- Adapt profiles for Privy auth: wallet + privy_user_id instead of Supabase Auth.

-- Drop policies / grants that depend on auth.uid() for profiles
drop policy if exists "Perfiles visibles para usuarios autenticados" on public.profiles;
drop policy if exists "Cada usuario edita su perfil" on public.profiles;

-- Drop FK to auth.users and the auto-create trigger (Privy owns identity now)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  alter column id set default gen_random_uuid();

alter table public.profiles
  add column if not exists privy_user_id text,
  add column if not exists wallet_address text,
  add column if not exists email text;

-- Remove orphan rows created under Supabase Auth (no Privy identity)
delete from public.profiles
where privy_user_id is null
   or wallet_address is null;

create unique index if not exists profiles_privy_user_id_uidx
  on public.profiles (privy_user_id);

create unique index if not exists profiles_wallet_address_uidx
  on public.profiles (lower(wallet_address));

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  alter column privy_user_id set not null,
  alter column wallet_address set not null;

-- Public read of profiles (usernames / leaderboard later); writes go through service role API
create policy "Perfiles visibles publicamente"
on public.profiles
for select
to anon, authenticated
using (true);

grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;

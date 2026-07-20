-- Competitive trophies: winner earns 1 trophy per participant in the match.

alter table public.profiles
  add column if not exists trophies integer not null default 0
    check (trophies >= 0);

alter table public.game_rooms
  add column if not exists trophies_awarded integer
    check (trophies_awarded is null or trophies_awarded >= 0);

-- Atomic increment used when a competitive match finishes.
create or replace function public.award_profile_trophies(
  p_profile_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid trophy amount';
  end if;

  update public.profiles
  set trophies = trophies + p_amount
  where id = p_profile_id
  returning trophies into new_total;

  if new_total is null then
    raise exception 'profile not found';
  end if;

  return new_total;
end;
$$;

revoke all on function public.award_profile_trophies(uuid, integer) from public;
grant execute on function public.award_profile_trophies(uuid, integer) to service_role;

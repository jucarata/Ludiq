-- Soft currency: each profile holds a non-negative Koin balance.
-- Purchases with USDT come later; this only stores the balance.

alter table public.profiles
  add column if not exists koins integer not null default 0
    check (koins >= 0);

-- Atomic credit/debit used by future purchase / spend flows.
create or replace function public.adjust_profile_koins(
  p_profile_id uuid,
  p_delta integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'invalid koin delta';
  end if;

  update public.profiles
  set koins = koins + p_delta
  where id = p_profile_id
    and koins + p_delta >= 0
  returning koins into new_total;

  if new_total is null then
    raise exception 'profile not found or insufficient koins';
  end if;

  return new_total;
end;
$$;

revoke all on function public.adjust_profile_koins(uuid, integer) from public;
grant execute on function public.adjust_profile_koins(uuid, integer) to service_role;

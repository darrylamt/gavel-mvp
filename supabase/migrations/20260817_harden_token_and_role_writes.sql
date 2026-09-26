-- Applied to the live project on 2026-08-17.
-- Copy this into the web repo's supabase/migrations/ as well: increment_tokens
-- was created through the dashboard and had never been tracked in either repo.
--
-- Closes two privilege-escalation paths on public.profiles:
--   1. increment_tokens was SECURITY DEFINER with no caller check, so any
--      authenticated user could mint tokens through PostgREST.
--   2. profiles_update_own_or_admin grants UPDATE on every column of the
--      user's own row. is_admin() reads profiles.role, so a user could promote
--      themselves to admin; they could also set token_balance directly, which
--      meant locking the RPC alone would have achieved nothing.

create or replace function public.jwt_is_service_role()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::json ->> 'role', ''),
    'service_role'
  ) = 'service_role';
$$;

comment on function public.jwt_is_service_role() is
  'True for service-role API calls and for direct database connections. False for anon/authenticated JWTs.';

revoke execute on function public.increment_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_tokens(uuid, integer) to service_role;

create or replace function public.increment_tokens(uid uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.jwt_is_service_role() then
    raise exception 'increment_tokens: forbidden' using errcode = '42501';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'increment_tokens: amount must be positive' using errcode = '22023';
  end if;

  update profiles
  set token_balance = coalesce(token_balance, 0) + amount
  where id = uid;
end;
$$;

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.jwt_is_service_role() then
    return new;
  end if;

  if new.token_balance is distinct from old.token_balance then
    raise exception 'profiles.token_balance is not directly writable' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    raise exception 'profiles.role is not directly writable' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_columns on public.profiles;

create trigger protect_privileged_profile_columns
before update on public.profiles
for each row
execute function public.protect_privileged_profile_columns();

-- Rollback, if the web bid path turns out to spend tokens under a user JWT:
--   drop trigger if exists protect_privileged_profile_columns on public.profiles;

-- Trigger/helper functions never need to be callable over the API.
revoke execute on function public.protect_privileged_profile_columns() from public, anon, authenticated;
revoke execute on function public.jwt_is_service_role() from public, anon, authenticated;

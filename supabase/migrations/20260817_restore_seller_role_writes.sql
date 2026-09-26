-- Repairs a production break introduced by 20260817_harden_token_and_role_writes.sql.
--
-- admin_review_seller_application is SECURITY DEFINER, but the admin UI calls it
-- with the reviewing admin's own JWT (an anon client + their access token) --
-- deliberately, because the function needs auth.uid() both for its own admin
-- check and to stamp seller_applications.reviewed_by.
--
-- SECURITY DEFINER swaps current_user; it does NOT reset request.jwt.claims.
-- So inside that function jwt_is_service_role() sees 'authenticated' and returns
-- false, and its closing "grant seller role on approval" UPDATE tripped the new
-- trigger:
--
--     profiles.role is not directly writable
--
-- The whole review runs in one transaction, so the seller_applications UPDATE
-- rolled back with it and the application silently stayed pending. Every seller
-- approval has been failing since the hardening migration was applied.
--
-- Fix: keep the trigger strict by default, and let a trusted SECURITY DEFINER
-- function opt in explicitly around the one statement that needs it. The third
-- argument to set_config() makes the setting transaction-local, so it cannot
-- leak to another request sharing a pooled connection, and PostgREST offers no
-- way for a client to set app.* GUCs of its own.
--
-- The alternative -- letting the trigger allow role changes whenever the caller
-- is already an admin -- was rejected: it would let an admin session rewrite
-- roles by direct table write, bypassing the audited function and the
-- reviewed_by trail that 20260812 was written to preserve.

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Service role, direct DB connections, and trusted SECURITY DEFINER
  -- functions that have explicitly opted in for this transaction.
  if public.jwt_is_service_role()
     or coalesce(current_setting('app.privileged_profile_write', true), 'off') = 'on' then
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

revoke execute on function public.protect_privileged_profile_columns() from public, anon, authenticated;

-- Recreated from 20260812_seller_application_reviewed_by.sql, unchanged apart
-- from the opt-in around the role grant (and pg_temp added to search_path).
create or replace function public.admin_review_seller_application(
  p_application_id uuid,
  p_action         text,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_caller_role text;
begin
  -- Verify the calling user is an admin.
  -- This check reads profiles.role, which is only trustworthy now that
  -- 20260817_harden_token_and_role_writes.sql stopped users writing it.
  select role into v_caller_role
  from public.profiles
  where id = auth.uid();

  if v_caller_role <> 'admin' then
    raise exception 'Only admins can review seller applications';
  end if;

  -- Look up the applicant
  select user_id into v_user_id
  from public.seller_applications
  where id = p_application_id;

  if v_user_id is null then
    raise exception 'Application not found';
  end if;

  -- Validate action
  if p_action not in ('approved', 'rejected') then
    raise exception 'Invalid action: must be approved or rejected';
  end if;

  -- Update the application record
  update public.seller_applications
  set
    status           = p_action,
    reviewed_at      = now(),
    reviewed_by      = auth.uid(),
    rejection_reason = case when p_action = 'rejected' then p_rejection_reason else null end
  where id = p_application_id;

  -- Grant seller role when approved
  if p_action = 'approved' then
    perform set_config('app.privileged_profile_write', 'on', true);
    update public.profiles
    set role = 'seller'
    where id = v_user_id;
    perform set_config('app.privileged_profile_write', 'off', true);
  end if;
end;
$$;

-- Unchanged from 20260812: granted to authenticated on purpose, because the
-- admin check is enforced inside the function and auth.uid() must survive.
grant execute on function public.admin_review_seller_application(uuid, text, text)
  to authenticated;

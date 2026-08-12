-- `seller_applications.reviewed_by` has always existed (FK -> profiles) and the
-- admin UI reads it, but admin_review_seller_application never populated it, so
-- every application reviewed through that path lost the "which admin approved
-- this seller" audit trail. For an identity-verification flow that matters.
--
-- This recreates the function unchanged apart from setting reviewed_by to the
-- calling admin. Historical rows reviewed before this migration keep a null
-- reviewed_by — the reviewer is not recoverable after the fact.
create or replace function public.admin_review_seller_application(
  p_application_id uuid,
  p_action         text,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_caller_role text;
begin
  -- Verify the calling user is an admin
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
    update public.profiles
    set role = 'seller'
    where id = v_user_id;
  end if;
end;
$$;

grant execute on function public.admin_review_seller_application(uuid, text, text)
  to authenticated;

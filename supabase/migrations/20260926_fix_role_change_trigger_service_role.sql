-- Let trusted server code change roles; capture a dashboard-only trigger.
--
-- trg_prevent_non_admin_role_change existed only in the dashboard. It allowed a
-- role change only when is_admin(auth.uid()). Service-role calls carry no user,
-- so auth.uid() is null and every server-side role change was refused with
-- "Only admin can change role" — including /api/admin/sellers/[userId]/ban,
-- which demotes a banned seller to 'user' with the service key. Verified
-- 2026-09-26 by simulating that call; it failed.
--
-- Non-service callers are unchanged: they still need an admin JWT here, and
-- protect_privileged_profile_columns additionally requires the approval
-- function's transaction-local opt-in.

create or replace function public.prevent_non_admin_role_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and not public.jwt_is_service_role()
     and not public.is_admin(auth.uid()) then
    raise exception 'Only admin can change role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_non_admin_role_change on public.profiles;
create trigger trg_prevent_non_admin_role_change
before update on public.profiles
for each row
execute function public.prevent_non_admin_role_change();

-- Create the seller-documents storage bucket for Ghana Card uploads
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-documents',
  'seller-documents',
  false,
  10485760, -- 10 MB server-side hard cap
  array[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'application/pdf'
  ]
)
on conflict (id) do nothing;

-- Sellers can upload files into their own sub-folder
create policy "Sellers can upload their own documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'seller-documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Admins can read all seller documents; sellers can read their own
create policy "Admins and owners can read seller documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'seller-documents'
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
);

-- Admin-only function to approve or reject a seller application.
-- On approval it sets profiles.role = 'seller'.
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

-- Allow authenticated users (admin check is enforced inside the function)
grant execute on function public.admin_review_seller_application(uuid, text, text)
  to authenticated;

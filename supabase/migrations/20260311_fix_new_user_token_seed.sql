-- Ensure new profiles start with 3 tokens at the database layer.
alter table public.profiles
  alter column token_balance set default 3;

-- Safety net: if any legacy trigger inserts token_balance = 100 on profile creation,
-- normalize it to 3 before the row is written.
create or replace function public.normalize_profile_starter_tokens()
returns trigger
language plpgsql
as $$
begin
  if new.token_balance = 100 then
    new.token_balance := 3;
  elsif new.token_balance is null then
    new.token_balance := 3;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_normalize_starter_tokens on public.profiles;
create trigger profiles_normalize_starter_tokens
before insert on public.profiles
for each row
execute function public.normalize_profile_starter_tokens();

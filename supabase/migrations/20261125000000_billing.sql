-- Billing: first document free, then a 30-day Pro pass (paid via Paystack).
-- Everything that grants access lives here so it can't be bypassed from the browser.

-- One row per user. Users can read their own; only the server can change it.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  pro_until timestamptz,
  docs_created integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = user_id);

-- Payment attempts. Users can read their own history.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  reference text not null unique,
  provider text not null default 'paystack',
  plan text not null,
  amount integer not null,          -- smallest currency unit (kobo / cents)
  currency text not null,
  status text not null default 'pending', -- pending | success | failed
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments" on public.payments
  for select using (auth.uid() = user_id);

-- Backfill existing users, counting the documents they already made.
insert into public.profiles (user_id, docs_created)
select u.id, (select count(*) from public.drafts d where d.user_id = u.id)
from auth.users u
on conflict (user_id) do nothing;

-- The owner's account is the admin: never pays, no limits.
update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.user_id and lower(u.email) = 'ellaukata@gmail.com';

-- Free allowance: how many documents a user can create without Pro.
create or replace function public.free_docs_allowed()
returns integer language sql immutable as $$ select 1 $$;

-- Every new draft counts towards the allowance (deleting one doesn't give it back).
create or replace function public.enforce_document_allowance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prof profiles;
begin
  insert into profiles (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select * into prof from profiles where user_id = new.user_id for update;

  if not prof.is_admin
     and (prof.pro_until is null or prof.pro_until < now())
     and prof.docs_created >= free_docs_allowed() then
    raise exception 'PAYMENT_REQUIRED' using errcode = 'P0001',
      hint = 'Your free document is used up. Get a Pro pass to create more.';
  end if;

  update profiles set docs_created = docs_created + 1 where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists enforce_document_allowance on public.drafts;
create trigger enforce_document_allowance
  before insert on public.drafts
  for each row execute function public.enforce_document_allowance();

-- What the signed-in user is allowed to do (used by the app to show plans).
create or replace function public.my_entitlement()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  prof profiles;
  is_pro boolean;
begin
  if auth.uid() is null then return null; end if;
  select * into prof from profiles where user_id = auth.uid();
  is_pro := coalesce(prof.pro_until > now(), false);
  return json_build_object(
    'is_admin', coalesce(prof.is_admin, false),
    'is_pro', is_pro,
    'pro_until', prof.pro_until,
    'docs_created', coalesce(prof.docs_created, 0),
    'free_docs', free_docs_allowed(),
    'can_create', coalesce(prof.is_admin, false) or is_pro or coalesce(prof.docs_created, 0) < free_docs_allowed()
  );
end;
$$;

revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

-- Marks a payment as paid and extends Pro by 30 days. Idempotent: safe to
-- call from both the webhook and the "verify" step. Only the server calls it.
create or replace function public.fulfill_payment(p_reference text, p_amount integer, p_currency text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  pay payments;
  new_until timestamptz;
begin
  select * into pay from payments where reference = p_reference for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'unknown_reference');
  end if;
  if pay.status = 'success' then
    select pro_until into new_until from profiles where user_id = pay.user_id;
    return json_build_object('ok', true, 'already', true, 'pro_until', new_until);
  end if;
  if pay.amount <> p_amount or upper(pay.currency) <> upper(p_currency) then
    update payments set status = 'failed' where id = pay.id;
    return json_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  update payments set status = 'success', paid_at = now() where id = pay.id;
  insert into profiles (user_id) values (pay.user_id) on conflict (user_id) do nothing;
  update profiles
    set pro_until = greatest(coalesce(pro_until, now()), now()) + interval '30 days'
    where user_id = pay.user_id
    returning pro_until into new_until;

  return json_build_object('ok', true, 'pro_until', new_until);
end;
$$;

revoke all on function public.fulfill_payment(text, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_payment(text, integer, text) to service_role;

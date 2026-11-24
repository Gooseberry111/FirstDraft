-- Billing on/off switch (off by default). While off, everyone can create
-- unlimited documents; document counts are still tracked so the free
-- allowance applies fairly once billing is turned on.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings" on public.app_settings
  for select using (true);

drop policy if exists "Admins can change app settings" on public.app_settings;
create policy "Admins can change app settings" on public.app_settings
  for update
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin));

insert into public.app_settings (key, value) values ('billing_enabled', 'false')
on conflict (key) do nothing;

create or replace function public.billing_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value::text::boolean from app_settings where key = 'billing_enabled'), false);
$$;

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

  if billing_enabled()
     and not prof.is_admin
     and (prof.pro_until is null or prof.pro_until < now())
     and prof.docs_created >= free_docs_allowed() then
    raise exception 'PAYMENT_REQUIRED' using errcode = 'P0001',
      hint = 'Your free document is used up. Get a Pro pass to create more.';
  end if;

  update profiles set docs_created = docs_created + 1 where user_id = new.user_id;
  return new;
end;
$$;

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
  billing boolean := billing_enabled();
begin
  if auth.uid() is null then return null; end if;
  select * into prof from profiles where user_id = auth.uid();
  is_pro := coalesce(prof.pro_until > now(), false);
  return json_build_object(
    'billing_enabled', billing,
    'is_admin', coalesce(prof.is_admin, false),
    'is_pro', is_pro,
    'pro_until', prof.pro_until,
    'docs_created', coalesce(prof.docs_created, 0),
    'free_docs', free_docs_allowed(),
    'can_create', not billing or coalesce(prof.is_admin, false) or is_pro
                  or coalesce(prof.docs_created, 0) < free_docs_allowed()
  );
end;
$$;

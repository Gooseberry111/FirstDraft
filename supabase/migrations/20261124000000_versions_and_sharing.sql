-- Version history: snapshots of a draft's document, newest 30 kept per draft.
create table if not exists public.draft_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  document_data jsonb not null,
  template text,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists draft_versions_draft_created_idx
  on public.draft_versions (draft_id, created_at desc);

alter table public.draft_versions enable row level security;

drop policy if exists "Users manage versions of own drafts" on public.draft_versions;
create policy "Users manage versions of own drafts" on public.draft_versions
  for all
  using (exists (select 1 from public.drafts d where d.id = draft_id and d.user_id = auth.uid()))
  with check (exists (select 1 from public.drafts d where d.id = draft_id and d.user_id = auth.uid()));

create or replace function public.prune_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from draft_versions
  where draft_id = new.draft_id
    and id not in (
      select id from draft_versions
      where draft_id = new.draft_id
      order by created_at desc
      limit 30
    );
  return null;
end;
$$;

drop trigger if exists prune_draft_versions on public.draft_versions;
create trigger prune_draft_versions
  after insert on public.draft_versions
  for each row execute function public.prune_draft_versions();

-- Sharing: a draft is public (read-only) only while it has a share_id.
-- The id is a random UUID, so links can't be guessed; set it to null to stop sharing.
alter table public.drafts add column if not exists share_id uuid unique;

create or replace function public.get_shared_draft(p_share_id uuid)
returns table (title text, document_data jsonb, template text, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select d.title, d.document_data, d.template, d.updated_at
  from drafts d
  where p_share_id is not null and d.share_id = p_share_id;
$$;

revoke all on function public.get_shared_draft(uuid) from public;
grant execute on function public.get_shared_draft(uuid) to anon, authenticated;

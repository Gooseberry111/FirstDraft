-- Per-user daily AI usage, so a few heavy users can't exhaust the shared
-- Gemini quota. Only the firstdraft-ai Edge Function (service role) can
-- consume requests; users can read their own usage.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "Users can read own AI usage" on public.ai_usage;
create policy "Users can read own AI usage" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Atomically records one AI request if the user (and, optionally, the whole
-- app) is under today's limit. A limit of 0 means "no limit".
create or replace function public.consume_ai_request(
  p_user uuid,
  p_user_limit integer,
  p_global_limit integer default 0
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
  total integer;
begin
  if p_global_limit > 0 then
    select coalesce(sum(requests), 0) into total
    from ai_usage
    where day = current_date;

    if total >= p_global_limit then
      return json_build_object('allowed', false, 'reason', 'global');
    end if;
  end if;

  insert into ai_usage as u (user_id, day, requests)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update
    set requests = u.requests + 1
    where p_user_limit <= 0 or u.requests < p_user_limit
  returning u.requests into used;

  if used is null then
    return json_build_object('allowed', false, 'reason', 'user', 'limit', p_user_limit);
  end if;

  return json_build_object('allowed', true, 'used', used, 'limit', p_user_limit);
end;
$$;

revoke all on function public.consume_ai_request(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer, integer) to service_role;

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'there',
  focus_area text not null default 'Speaking more naturally',
  daily_goal text not null default '1 short prompt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text,
  prompt text not null,
  category text not null,
  completed_at timestamptz not null,
  speaking_duration_seconds integer not null,
  actual_duration_seconds integer,
  feedback jsonb not null,
  next_action text not null,
  label text not null,
  transcript text,
  transcript_status text not null default 'not_started',
  speaking_metrics jsonb,
  is_daily_challenge boolean not null default false,
  daily_challenge_date date,
  source text not null default 'practice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transcription_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);

create table if not exists public.apple_auth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'practice_attempts_user_id_fkey'
      and conrelid = 'public.practice_attempts'::regclass
  ) then
    alter table public.practice_attempts
      add constraint practice_attempts_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

create index if not exists practice_attempts_user_completed_idx
  on public.practice_attempts(user_id, completed_at desc);
create index if not exists transcription_requests_user_requested_idx
  on public.transcription_requests(user_id, requested_at desc);

alter table public.profiles enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.transcription_requests enable row level security;
alter table public.apple_auth_tokens enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Users can delete their profile" on public.profiles;
create policy "Users can delete their profile"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can read their attempts" on public.practice_attempts;
create policy "Users can read their attempts"
  on public.practice_attempts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their attempts" on public.practice_attempts;
create policy "Users can insert their attempts"
  on public.practice_attempts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their attempts" on public.practice_attempts;
create policy "Users can update their attempts"
  on public.practice_attempts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their attempts" on public.practice_attempts;
create policy "Users can delete their attempts"
  on public.practice_attempts for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.transcription_requests from anon, authenticated;
revoke all on public.apple_auth_tokens from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.practice_attempts to authenticated;

create or replace function public.reserve_transcription_request(
  minute_limit integer default 5,
  daily_limit integer default 20
)
returns table (
  allowed boolean,
  limit_reason text,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_time timestamptz := clock_timestamp();
  minute_count integer;
  daily_count integer;
  oldest_minute_request timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if minute_limit < 1 or daily_limit < 1 then
    raise exception 'Quota limits must be positive' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  delete from public.transcription_requests
  where user_id = current_user_id
    and requested_at < current_time - interval '31 days';

  select count(*), min(requested_at)
    into minute_count, oldest_minute_request
  from public.transcription_requests
  where user_id = current_user_id
    and requested_at > current_time - interval '1 minute';

  if minute_count >= minute_limit then
    return query select
      false,
      'minute'::text,
      greatest(
        1,
        ceil(extract(epoch from ((oldest_minute_request + interval '1 minute') - current_time)))::integer
      );
    return;
  end if;

  select count(*)
    into daily_count
  from public.transcription_requests
  where user_id = current_user_id
    and requested_at >= date_trunc('day', current_time at time zone 'UTC') at time zone 'UTC';

  if daily_count >= daily_limit then
    return query select
      false,
      'daily'::text,
      greatest(
        1,
        ceil(extract(epoch from ((date_trunc('day', current_time at time zone 'UTC') + interval '1 day') at time zone 'UTC' - current_time)))::integer
      );
    return;
  end if;

  insert into public.transcription_requests(user_id, requested_at)
  values (current_user_id, current_time);

  return query select true, null::text, 0;
end;
$$;

revoke all on function public.reserve_transcription_request(integer, integer) from public;
grant execute on function public.reserve_transcription_request(integer, integer) to authenticated;

commit;

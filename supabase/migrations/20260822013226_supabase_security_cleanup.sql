begin;

do $$
declare
  obsolete_policy record;
begin
  for obsolete_policy in
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
      and policyname ilike '%own%'
  loop
    execute pg_catalog.format(
      'drop policy %I on %I.%I',
      obsolete_policy.policyname,
      obsolete_policy.schemaname,
      obsolete_policy.tablename
    );
  end loop;
end;
$$;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their profile" on public.profiles;
create policy "Users can delete their profile"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can read their attempts" on public.practice_attempts;
create policy "Users can read their attempts"
  on public.practice_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their attempts" on public.practice_attempts;
create policy "Users can insert their attempts"
  on public.practice_attempts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their attempts" on public.practice_attempts;
create policy "Users can update their attempts"
  on public.practice_attempts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their attempts" on public.practice_attempts;
create policy "Users can delete their attempts"
  on public.practice_attempts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

alter table public.apple_auth_tokens enable row level security;
alter table public.transcription_requests enable row level security;
revoke all on table public.apple_auth_tokens from anon, authenticated;
revoke all on table public.transcription_requests from anon, authenticated;

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
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_timestamp timestamptz := pg_catalog.clock_timestamp();
  utc_day_start timestamptz :=
    pg_catalog.date_trunc('day', request_timestamp at time zone 'UTC')
      at time zone 'UTC';
  minute_count integer;
  daily_count integer;
  oldest_minute_request timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if minute_limit is distinct from 5 or daily_limit is distinct from 20 then
    raise exception 'Quota limits are fixed at 5 per minute and 20 per day'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  delete from public.transcription_requests as transcription_request
  where transcription_request.user_id = current_user_id
    and transcription_request.requested_at
      < request_timestamp - interval '31 days';

  select count(*), min(transcription_request.requested_at)
    into minute_count, oldest_minute_request
  from public.transcription_requests as transcription_request
  where transcription_request.user_id = current_user_id
    and transcription_request.requested_at
      > request_timestamp - interval '1 minute';

  if minute_count >= 5 then
    return query select
      false,
      'minute'::text,
      greatest(
        1,
        pg_catalog.ceil(
          extract(
            epoch from (
              (oldest_minute_request + interval '1 minute') - request_timestamp
            )
          )
        )::integer
      );
    return;
  end if;

  select count(*)
    into daily_count
  from public.transcription_requests as transcription_request
  where transcription_request.user_id = current_user_id
    and transcription_request.requested_at >= utc_day_start;

  if daily_count >= 20 then
    return query select
      false,
      'daily'::text,
      greatest(
        1,
        pg_catalog.ceil(
          extract(
            epoch from ((utc_day_start + interval '1 day') - request_timestamp)
          )
        )::integer
      );
    return;
  end if;

  insert into public.transcription_requests(user_id, requested_at)
  values (current_user_id, request_timestamp);

  return query select true, null::text, 0;
end;
$$;

revoke all on function public.reserve_transcription_request(integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_transcription_request(integer, integer)
  to authenticated;

commit;

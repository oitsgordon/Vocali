begin;

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
  request_timestamp timestamptz := clock_timestamp();
  utc_day_start timestamptz :=
    date_trunc('day', request_timestamp at time zone 'UTC') at time zone 'UTC';
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
    and requested_at < request_timestamp - interval '31 days';

  select count(*), min(requested_at)
    into minute_count, oldest_minute_request
  from public.transcription_requests
  where user_id = current_user_id
    and requested_at > request_timestamp - interval '1 minute';

  if minute_count >= minute_limit then
    return query select
      false,
      'minute'::text,
      greatest(
        1,
        ceil(
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
  from public.transcription_requests
  where user_id = current_user_id
    and requested_at >= utc_day_start;

  if daily_count >= daily_limit then
    return query select
      false,
      'daily'::text,
      greatest(
        1,
        ceil(
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
  from public, anon;
grant execute on function public.reserve_transcription_request(integer, integer)
  to authenticated;

commit;

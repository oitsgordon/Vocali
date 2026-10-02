begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

create or replace function pg_temp.statement_raises(
  statement text,
  expected_sqlstate text
)
returns boolean
language plpgsql
as $$
begin
  execute statement;
  return false;
exception
  when others then
    return sqlstate = expected_sqlstate;
end;
$$;

select plan(8);

insert into auth.users (id, email, is_anonymous, created_at, updated_at)
values (
  '46c24856-e0c4-4f70-b398-d5b2dcb76ef4',
  null,
  true,
  pg_catalog.now(),
  pg_catalog.now()
);

select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '46c24856-e0c4-4f70-b398-d5b2dcb76ef4',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"46c24856-e0c4-4f70-b398-d5b2dcb76ef4","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select is((select count(*)::integer from public.profiles), 0, 'guest sees no profiles');
select is((select count(*)::integer from public.practice_attempts), 0, 'guest sees no attempts');

select ok(
  pg_temp.statement_raises(
    $$insert into public.profiles (id) values ('46c24856-e0c4-4f70-b398-d5b2dcb76ef4')$$,
    '42501'
  ),
  'guest cannot create a profile'
);

select ok(
  pg_temp.statement_raises(
    $$
      insert into public.practice_attempts (
        id, user_id, prompt, category, completed_at,
        speaking_duration_seconds, feedback, next_action, label
      ) values (
        'guest-attempt',
        '46c24856-e0c4-4f70-b398-d5b2dcb76ef4',
        'Guest prompt', 'guest', pg_catalog.now(), 30, '{}'::jsonb,
        'Continue', 'Guest'
      )
    $$,
    '42501'
  ),
  'guest cannot sync a practice attempt'
);

select results_eq(
  $$select allowed from public.reserve_transcription_request(5, 20)$$,
  $$values (true)$$,
  'guest receives one transcription reservation'
);

select results_eq(
  $$select allowed, limit_reason from public.reserve_transcription_request(5, 20)$$,
  $$values (false, 'guest'::text)$$,
  'guest cannot reserve a second transcription'
);

reset role;

select ok(
  exists (
    select 1 from cron.job
    where jobname = 'vocali-cleanup-anonymous-users'
  ),
  'anonymous cleanup cron is scheduled'
);

select ok(
  pg_catalog.pg_get_functiondef(
    'public.reserve_transcription_request(integer,integer)'::regprocedure
  ) ilike '%is_anonymous_user%',
  'quota function distinguishes anonymous users'
);

select * from finish();
rollback;

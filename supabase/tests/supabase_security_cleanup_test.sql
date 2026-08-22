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

select plan(35);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
      and policyname ilike '%own%'
  ),
  0,
  'obsolete own policies are absent'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
  ),
  8,
  'exactly eight retained ownership policies exist'
);

select ok(
  (
    select coalesce(bool_and(roles = array['authenticated']::name[]), false)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
  ),
  'all retained ownership policies target only authenticated'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
      and cmd in ('SELECT', 'UPDATE', 'DELETE')
      and (qual is null or qual !~* 'select auth\.uid\(\)')
  ),
  'select, update, and delete policies cache auth.uid with a subselect'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'practice_attempts')
      and cmd in ('INSERT', 'UPDATE')
      and (with_check is null or with_check !~* 'select auth\.uid\(\)')
  ),
  'insert and update policies enforce ownership with check'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('apple_auth_tokens', 'transcription_requests')
  ),
  0,
  'server-only tables have no client policies'
);

select ok(
  not has_table_privilege('anon', 'public.apple_auth_tokens', 'select')
    and not has_table_privilege('anon', 'public.apple_auth_tokens', 'insert')
    and not has_table_privilege('anon', 'public.apple_auth_tokens', 'update')
    and not has_table_privilege('anon', 'public.apple_auth_tokens', 'delete')
    and not has_table_privilege('anon', 'public.transcription_requests', 'select')
    and not has_table_privilege('anon', 'public.transcription_requests', 'insert')
    and not has_table_privilege('anon', 'public.transcription_requests', 'update')
    and not has_table_privilege('anon', 'public.transcription_requests', 'delete'),
  'anon has no direct server-table privileges'
);

select ok(
  not has_table_privilege('authenticated', 'public.apple_auth_tokens', 'select')
    and not has_table_privilege('authenticated', 'public.apple_auth_tokens', 'insert')
    and not has_table_privilege('authenticated', 'public.apple_auth_tokens', 'update')
    and not has_table_privilege('authenticated', 'public.apple_auth_tokens', 'delete')
    and not has_table_privilege('authenticated', 'public.transcription_requests', 'select')
    and not has_table_privilege('authenticated', 'public.transcription_requests', 'insert')
    and not has_table_privilege('authenticated', 'public.transcription_requests', 'update')
    and not has_table_privilege('authenticated', 'public.transcription_requests', 'delete'),
  'authenticated has no direct server-table privileges'
);

select ok(
  (
    select prosecdef
    from pg_catalog.pg_proc
    where oid = 'public.reserve_transcription_request(integer,integer)'::regprocedure
  ),
  'quota reservation remains security definer'
);

select ok(
  pg_catalog.pg_get_functiondef(
    'public.reserve_transcription_request(integer,integer)'::regprocedure
  ) like '%SET search_path TO ''''%',
  'quota reservation uses an empty search path'
);

select ok(
  not has_function_privilege(
    'public',
    'public.reserve_transcription_request(integer,integer)',
    'execute'
  ),
  'public cannot execute quota reservation'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.reserve_transcription_request(integer,integer)',
    'execute'
  ),
  'anon cannot execute quota reservation'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.reserve_transcription_request(integer,integer)',
    'execute'
  ),
  'authenticated can execute quota reservation'
);

select ok(
  pg_catalog.pg_get_functiondef(
    'public.reserve_transcription_request(integer,integer)'::regprocedure
  ) like '%pg_catalog.pg_advisory_xact_lock%',
  'quota reservations retain the per-user transaction lock'
);

select ok(
  pg_catalog.pg_get_functiondef(
    'public.reserve_transcription_request(integer,integer)'::regprocedure
  ) ilike '%minute_limit is distinct from 5%',
  'minute quota is fixed at five'
);

select ok(
  pg_catalog.pg_get_functiondef(
    'public.reserve_transcription_request(integer,integer)'::regprocedure
  ) ilike '%daily_limit is distinct from 20%',
  'daily quota is fixed at twenty'
);

select ok(
  pg_temp.statement_raises(
    'select * from public.reserve_transcription_request(5, 20)',
    '42501'
  ),
  'the function rejects a missing authenticated user even for a privileged caller'
);

set local role anon;

select ok(
  pg_temp.statement_raises(
    'select * from public.reserve_transcription_request(5, 20)',
    '42501'
  ),
  'anonymous callers cannot reserve transcription quota'
);

select ok(
  pg_temp.statement_raises('select * from public.apple_auth_tokens', '42501'),
  'anonymous callers cannot read Apple auth tokens'
);

select ok(
  pg_temp.statement_raises(
    'select * from public.transcription_requests',
    '42501'
  ),
  'anonymous callers cannot read transcription requests'
);

reset role;

insert into auth.users (id, email, created_at, updated_at)
values
  (
    '732fbbf1-359f-43fb-bf5b-03c60b981231',
    'vocali-security-user-1@example.invalid',
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    'ad91d355-f04a-4644-b720-f61cc5e38842',
    'vocali-security-user-2@example.invalid',
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    'e1331efd-5e89-4448-b423-3b1f50d652cf',
    'vocali-security-user-3@example.invalid',
    pg_catalog.now(),
    pg_catalog.now()
  );

insert into public.profiles (id, display_name)
values ('ad91d355-f04a-4644-b720-f61cc5e38842', 'Other user');

insert into public.practice_attempts (
  id,
  user_id,
  prompt,
  category,
  completed_at,
  speaking_duration_seconds,
  feedback,
  next_action,
  label
)
values
  (
    'a1111111-1111-4111-8111-111111111111',
    '732fbbf1-359f-43fb-bf5b-03c60b981231',
    'User one prompt',
    'security-test',
    pg_catalog.now(),
    10,
    '{}'::jsonb,
    'Continue',
    'Original'
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    'ad91d355-f04a-4644-b720-f61cc5e38842',
    'User two prompt',
    'security-test',
    pg_catalog.now(),
    10,
    '{}'::jsonb,
    'Continue',
    'Other user'
  );

select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '732fbbf1-359f-43fb-bf5b-03c60b981231',
  true
);
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"732fbbf1-359f-43fb-bf5b-03c60b981231","role":"authenticated"}',
  true
);
set local role authenticated;

select ok(
  pg_temp.statement_raises('select * from public.apple_auth_tokens', '42501'),
  'authenticated callers cannot read Apple auth tokens directly'
);

select ok(
  pg_temp.statement_raises(
    'select * from public.transcription_requests',
    '42501'
  ),
  'authenticated callers cannot read transcription requests directly'
);

select is(
  (select count(*)::integer from public.profiles),
  0,
  'cross-user profiles are hidden'
);

select lives_ok(
  $$
    insert into public.profiles (id, display_name)
    values ('732fbbf1-359f-43fb-bf5b-03c60b981231', 'Current user')
  $$,
  'a user can insert their own profile'
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'a user sees only their own profile'
);

select ok(
  pg_temp.statement_raises(
    $$
      update public.profiles
      set id = 'e1331efd-5e89-4448-b423-3b1f50d652cf'
      where id = '732fbbf1-359f-43fb-bf5b-03c60b981231'
    $$,
    '42501'
  ),
  'profile ownership cannot be reassigned on update'
);

select is(
  (select count(*)::integer from public.practice_attempts),
  1,
  'cross-user practice attempts are hidden'
);

select lives_ok(
  $$
    insert into public.practice_attempts (
      id,
      user_id,
      prompt,
      category,
      completed_at,
      speaking_duration_seconds,
      feedback,
      next_action,
      label
    ) values (
      'a3333333-3333-4333-8333-333333333333',
      '732fbbf1-359f-43fb-bf5b-03c60b981231',
      'Inserted prompt',
      'security-test',
      pg_catalog.now(),
      12,
      '{}'::jsonb,
      'Continue',
      'Inserted'
    )
  $$,
  'a user can insert their own practice attempt'
);

select ok(
  pg_temp.statement_raises(
    $$
      insert into public.practice_attempts (
        id,
        user_id,
        prompt,
        category,
        completed_at,
        speaking_duration_seconds,
        feedback,
        next_action,
        label
      ) values (
        'a4444444-4444-4444-8444-444444444444',
        'ad91d355-f04a-4644-b720-f61cc5e38842',
        'Foreign prompt',
        'security-test',
        pg_catalog.now(),
        12,
        '{}'::jsonb,
        'Continue',
        'Forbidden'
      )
    $$,
    '42501'
  ),
  'a user cannot insert a practice attempt for another user'
);

select results_eq(
  $$
    update public.practice_attempts
    set label = 'Updated by owner'
    where id = 'a1111111-1111-4111-8111-111111111111'
    returning label
  $$,
  $$values ('Updated by owner'::text)$$,
  'a user can update their own practice attempt'
);

select ok(
  pg_temp.statement_raises(
    $$
      update public.practice_attempts
      set user_id = 'ad91d355-f04a-4644-b720-f61cc5e38842'
      where id = 'a1111111-1111-4111-8111-111111111111'
    $$,
    '42501'
  ),
  'practice-attempt ownership cannot be reassigned on update'
);

select results_eq(
  $$
    with changed as (
      update public.practice_attempts
      set label = 'Cross-user update'
      where id = 'a2222222-2222-4222-8222-222222222222'
      returning 1
    )
    select count(*) from changed
  $$,
  $$values (0::bigint)$$,
  'cross-user practice-attempt updates affect no rows'
);

select results_eq(
  $$
    select allowed
    from public.reserve_transcription_request(5, 20)
  $$,
  $$values (true)$$,
  'an authenticated user can reserve quota with deployed limits'
);

select ok(
  pg_temp.statement_raises(
    'select * from public.reserve_transcription_request(1, 20)',
    '22023'
  ),
  'caller-supplied minute limits are rejected'
);

select ok(
  pg_temp.statement_raises(
    'select * from public.reserve_transcription_request(5, 100)',
    '22023'
  ),
  'caller-supplied daily limits are rejected'
);

reset role;
select * from finish();
rollback;

-- Public-pilot admissions are globally bounded without collecting IP addresses.
-- This is not an IP-level rate limiter: an abusive client can exhaust the daily quota.
create table if not exists public.public_pilot_quota (
  quota_day date primary key,
  admissions integer not null default 0 check(admissions between 0 and 120),
  request_window timestamptz not null default now(),
  requests integer not null default 0 check(requests between 0 and 1200)
);
alter table public.public_pilot_quota enable row level security;
revoke all on public.public_pilot_quota from public,anon,authenticated;
alter table public.sessions drop constraint if exists sessions_mode_check;
alter table public.sessions add constraint sessions_mode_check check(mode in ('real','test','demo','pilot'));

create or replace function public.ingest_public_pilot(s jsonb, token text, records jsonb, withdrawal boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare sid uuid=(s->>'id')::uuid; issued text; new_count integer; answer jsonb;
begin
  if s->>'mode'<>'pilot' or s->>'version'<>'4.1.0-public-pilot' then raise exception 'PUBLIC_PILOT_ONLY'; end if;
  -- Global request budget also bounds traffic for already-created sessions.
  insert into public.public_pilot_quota(quota_day,admissions,request_window,requests)
    values ((now() at time zone 'UTC')::date,0,now(),1)
  on conflict(quota_day) do update set
    request_window=case when public_pilot_quota.request_window<now()-interval '1 minute' then now() else public_pilot_quota.request_window end,
    requests=case when public_pilot_quota.request_window<now()-interval '1 minute' then 1 else public_pilot_quota.requests+1 end
    where public_pilot_quota.request_window<now()-interval '1 minute' or public_pilot_quota.requests<1200
  returning requests into new_count;
  if not found then raise exception 'PUBLIC_RATE_CAP';end if;
  -- Serialize first requests for the same ID so retries cannot consume multiple slots.
  perform pg_advisory_xact_lock(hashtextextended(sid::text,729));
  if not exists(select 1 from public.sessions where id=sid) and not withdrawal then
    update public.public_pilot_quota set admissions=admissions+1
      where quota_day=(now() at time zone 'UTC')::date and admissions<120 returning admissions into new_count;
    if not found then raise exception 'PILOT_DAILY_CAP';end if;
    -- Preserve the original ingestion transaction and its per-session controls.
    -- This one-time internal code is never returned to or required of participants.
    issued=(s->>'latin_row')||':'||gen_random_uuid()::text;
    insert into public.enrollment_codes(code_hash) values(encode(digest(issued,'sha256'),'hex'));
  end if;
  if not withdrawal and (select count(*) from public.events where session_id=sid) +
    (select count(*) from jsonb_array_elements(records) r where r->>'kind'='events' and not exists(select 1 from public.events e where e.id=(r->>'id')::uuid)) > 3000 then
    raise exception 'PUBLIC_SESSION_EVENT_CAP';
  end if;
  answer=public.ingest_batch(s,token,records,issued,withdrawal);
  return answer;
end $$;
revoke all on function public.ingest_public_pilot(jsonb,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.ingest_public_pilot(jsonb,text,jsonb,boolean) to service_role;

create or replace function public.purge_expired_experiments() returns void language sql security definer set search_path=public as $$
  delete from sessions where expires_at<now();
  delete from enrollment_codes where expires_at<now();
  delete from public_pilot_quota where quota_day<(now() at time zone 'UTC')::date-7;
$$;

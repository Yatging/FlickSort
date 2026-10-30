create extension if not exists pgcrypto;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from admin_users where user_id=auth.uid())$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create table public.enrollment_codes (code_hash text primary key, used_by uuid unique, expires_at timestamptz not null default now()+interval '7 days');
create table public.sessions (
 id uuid primary key, version text not null, mode text not null check(mode in ('real','test','demo')),
 latin_row integer not null check(latin_row between 0 and 3), condition_order jsonb not null,
 trials_per_condition integer not null check(trials_per_condition in (4,8,12)), token_hash text not null,
 started_at timestamptz not null, ended_at timestamptz, status text not null check(status in ('active','partial','completed')),
 consent_version text not null, expires_at timestamptz not null default now()+interval '90 days',
 last_sync_at timestamptz not null default now(), request_window timestamptz not null default now(), request_count integer not null default 0
);
create table public.trials (
 id uuid primary key, session_id uuid not null references public.sessions on delete cascade, record jsonb not null,
 condition text generated always as (record->>'condition') stored,
 block integer generated always as ((record->>'block')::int) stored,
 trial integer generated always as ((record->>'trial')::int) stored,
 unique(session_id,condition,block,trial)
);
create table public.events (id uuid primary key, session_id uuid not null references public.sessions on delete cascade, record jsonb not null);
create table public.questionnaires (id uuid primary key, session_id uuid not null references public.sessions on delete cascade, record jsonb not null, phase text generated always as(record->>'phase') stored, unique(session_id,phase));
create table public.sync_status (session_id uuid primary key references public.sessions on delete cascade, acknowledged_at timestamptz not null, acknowledged_records int not null, status text not null);
alter table public.enrollment_codes enable row level security;
alter table public.sessions enable row level security;
alter table public.trials enable row level security;
alter table public.events enable row level security;
alter table public.questionnaires enable row level security;
alter table public.sync_status enable row level security;
create policy admin_read_sessions on public.sessions for select to authenticated using(public.is_admin());
create policy admin_delete_sessions on public.sessions for delete to authenticated using(public.is_admin());
create policy admin_read_trials on public.trials for select to authenticated using(public.is_admin());
create policy admin_read_events on public.events for select to authenticated using(public.is_admin());
create policy admin_read_questions on public.questionnaires for select to authenticated using(public.is_admin());
create policy admin_read_sync on public.sync_status for select to authenticated using(public.is_admin());
revoke all on public.sessions,public.trials,public.events,public.questionnaires,public.sync_status,public.admin_users,public.enrollment_codes from anon,authenticated;
grant select on public.sessions,public.trials,public.events,public.questionnaires,public.sync_status to authenticated;
grant delete on public.sessions to authenticated;
-- Do not expose token hashes through the REST API, including to administrators.
revoke select on public.sessions from authenticated;
grant select(id,version,mode,latin_row,condition_order,trials_per_condition,started_at,ended_at,status,consent_version,expires_at,last_sync_at) on public.sessions to authenticated;
create index events_session on public.events(session_id);
create index sessions_date on public.sessions(started_at);
create function public.ingest_batch(s jsonb, token text, records jsonb, enrollment text default null, withdrawal boolean default false)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare old sessions; r jsonb; existing jsonb; target text; ack jsonb='[]'; sid uuid=(s->>'id')::uuid; total int;
begin
 select * into old from sessions where id=sid for update;
 if found then
   if old.token_hash<>encode(digest(token,'sha256'),'hex') then raise exception 'Invalid session credential'; end if;
   if withdrawal then delete from sessions where id=sid;return jsonb_build_object('deleted',true);end if;
   if old.expires_at<now() then raise exception 'Session expired'; end if;
   if old.version<>s->>'version' or old.mode<>s->>'mode' or old.latin_row<>(s->>'latin_row')::int or old.trials_per_condition<>(s->>'trials_per_condition')::int then raise exception 'Immutable session configuration';end if;
   if old.request_window>now()-interval '1 minute' and old.request_count>=120 then raise exception 'Rate limit';end if;
   update sessions set request_count=case when request_window<now()-interval '1 minute' then 1 else request_count+1 end, request_window=case when request_window<now()-interval '1 minute' then now() else request_window end where id=sid;
 else
   if withdrawal then return jsonb_build_object('deleted',true);end if;
   if left(enrollment,1)<>(s->>'latin_row') then raise exception 'Enrollment Latin row mismatch';end if;
   update enrollment_codes set used_by=sid where code_hash=encode(digest(enrollment,'sha256'),'hex') and used_by is null and expires_at>now();
   if not found then raise exception 'Valid single-use enrollment code required';end if;
   insert into sessions(id,version,mode,latin_row,condition_order,trials_per_condition,token_hash,started_at,status,consent_version)
   values(sid,s->>'version',s->>'mode',(s->>'latin_row')::int,s->'condition_order',(s->>'trials_per_condition')::int,encode(digest(token,'sha256'),'hex'),(s->>'started_at')::timestamptz,'active',s->>'consent_version');
 end if;
 for r in select * from jsonb_array_elements(records) loop
   if r->>'session_id'<>sid::text or r->>'version'<>s->>'version' or r->>'mode'<>s->>'mode' then raise exception 'Session mismatch';end if;
   target=r->>'kind'; if target not in ('trials','events','questionnaires') then raise exception 'Invalid record kind';end if;
   execute format('select record from %I where id=$1',target) into existing using (r->>'id')::uuid;
   if existing is not null and existing<>r then raise exception 'ID collision with different content';end if;
   execute format('insert into %I(id,session_id,record) values($1,$2,$3) on conflict(id) do nothing',target) using (r->>'id')::uuid,sid,r;
   ack=ack||jsonb_build_array(r->>'id');
 end loop;
 select (select count(*) from trials where session_id=sid)+(select count(*) from events where session_id=sid)+(select count(*) from questionnaires where session_id=sid) into total;
 if total>20000 then raise exception 'Session record limit';end if;
 if s->>'status'='completed' then
   if (select count(*) from trials where session_id=sid)<>4*(s->>'trials_per_condition')::int or (select count(*) from questionnaires where session_id=sid)<>2 then
     update sessions set status='partial' where id=sid;
   else update sessions set status='completed',ended_at=(s->>'ended_at')::timestamptz where id=sid;end if;
 elsif old.status is distinct from 'completed' then update sessions set status=s->>'status' where id=sid;end if;
 update sessions set last_sync_at=now() where id=sid;
 insert into sync_status values(sid,now(),total,'acknowledged') on conflict(session_id) do update set acknowledged_at=now(),acknowledged_records=total,status='acknowledged';
 return jsonb_build_object('ack',ack,'status',(select status from sessions where id=sid));
end $$;
revoke all on function public.ingest_batch(jsonb,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.ingest_batch(jsonb,text,jsonb,text,boolean) to service_role;
-- Retention job: run daily with a privileged scheduler (see deployment guide).
create function public.purge_expired_experiments() returns void language sql security definer set search_path=public as $$delete from sessions where expires_at<now();delete from enrollment_codes where expires_at<now()$$;
revoke all on function public.purge_expired_experiments() from public,anon,authenticated;
grant execute on function public.purge_expired_experiments() to service_role;

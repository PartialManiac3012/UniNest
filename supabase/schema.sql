create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  uid text unique not null,
  email text not null,
  name text not null default '',
  college text not null default '',
  year text not null default '',
  stream text not null default '',
  interests text[] not null default '{}',
  avatar text not null default '',
  phone text not null default '',
  bio text not null default '',
  skills text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate profiles tables created by earlier versions of the app.
alter table public.profiles add column if not exists uid text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists name text default '';
alter table public.profiles add column if not exists college text default '';
alter table public.profiles add column if not exists year text default '';
alter table public.profiles add column if not exists stream text default '';
alter table public.profiles add column if not exists interests text[] default '{}';
alter table public.profiles add column if not exists avatar text default '';
alter table public.profiles add column if not exists phone text default '';
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists skills text default '';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

update public.profiles p
set
  uid = coalesce(nullif(p.uid, ''), coalesce(u.raw_user_meta_data->>'uid', split_part(u.email, '@', 1), left(u.id::text, 8))),
  email = coalesce(nullif(p.email, ''), u.email)
from auth.users u
where p.id = u.id;

alter table public.profiles alter column uid set not null;
alter table public.profiles alter column email set not null;
create unique index if not exists profiles_uid_key on public.profiles (uid);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, uid, email, name, college, year, stream, interests, avatar, phone, bio, skills
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'uid', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'college', ''),
    coalesce(new.raw_user_meta_data->>'year', ''),
    coalesce(new.raw_user_meta_data->>'stream', ''),
    coalesce(
      array(
        select jsonb_array_elements_text(
          coalesce(new.raw_user_meta_data->'interests', '[]'::jsonb)
        )
      ),
      '{}'
    ),
    coalesce(new.raw_user_meta_data->>'avatar', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'skills', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, uid, email, name, college, year, stream, interests, avatar, phone, bio, skills)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'uid', split_part(u.email, '@', 1)),
  u.email,
  coalesce(u.raw_user_meta_data->>'name', ''),
  coalesce(u.raw_user_meta_data->>'college', ''),
  coalesce(u.raw_user_meta_data->>'year', ''),
  coalesce(u.raw_user_meta_data->>'stream', ''),
  coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(u.raw_user_meta_data->'interests', '[]'::jsonb)
      )
    ),
    '{}'
  ),
  coalesce(u.raw_user_meta_data->>'avatar', ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  coalesce(u.raw_user_meta_data->>'bio', ''),
  coalesce(u.raw_user_meta_data->>'skills', '')
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  updated_at = now();

alter table public.profiles enable row level security;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Authenticated users can view profiles"
on public.profiles for select to authenticated using (true);
create policy "Users can create their own profile"
on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.posts (
  id text primary key,
  by_uid text not null references public.profiles(uid) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 280),
  tag text not null default 'General',
  likes text[] not null default '{}',
  comments jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Migrate posts tables created by earlier versions of the app.
-- These columns are added without rewriting or deleting existing posts.
alter table public.posts add column if not exists by_uid text;
-- Legacy deployments used the authenticated user's UUID in author_id.
-- Keep this column available while the app uses by_uid for profile identity.
alter table public.posts add column if not exists author_id uuid;
alter table public.posts add column if not exists text text;
alter table public.posts add column if not exists tag text default 'General';
alter table public.posts add column if not exists likes text[] default '{}';
alter table public.posts add column if not exists comments jsonb default '[]'::jsonb;
alter table public.posts add column if not exists pinned boolean default false;
alter table public.posts add column if not exists created_at timestamptz default now();
update public.posts set
  tag = coalesce(nullif(tag, ''), 'General'),
  likes = coalesce(likes, '{}'),
  comments = coalesce(comments, '[]'::jsonb),
  pinned = coalesce(pinned, false),
  created_at = coalesce(created_at, now())
where tag is null or tag = '' or likes is null or comments is null or pinned is null or created_at is null;

alter table public.posts enable row level security;
drop policy if exists "Authenticated users can view posts" on public.posts;
drop policy if exists "Users can create their own posts" on public.posts;
drop policy if exists "Users can update their own posts" on public.posts;
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Authenticated users can view posts"
on public.posts for select to authenticated using (true);
create policy "Users can create their own posts"
on public.posts for insert to authenticated
with check (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()));
create policy "Users can update their own posts"
on public.posts for update to authenticated
using (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()))
with check (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()));
create policy "Users can delete their own posts"
on public.posts for delete to authenticated
using (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()));

do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception
    when duplicate_object then null;
  end;
end
$$;

create table if not exists public.lost_found (
  id text primary key,
  by_uid text not null references public.profiles(uid) on delete cascade,
  type text not null check (type in ('lost','found')),
  title text not null,
  description text not null,
  location text not null,
  photo text not null default '',
  claimed boolean not null default false,
  claim_requests jsonb not null default '[]'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
-- Migrate Lost & Found tables created by earlier versions.
alter table public.lost_found add column if not exists by_uid text;
alter table public.lost_found add column if not exists type text default 'lost';
alter table public.lost_found add column if not exists title text default '';
alter table public.lost_found add column if not exists description text default '';
alter table public.lost_found add column if not exists location text default '';
alter table public.lost_found add column if not exists photo text default '';
alter table public.lost_found add column if not exists claimed boolean default false;
alter table public.lost_found add column if not exists claim_requests jsonb default '[]'::jsonb;
alter table public.lost_found add column if not exists claimed_at timestamptz;
alter table public.lost_found add column if not exists created_at timestamptz default now();
update public.lost_found set
  type = lower(coalesce(nullif(type, ''), 'lost')),
  title = coalesce(title, ''),
  description = coalesce(description, ''),
  location = coalesce(location, ''),
  photo = coalesce(photo, ''),
  claimed = coalesce(claimed, false),
  claim_requests = coalesce(claim_requests, '[]'::jsonb),
  created_at = coalesce(created_at, now())
where type is null or title is null or description is null or location is null
   or photo is null or claimed is null or claim_requests is null or created_at is null;
alter table public.lost_found enable row level security;
drop policy if exists "Authenticated users can view lost found posts" on public.lost_found;
drop policy if exists "Users can create their own lost found posts" on public.lost_found;
drop policy if exists "Users can update lost found posts" on public.lost_found;
drop policy if exists "Users can delete their own lost found posts" on public.lost_found;
create policy "Authenticated users can view lost found posts"
on public.lost_found for select to authenticated using (true);
create policy "Users can create their own lost found posts"
on public.lost_found for insert to authenticated
with check (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()));
create policy "Users can update lost found posts"
on public.lost_found for update to authenticated
using (
  true
)
with check (
  exists (select 1 from public.profiles where uid = by_uid and id = auth.uid())
  or claim_requests @> jsonb_build_array(jsonb_build_object(
    'uid', (select uid from public.profiles where id = auth.uid())
  ))
);
create policy "Users can delete their own lost found posts"
on public.lost_found for delete to authenticated
using (exists (select 1 from public.profiles where uid = by_uid and id = auth.uid()));

do $$
begin
  begin
    alter publication supabase_realtime add table public.lost_found;
  exception
    when duplicate_object then null;
  end;
end
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (sender_id, recipient_id)
);

alter table public.connection_requests enable row level security;
drop policy if exists "Users can view their connection requests" on public.connection_requests;
drop policy if exists "Users can send connection requests" on public.connection_requests;
drop policy if exists "Recipients can respond to connection requests" on public.connection_requests;
create policy "Users can view their connection requests"
on public.connection_requests for select to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send connection requests"
on public.connection_requests for insert to authenticated
with check (auth.uid() = sender_id);
create policy "Recipients can respond to connection requests"
on public.connection_requests for update to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.connection_requests;
  exception
    when duplicate_object then null;
  end;
end
$$;

alter table public.messages enable row level security;
create or replace function public.is_verified_auth_user(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = user_id
      and (
        lower(email) like '%@sudoon.ac.in'
        or lower(email) = 'kumar.aditya30122006@gmail.com'
      )
  );
$$;
grant execute on function public.is_verified_auth_user(uuid) to authenticated;
create or replace function public.is_verified_student()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_verified_auth_user(auth.uid());
$$;
grant execute on function public.is_verified_student() to authenticated;
create or replace function public.is_connected_user(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.connection_requests
    where status = 'accepted'
      and (
        (sender_id = auth.uid() and recipient_id = other_user_id)
        or (sender_id = other_user_id and recipient_id = auth.uid())
      )
  );
$$;
grant execute on function public.is_connected_user(uuid) to authenticated;
create or replace function public.is_claim_participant(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lost_found lf
    join public.profiles owner_profile on owner_profile.uid = lf.by_uid
    join public.profiles current_profile on current_profile.id = auth.uid()
    where (
      (owner_profile.id = other_user_id and lf.claim_requests @> jsonb_build_array(jsonb_build_object('uid', current_profile.uid)))
      or
      (owner_profile.id = auth.uid() and lf.claim_requests @> jsonb_build_array(jsonb_build_object('uid', (select uid from public.profiles where id = other_user_id))))
    )
  );
$$;
grant execute on function public.is_claim_participant(uuid) to authenticated;
drop policy if exists "Users can read their own messages" on public.messages;
drop policy if exists "Users can send messages as themselves" on public.messages;
drop policy if exists "Users can unsend their own messages" on public.messages;
create policy "Users can read their own messages"
on public.messages for select to authenticated
using (
  (auth.uid() = sender_id or auth.uid() = recipient_id)
  and (
    public.is_connected_user(case when auth.uid() = sender_id then recipient_id else sender_id end)
    or public.is_claim_participant(case when auth.uid() = sender_id then recipient_id else sender_id end)
  )
);
create policy "Users can send messages as themselves"
on public.messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and (public.is_connected_user(recipient_id) or public.is_claim_participant(recipient_id))
);
create policy "Users can unsend their own messages"
on public.messages for delete to authenticated
using (auth.uid() = sender_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
  end;
end
$$;

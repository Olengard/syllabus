-- DIGEST → Supabase (pchld) — tabelle dg_feeds + dg_preferences
-- Da eseguire nel SQL Editor del progetto pchldmiavycxzpkzochn

create table if not exists dg_feeds (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null default '',
  url        text not null,
  color      text default '#c8963e',
  category   text default 'news',          -- news | culture | tech
  created_at timestamptz not null default now()
);
create index if not exists dg_feeds_user_idx on dg_feeds (user_id);

create table if not exists dg_preferences (
  user_id    uuid references auth.users(id) on delete cascade not null,
  key        text not null,
  value      jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table dg_feeds       enable row level security;
alter table dg_preferences enable row level security;
drop policy if exists "dg_feeds own"       on dg_feeds;
drop policy if exists "dg_preferences own" on dg_preferences;
create policy "dg_feeds own" on dg_feeds
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dg_preferences own" on dg_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';

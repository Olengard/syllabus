-- ============================================================
-- Syllabus — Migration Supabase
-- Progetto: pchldmiavycxzpkzochn (stesso di BookShelf/Footnote)
-- ============================================================

-- ── 1. CURRICULA ────────────────────────────────────────────
create table if not exists sl_curricula (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  emoji        text not null default '📚',
  duration     text not null default '2–3 mesi',
  level        text not null default 'Intermedio',
  focus        text[] not null default '{}',
  must_haves   text[] not null default '{}',  -- punti fermi dal wizard
  progress     int not null default 0 check (progress between 0 and 100),
  project_final text,                          -- testo progetto finale (generato dall'AI)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 2. RISORSE ──────────────────────────────────────────────
-- section: 'primary' | 'secondary' | 'other'
-- type:    'book' | 'essay' | 'film' | 'podcast' | 'museum'
create table if not exists sl_resources (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references sl_curricula(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  section       text not null check (section in ('primary','secondary','other')),
  type          text not null check (type in ('book','essay','film','podcast','museum')),
  title         text not null,
  author        text,
  year          text,
  note          text,
  order_index   int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── 3. SEZIONI RIFERIMENTI ──────────────────────────────────
-- Ogni curriculum può avere 0..N sezioni riferimenti.
-- section_type: 'dischi' | 'dipinti' | 'sculture' | 'edifici' |
--               'film_essenziali' | 'luoghi' | 'fotografie' | 'performance'
-- I record dello stesso curriculum + section_type formano una sezione.
create table if not exists sl_reference_items (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references sl_curricula(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  section_type  text not null check (section_type in (
    'dischi','dipinti','sculture','edifici',
    'film_essenziali','luoghi','fotografie','performance'
  )),
  title         text not null,
  author        text,
  year          text,
  location      text,   -- per edifici, luoghi, opere in museo
  note          text,
  order_index   int not null default 0,
  created_at    timestamptz not null default now()
);

-- ── 4. CONNESSIONI ──────────────────────────────────────────
-- relation_type: 'fa parte di' | 'comprende' | 'connesso a'
-- related_curriculum_id può essere null se il percorso collegato
-- non è ancora stato creato (suggerimento AI non ancora aperto).
create table if not exists sl_connections (
  id                    uuid primary key default gen_random_uuid(),
  curriculum_id         uuid not null references sl_curricula(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  related_curriculum_id uuid references sl_curricula(id) on delete set null,
  related_title         text not null,   -- sempre presente, anche se il curriculum esiste
  related_emoji         text default '📚',
  relation_type         text not null check (relation_type in (
    'fa parte di','comprende','connesso a'
  )),
  is_ai_suggestion      boolean not null default false,
  suggestion_reason     text,            -- motivazione del suggerimento AI
  created_at            timestamptz not null default now()
);

-- ── 5. CHAT ─────────────────────────────────────────────────
create table if not exists sl_chats (
  id            uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references sl_curricula(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('user','ai')),
  content       text not null,
  created_at    timestamptz not null default now()
);

-- ── INDICI ──────────────────────────────────────────────────
create index if not exists sl_curricula_user_id     on sl_curricula(user_id);
create index if not exists sl_resources_curriculum  on sl_resources(curriculum_id, section, order_index);
create index if not exists sl_refs_curriculum       on sl_reference_items(curriculum_id, section_type, order_index);
create index if not exists sl_connections_curriculum on sl_connections(curriculum_id);
create index if not exists sl_chats_curriculum      on sl_chats(curriculum_id, created_at);

-- ── UPDATED_AT automatico ───────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sl_curricula_updated_at on sl_curricula;
create trigger sl_curricula_updated_at
  before update on sl_curricula
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table sl_curricula       enable row level security;
alter table sl_resources       enable row level security;
alter table sl_reference_items enable row level security;
alter table sl_connections     enable row level security;
alter table sl_chats           enable row level security;

-- curricula
create policy "sl_curricula: utente vede i suoi"
  on sl_curricula for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- resources
create policy "sl_resources: utente vede i suoi"
  on sl_resources for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- reference items
create policy "sl_reference_items: utente vede i suoi"
  on sl_reference_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- connections
create policy "sl_connections: utente vede le sue"
  on sl_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chats
create policy "sl_chats: utente vede le sue"
  on sl_chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

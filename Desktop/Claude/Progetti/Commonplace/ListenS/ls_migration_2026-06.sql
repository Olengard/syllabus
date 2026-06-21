-- ════════════════════════════════════════════════════════════════
-- ListenS — Migrazione schema 2026-06-11 (Sessione #18)
-- Da eseguire UNA VOLTA nel SQL Editor di Supabase
-- (progetto pchldmiavycxzpkzochn → SQL Editor → New query → incolla → Run)
-- Non tocca nessun dato esistente: aggiunge solo colonne.
-- ════════════════════════════════════════════════════════════════

-- ls_podcasts: stato (wishlist/following), provenienza (footnote/syllabus/...),
-- cache episodi, id iTunes, soft delete
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'wishlist';
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS source     JSONB DEFAULT NULL;
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS episodes   JSONB DEFAULT '[]';
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS itunes_id  TEXT DEFAULT '';
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE ls_podcasts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ls_collections: colore e episodi salvati nella collezione
ALTER TABLE ls_collections ADD COLUMN IF NOT EXISTS color    TEXT DEFAULT '#6B4E9B';
ALTER TABLE ls_collections ADD COLUMN IF NOT EXISTS episodes JSONB DEFAULT '[]';

-- Ricarica lo schema cache di PostgREST (importante!)
NOTIFY pgrst, 'reload schema';

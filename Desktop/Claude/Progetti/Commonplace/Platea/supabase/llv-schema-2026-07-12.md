# Schema llvqoiyvzloloobjiloe — snapshot 2026-07-12 (Fase 0 migrazione pchld)

> Output di `information_schema.columns` eseguito da Stefano nel SQL editor di llv
> (vedi `../piano-migrazione-pchld.md`, Fase 0). Serve alla Fase 1 per ricreare
> gli schemi IDENTICI su pchld.

## ✅ FASE 0 COMPLETA (2026-07-12 sera) — vista, RPC, enum

### ENUM custom (gli unici due da ricreare su pchld — gli altri typname
### dell'output erano tipi di sistema Supabase: aal_level, factor_type, oauth_*, ecc.)

```sql
create type video_source as enum ('youtube','archive','wikidata','playlist');
create type content_category as enum
  ('cinema','classica','jazz','opera','lezioni','storia','documentario','anime');
```

⚠️ ATTENZIONE Fase 1: su pchld questi CREATE TYPE potrebbero collidere con nomi futuri —
sono nomi generici in un progetto condiviso. Vanno bene così (nessun conflitto oggi),
ma verificare con `select typname from pg_type join pg_namespace...` prima di crearli.
Colonne che li usano: `videos.source/category`, `channels.source/category`,
`sync_log.source` (la vista li eredita). `carousels.category` invece è TEXT semplice.

### Vista `continue_watching` (verbatim da pg_get_viewdef)

```sql
create view continue_watching as
 SELECT v.id,
    v.title,
    v.thumbnail_url,
    v.embed_url,
    v.duration_sec,
    v.category,
    v.channel_id,
    v.tags,
    v.source,
    v.source_id,
    wp.position_sec,
    wp.completed,
    wp.last_watched,
        CASE
            WHEN v.duration_sec > 0 THEN round(wp.position_sec::numeric / v.duration_sec::numeric * 100::numeric)
            ELSE 0::numeric
        END AS progress_pct
   FROM watch_progress wp
     JOIN videos v ON v.id = wp.video_id
  WHERE wp.completed = false
  ORDER BY wp.last_watched DESC
 LIMIT 10;
```

### RPC `search_videos` (verbatim da pg_get_functiondef)

```sql
CREATE OR REPLACE FUNCTION public.search_videos(query_text text, filter_category text DEFAULT NULL::text, filter_tags text[] DEFAULT NULL::text[], result_limit integer DEFAULT 30, result_offset integer DEFAULT 0)
 RETURNS SETOF videos
 LANGUAGE sql
 STABLE
AS $function$
  SELECT *
  FROM videos v
  WHERE
    (query_text IS NULL OR query_text = '' OR
      to_tsvector('english',
        coalesce(v.title,'') || ' ' ||
        coalesce(v.description,'') || ' ' ||
        coalesce(v.composer,'')
      ) @@ plainto_tsquery('english', query_text)
      OR lower(v.title) LIKE lower('%' || query_text || '%')
    )
    AND (filter_category IS NULL OR v.category::text = filter_category)
    AND (filter_tags IS NULL OR v.tags && filter_tags)
  ORDER BY
    CASE WHEN lower(v.title) LIKE lower('%' || query_text || '%') THEN 0 ELSE 1 END,
    v.published_at DESC
  LIMIT result_limit OFFSET result_offset;
$function$
```

Nota Fase 1: la funzione fa FTS `to_tsvector` al volo su title/description/composer —
su llv non risulta un indice GIN dedicato dal DDL colonne; con 11k righe funziona
comunque, ricrearla identica senza "migliorie". `RETURNS SETOF videos` richiede che
la TABELLA videos esista PRIMA della funzione (ordine: enum → tabelle → vista → RPC).

## Note di lettura

- `continue_watching` è una VISTA (compare qui perché information_schema la include):
  colonne = videos ⋈ watch_progress + `progress_pct` calcolata. NON creare come tabella.
- `cp_items`/`cp_log` di llv NON vanno ricreate su pchld (esistono già, layer unificato #18):
  le 1+1 righe legacy si UPSERTANO soltanto. Nota: lo schema cp di llv NON ha `user_id`
  (quello di pchld sì, nullable) — nell'upsert lasciare `user_id` NULL.
- Sequences: `saved_videos_id_seq`, `watch_progress_id_seq`, `sync_log_id_seq` (bigint) —
  dopo l'import riallineare con `setval` (vedi piano, Fase 2).
- `videos.published_at` è `date` (non timestamptz). `view_count`/`like_count`/
  `download_count` sono `bigint`.

## information_schema.columns (verbatim)

| table_name | column_name | data_type | is_nullable | column_default |
| --- | --- | --- | --- | --- |
| carousel_videos | id | uuid | NO | gen_random_uuid() |
| carousel_videos | carousel_id | uuid | NO | null |
| carousel_videos | video_id | text | NO | null |
| carousel_videos | order_index | integer | NO | 0 |
| carousels | id | uuid | NO | gen_random_uuid() |
| carousels | category | text | NO | null |
| carousels | title | text | NO | null |
| carousels | type | text | NO | null |
| carousels | filter_value | text | YES | null |
| carousels | order_index | integer | NO | 0 |
| carousels | active | boolean | NO | true |
| carousels | created_at | timestamp with time zone | YES | now() |
| channels | id | text | NO | null |
| channels | name | text | NO | null |
| channels | source | USER-DEFINED | NO | null |
| channels | source_id | text | NO | null |
| channels | category | USER-DEFINED | NO | null |
| channels | thumbnail_url | text | YES | null |
| channels | description | text | YES | null |
| channels | active | boolean | NO | true |
| channels | created_at | timestamp with time zone | NO | now() |
| channels | updated_at | timestamp with time zone | NO | now() |
| channels | min_duration_sec | integer | YES | 1200 |
| continue_watching | id | text | YES | null |
| continue_watching | title | text | YES | null |
| continue_watching | thumbnail_url | text | YES | null |
| continue_watching | embed_url | text | YES | null |
| continue_watching | duration_sec | integer | YES | null |
| continue_watching | category | USER-DEFINED | YES | null |
| continue_watching | channel_id | text | YES | null |
| continue_watching | tags | ARRAY | YES | null |
| continue_watching | source | USER-DEFINED | YES | null |
| continue_watching | source_id | text | YES | null |
| continue_watching | position_sec | integer | YES | null |
| continue_watching | completed | boolean | YES | null |
| continue_watching | last_watched | timestamp with time zone | YES | null |
| continue_watching | progress_pct | numeric | YES | null |
| cp_items | id | text | NO | null |
| cp_items | source_app | text | NO | null |
| cp_items | source_id | text | NO | null |
| cp_items | type | text | NO | 'video'::text |
| cp_items | title | text | NO | null |
| cp_items | subtitle | text | YES | null |
| cp_items | cover_url | text | YES | null |
| cp_items | status | text | NO | 'watching'::text |
| cp_items | tags | ARRAY | NO | '{}'::text[] |
| cp_items | metadata | jsonb | NO | '{}'::jsonb |
| cp_items | created_at | timestamp with time zone | NO | now() |
| cp_items | updated_at | timestamp with time zone | NO | now() |
| cp_log | id | text | NO | null |
| cp_log | item_id | text | NO | null |
| cp_log | source_app | text | NO | null |
| cp_log | event_type | text | NO | null |
| cp_log | event_at | timestamp with time zone | NO | now() |
| cp_log | metadata | jsonb | NO | '{}'::jsonb |
| pl_playlist_videos | playlist_id | text | NO | null |
| pl_playlist_videos | video_id | text | NO | null |
| pl_playlist_videos | order_index | integer | NO | 0 |
| pl_playlist_videos | added_at | timestamp with time zone | NO | now() |
| pl_playlists | id | text | NO | null |
| pl_playlists | name | text | NO | null |
| pl_playlists | created_at | timestamp with time zone | NO | now() |
| saved_videos | id | bigint | NO | nextval('saved_videos_id_seq'::regclass) |
| saved_videos | video_id | text | NO | null |
| saved_videos | saved_at | timestamp with time zone | NO | now() |
| saved_videos | note | text | YES | null |
| sync_log | id | bigint | NO | nextval('sync_log_id_seq'::regclass) |
| sync_log | channel_id | text | YES | null |
| sync_log | source | USER-DEFINED | YES | null |
| sync_log | started_at | timestamp with time zone | NO | now() |
| sync_log | finished_at | timestamp with time zone | YES | null |
| sync_log | videos_added | integer | YES | 0 |
| sync_log | videos_updated | integer | YES | 0 |
| sync_log | videos_total | integer | YES | 0 |
| sync_log | api_units_used | integer | YES | 0 |
| sync_log | error | text | YES | null |
| sync_log | status | text | YES | 'running'::text |
| videos | id | text | NO | null |
| videos | source | USER-DEFINED | NO | null |
| videos | source_id | text | NO | null |
| videos | channel_id | text | YES | null |
| videos | title | text | NO | null |
| videos | description | text | YES | null |
| videos | thumbnail_url | text | YES | null |
| videos | duration_sec | integer | YES | null |
| videos | published_at | date | YES | null |
| videos | embed_url | text | NO | null |
| videos | category | USER-DEFINED | NO | null |
| videos | tags | ARRAY | YES | '{}'::text[] |
| videos | has_subtitles_en | boolean | YES | false |
| videos | composer | text | YES | null |
| videos | performers | ARRAY | YES | '{}'::text[] |
| videos | music_period | text | YES | null |
| videos | music_form | text | YES | null |
| videos | year | integer | YES | null |
| videos | director | text | YES | null |
| videos | wikidata_qid | text | YES | null |
| videos | view_count | bigint | YES | null |
| videos | like_count | bigint | YES | null |
| videos | download_count | bigint | YES | null |
| videos | created_at | timestamp with time zone | NO | now() |
| videos | synced_at | timestamp with time zone | NO | now() |
| watch_progress | id | bigint | NO | nextval('watch_progress_id_seq'::regclass) |
| watch_progress | video_id | text | NO | null |
| watch_progress | position_sec | integer | NO | 0 |
| watch_progress | duration_sec | integer | YES | null |
| watch_progress | completed | boolean | NO | false |
| watch_progress | last_watched | timestamp with time zone | NO | now() |

# Platea + Dashboard — Migrazione llv → pchld

> Scritto: 2026-07-12 (Sessione #21, appendice) — per la sessione dedicata (Opus).
> Obiettivo: spostare tutto ciò che vive su `llvqoiyvzloloobjiloe` (altro account Supabase,
> invisibile all'MCP) dentro `pchldmiavycxzpkzochn` (progetto principale della suite),
> PRIMA della build EAS di Platea, così una build sola incorpora env nuove + revisione #18.
> Leggere prima: `MANUALE-OPERATIVO.md` + skill `supabase-commonplace`, `sicurezza-api-key`,
> `commit-suite`, `deploy-suite`.

## Contesto verificato (2026-07-12, via REST con anon key di `Platea/.env`)

- `llv` è VIVO e ATTIVO (REST 200) ma su un ALTRO account/org: l'MCP vede solo pchld e bogav.
  Stefano ha le credenziali dell'account llv (servono solo per Fase 0, non per i dati).
- **Chi usa llv oggi:**
  - Platea (app Expo, build VECCHIA sul telefono): tutte le tabelle video + cp legacy
    (la build vecchia scrive ANCORA cp_items/cp_log su llv: 1+1 righe del 2026-06-10).
  - Dashboard v2 (`Dashboard/index.html`, client `sb2` righe ~124-128): solo `cp_items`+`cp_log`.
  - NoteS: dropdown "Collega a item" legge `cp_items` da llv (nota #18).
  - cp-backup (`Backup/api/backup.js`): sezione llv via `SUPABASE_LLV_SERVICE_KEY`.
  - cron-job.org: keep-alive settimanale che invoca la Edge Function `sync-videos`.
- **Inventario tabelle llv** (conteggi 2026-07-12; TUTTO leggibile con sola anon key):

| Tabella | Righe | Da migrare? | Note |
|---|---|---|---|
| `videos` | 11.390 | sì (export, NON resync) | catalogo; export REST paginato basta |
| `channels` | 37 | sì | CONFIGURAZIONE del catalogo — senza, sync non sa cosa sincronizzare |
| `carousels` | 40 | sì | configurazione home |
| `carousel_videos` | 0 | solo schema | |
| `saved_videos` | 8 | sì | id serial → riallineare sequence |
| `watch_progress` | 10 | sì | id serial → riallineare sequence |
| `pl_playlists` / `pl_playlist_videos` | 0 | solo schema | DDL già in `supabase/playlists-migration.sql` |
| `sync_log` | 286 | facoltativo (consiglio: solo schema) | rigenerabile |
| `continue_watching` | vista | ricreare la VISTA | DDL da recuperare (Fase 0) |
| `cp_items` / `cp_log` (llv) | 1 + 1 | sì, upsert su pchld | scritte dalla build vecchia; pchld ha già il layer unificato |
| RPC `search_videos` | — | ricreare | DDL da recuperare (Fase 0) |

- **pchld oggi** (verificato via MCP `list_tables`): 23 tabelle, tutte con RLS; nessun
  conflitto di nomi con il set video; `cp_items`/`cp_log`/`cp_quotes` già presenti.
- **Postura RLS di llv**: tabelle leggibili E scrivibili con anon key (Platea non ha login).
  Su pchld va REPLICATA SOLO per il set video (vedi Fase 1) — non toccare le tabelle esistenti.

## Fase 0 — Prerequisiti (Stefano, ~15 min sul dashboard llv)

> **✅ FASE 0 COMPLETATA (2026-07-12 sera).** Tutto in `supabase/llv-schema-2026-07-12.md`:
> colonne, vista `continue_watching`, RPC `search_videos`, enum `video_source` +
> `content_category` (verbatim dal SQL editor llv, con note d'ordine per la Fase 1).
> **0.2 ✅** YouTube key recuperata (la custodisce Stefano — MAI in git/chat, va nei
> secrets della Edge Function in Fase 3). **0.3 ✅** sezione llv verificata in
> `latest.json` (conteggi identici al REST). Bonus scoperto durante la verifica:
> `dnd_saves` mancava dal backup → aggiunta a `Backup/api/backup.js` e deployata
> (conferma nel backup di domattina); notato anche `backup-2026-07-11.json` assente
> (cron ha saltato un giorno — da tenere d'occhio).
> **Si parte dalla Fase 1** — il dashboard llv non serve più fino alla Fase 3 (secrets).

1. Dal SQL editor di llv, eseguire **UNA QUERY ALLA VOLTA** (l'editor Supabase mostra
   solo il risultato dell'ULTIMO statement: eseguite in blocco si perde tutto tranne
   l'ultima — è successo il 2026-07-12) e salvare i quattro output:
   ```sql
   -- (a) vista continue_watching
   select pg_get_viewdef('continue_watching'::regclass, true);
   ```
   ```sql
   -- (b) RPC search_videos
   select pg_get_functiondef(p.oid) from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='search_videos';
   ```
   ```sql
   -- (c) valori degli ENUM (colonne source/category sono USER-DEFINED)
   select t.typname, e.enumlabel
     from pg_type t join pg_enum e on e.enumtypid = t.oid
    order by t.typname, e.enumsortorder;
   ```
   ```sql
   -- (d) DDL colonne di tutte le tabelle — ✅ GIÀ FATTO: supabase/llv-schema-2026-07-12.md
   select table_name, column_name, data_type, is_nullable, column_default
     from information_schema.columns
    where table_schema='public' order by table_name, ordinal_position;
   ```
2. Recuperare `YOUTUBE_API_KEY` (secrets della Edge Function su llv, oppure Google Cloud console).
3. Verificare che `latest.json` nel repo commonplace-backups abbia la sezione llv popolata
   (fallback dati; documentata dal #19, mai riverificata).

## Fase 1 — Schema su pchld (MCP `apply_migration`)

- Creare: `videos`, `channels`, `carousels`, `carousel_videos`, `saved_videos`,
  `watch_progress`, `sync_log`, `pl_playlists`, `pl_playlist_videos` (queste ultime due:
  DDL in `Platea/supabase/playlists-migration.sql`), vista `continue_watching`,
  RPC `search_videos` — DDL dalla Fase 0.
- **RLS: abilitarla comunque** su tutte, con policy esplicite `to anon, authenticated`
  (select su tutto il set; insert/update/delete solo su `saved_videos`, `watch_progress`,
  `pl_playlists`, `pl_playlist_videos`). Scelta consapevole e documentata: Platea non ha
  login; il perimetro anon resta confinato al set video, NESSUNA policy anon sulle tabelle
  utente esistenti. La `service_role` della sync bypassa la RLS comunque.
- Dopo gli ALTER/CREATE: `NOTIFY pgrst, 'reload schema';`

## Fase 2 — Dati

- Export da llv via REST paginato (anon key, `Range` o `offset`, 1000/pagina → ~12 pagine
  per `videos`) → insert su pchld via MCP `execute_sql` a batch.
  ⚠️ Gotcha noti dalla migrazione Digest: PS 5.1 `Invoke-RestMethod` collassa gli array
  (usare Node, o assegnare a variabile poi `@($var)`); niente stringhe giganti in un solo
  statement.
- Riallineare le sequence di `saved_videos`/`watch_progress`:
  `select setval(pg_get_serial_sequence('saved_videos','id'), (select max(id) from saved_videos));`
- Upsert su pchld delle righe cp legacy di llv (id `pl_*`, `user_id` NULL — ammesse per design).
- Verifica: conteggi identici llv↔pchld tabella per tabella.

## Fase 3 — Edge Function `sync-videos`

- Sorgente locale: `Platea/supabase/functions/sync-videos/index.ts` (v6, #18 — uploads
  playlist, errori propagati). Deploy su pchld via MCP `deploy_edge_function`.
- Secret `YOUTUBE_API_KEY` (da Fase 0). `SUPABASE_URL`/`SERVICE_ROLE_KEY` le inietta Supabase.
- Test manuale: invocarla e controllare `sync_log` su pchld (righe nuove, `status=ok`).
- Repoint del cron su cron-job.org: URL funzione pchld (tiene anche il ruolo di keep-alive,
  che su pchld comunque non serve — il progetto è usato ogni giorno).

## Fase 4 — Client Platea

- `Platea/.env`: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` → pchld
  (la anon key pchld è già hardcoded in `src/lib/cp.ts` riga 19).
- Semplificazione ora possibile: `cp.ts` può usare il client principale di `supabase.ts`
  (stesso progetto) — eliminare client secondario e CP_KEY hardcoded.
- ⚠️ Copiare OGNI file toccato anche in `C:\VideoS\` (trappola nota: è la cartella build EAS).
- `npx tsc --noEmit` pulito prima di chiudere.

## Fase 5 — Dashboard e NoteS

- `Dashboard/index.html`: eliminare `sb2` (llv), leggere `cp_items`/`cp_log` da `sb1` (pchld).
  Repo ANNIDATO: commit da dentro `Dashboard/`. Deploy con `deploy_dashboard.bat`
  (⚠️ solo con autorizzazione esplicita di Stefano).
- NoteS: trovare il dropdown "Collega a item" (repo annidato `NoteS/`) e puntarlo a pchld
  `cp_items`. Stesso protocollo: commit annidato + deploy autorizzato.

## Fase 6 — Build EAS Platea

- Quota permettendo: build EAS da `C:\VideoS` — incorpora env pchld + revisione #18
  (sync v6, playlist, robustezza) ferma da giugno. Niente expo-updates: senza build
  nuova il telefono continua a usare llv.
- Verifica post-build sul telefono: home popolata, ricerca (RPC), ♥ salvati, resume
  progress, playlist, e che cp_items su pchld riceva righe `pl_*` nuove.

## Fase 7 — Dismissione llv (SOLO a build verificata)

- ⚠️ Finché la build vecchia è installata, il telefono SCRIVE ancora su llv: prima della
  dismissione ricopiare i delta (`watch_progress`, `saved_videos`, cp) llv→pchld.
- cp-backup: rimuovere sezione llv + env `SUPABASE_LLV_SERVICE_KEY` da `Backup/api/backup.js`,
  aggiungere le tabelle video di pchld all'elenco pchld (o escludere `videos`/`sync_log`
  come rigenerabili, coerente col #19). Redeploy cp-backup, verificare il backup del giorno dopo.
- Spegnere il cron keep-alive llv su cron-job.org.
- Mettere in PAUSA il progetto llv (NON cancellare: rollback ~2 settimane), poi valutare
  la cancellazione.
- Aggiornare `Commonplace.md` (sezioni Platea/Dashboard/infrastruttura + skill
  `supabase-commonplace`: llv → dismesso) + diario di sessione.

## Rischi e mitigazioni

- **Doppia scrittura durante la transizione** (build vecchia → llv): accettata, si riallinea
  in Fase 7 col delta. Finestra breve se la build segue subito.
- **DDL vista/RPC sconosciuti** finché non arriva l'output di Fase 0: non improvvisare —
  senza `search_videos` identica la ricerca cambia comportamento.
- **Quota YouTube**: non serve resync (i dati si esportano); il primo sync su pchld è
  incrementale sul catalogo già importato.
- **Anon-write su pchld**: perimetro limitato al set video; rivalutare se un giorno Platea
  avrà login (allora: user_id + policy standard).
- **EAS quota/build fallita**: llv resta intatto fino a Fase 7 — rollback = non fare nulla.

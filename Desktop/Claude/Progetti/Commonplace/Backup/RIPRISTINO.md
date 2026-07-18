# Ripristino dai backup cp-backup — procedura TESTATA

> Scritta e **collaudata il 2026-07-12** (Sessione #21): 2 righe di `bs_collections`
> ripristinate da `latest.json` in una tabella-cavia su pchld e confrontate al byte
> con l'originale (`to_jsonb(z) = to_jsonb(b)`) — identiche. Upsert idempotente
> verificato (doppio ripristino: nessun duplicato, nessun errore). Il metodo di
> verifica ha dimostrato di rilevare anche una discrepanza reale introdotta per errore.
> Un backup non testato è una speranza: questo è stato testato.

## Da dove si ripristina

- Repo privato **`github.com/Olengard/commonplace-backups`** (credenziali git già sul
  PC di Stefano): `latest.json` + giornalieri `backups/backup-AAAA-MM-GG.json`.
- Struttura del JSON: `projects.pchld.<tabella>` e `projects.llv.<tabella>` = array di
  righe così come le restituisce PostgREST (`select=*`). Una tabella in errore ha
  invece `{"_error": "HTTP NNN"}` — controllare PRIMA che la tabella da ripristinare
  sia un array (è successo: sezione digest in 401 per un mese, #21).
- ⚠️ Il backup NON contiene: `videos`/`sync_log` (rigenerabili con sync-videos),
  niente di Zeitgeist, e gli utenti auth. **Ledger (bogav) è incluso dal 2026-07-18**
  (primo backup con sezione `projects.bogav`: 2026-07-19) — per il SUO ripristino vedi
  la sezione dedicata in fondo: i trigger dei saldi cambiano la procedura.
  `dnd_saves` c'è solo dal 2026-07-13 (aggiunta in #21). La sezione `llv` esiste SOLO
  nei backup fino al 2026-07-17 (Fase 7): da allora le tabelle video di Platea
  (`channels`, `carousels`, `carousel_videos`, `saved_videos`, `watch_progress`, `pl_*`)
  stanno sotto `projects.pchld` come tutto il resto.

## Procedura per UNA tabella (il caso comune: dati cancellati/corrotti per errore)

1. **Scarica il backup** (in una cartella temporanea, MAI dentro il workspace):
   ```bash
   git clone --depth 1 https://github.com/Olengard/commonplace-backups.git
   ```
2. **Estrai le righe** della tabella (Node, evita i gotcha JSON di PowerShell 5.1):
   ```bash
   node -e "const b=require('./commonplace-backups/latest.json');
     const r=b.projects.pchld.NOME_TABELLA;
     if(!Array.isArray(r)) throw new Error('tabella in errore nel backup: '+JSON.stringify(r));
     require('fs').writeFileSync('righe.json', JSON.stringify(r));
     console.log(r.length+' righe')"
   ```
3. **PRIMA di toccare la tabella vera: prova in cavia** (via MCP `execute_sql` su pchld,
   che è admin e bypassa la RLS — è il canale giusto per un ripristino):
   ```sql
   create table zz_restore_test (like NOME_TABELLA including all);
   insert into zz_restore_test
   select * from jsonb_populate_recordset(null::zz_restore_test, '<CONTENUTO righe.json>'::jsonb)
   on conflict (id) do update set  -- elenca TUTTE le colonne tranne id:
     colonna1=excluded.colonna1, colonna2=excluded.colonna2 /* , ... */;
   -- verifica il conteggio e, se la tabella vera è ancora sana, il confronto stretto:
   select count(*) from zz_restore_test;
   drop table zz_restore_test;
   ```
4. **Ripristino vero**: stesso insert…on conflict sulla tabella reale. L'upsert è
   idempotente: rieseguirlo non duplica. Le righe presenti solo nel DB (nate DOPO il
   backup) NON vengono toccate — il ripristino riporta indietro solo ciò che è nel JSON.
   Se invece serve lo stato ESATTO del backup (cancellare anche le righe successive),
   farlo esplicitamente e con Stefano: `delete from NOME_TABELLA where id not in (...)`.
5. **Tabelle con id seriale** (`saved_videos`, `watch_progress`, `sync_log`): dopo il
   ripristino riallinea la sequence:
   ```sql
   select setval(pg_get_serial_sequence('NOME_TABELLA','id'),
                 coalesce((select max(id) from NOME_TABELLA), 1));
   ```
6. **Ordine FK** se ripristini più tabelle: prima le referenziate.
   pchld: `notes` → `todos`/`quotes`; `cp_items` → `cp_log`; `channels` → `videos` →
   (`saved_videos`, `watch_progress`, `carousel_videos`); `pl_playlists` → `pl_playlist_videos`;
   `carousels` → `carousel_videos`. Le `bs_*`/`fn_books`/`ls_*`/`sl_*`/`dg_*`/`dnd_saves`
   sono indipendenti tra loro.
7. **`user_id` si conserva da solo**: il canale admin scrive i valori del backup così
   come sono (incluse le righe NULL di Platea — NON "ripulirle", sono legittime).
   ⚠️ MAI ripristinare via REST con la anon key: la RLS filtrerebbe/rifiuterebbe righe.
   L'alternativa REST è legittima solo con la service_role key (env di cp-backup su
   Vercel), header `Prefer: resolution=merge-duplicates`.

## Disastro totale (progetto Supabase perso)

1. Ricreare lo schema PRIMA dei dati — le fonti DDL affidabili:
   `Platea/supabase/llv-schema-2026-07-12.md` (set video completo: enum, tabelle, vista,
   RPC), `Marginalia/cp_quotes-migration.sql`, `cp-layer-2026-06.sql`,
   `ListenS/ls_migration_2026-06.sql`, `NoteS/supabase/*.sql`, `Ledger/sql/*`.
   Per le tabelle senza SQL in repo: schema ricavabile dalle chiavi del JSON di backup
   + `information_schema` di un backup del progetto, e RLS da riscrivere (policy
   `user_id = auth.uid()`, vedi skill `supabase-commonplace`).
2. Gli utenti auth NON sono nel backup: si ricreano a mano (2 utenti: Olengard, Manu)
   e i NUOVI uuid vanno sostituiti nei `user_id` del JSON prima del ripristino.
3. Poi procedura per-tabella come sopra, in ordine FK.

## Ripristino LEDGER (bogav) — ⚠️ procedura DIVERSA per via dei trigger

Da luglio 2026 `accounts.balance` e `benefit_budgets.used_amount` sono mantenuti da
**trigger Postgres** su `transactions`/`transfers`/`meal_voucher_usages`/
`benefit_conversions` (vedi `Ledger/CLAUDE.md`). Un INSERT di ripristino con i trigger
attivi APPLICHEREBBE DI NUOVO i delta sopra saldi già ripristinati dal backup →
**doppio conteggio silenzioso**. Procedura corretta (via MCP `execute_sql` su bogav,
che è admin):

```sql
-- 1. Trigger utente SPENTI sulle 4 tabelle con effetti sui saldi
alter table transactions        disable trigger user;
alter table transfers           disable trigger user;
alter table meal_voucher_usages disable trigger user;
alter table benefit_conversions disable trigger user;

-- 2. Ripristino per-tabella (procedura generale sopra), in quest'ordine FK:
--    categories, payment_methods, accounts, benefit_budgets, budgets,
--    recurring_transactions → poi transactions, transfers, benefit_conversions,
--    meal_voucher_usages, investment_updates.
--    I SALDI arrivano dal backup (accounts.balance, benefit_budgets.used_amount):
--    coi trigger spenti restano esattamente quelli.

-- 3. Trigger RIACCESI (obbligatorio, verificare!)
alter table transactions        enable trigger user;
alter table transfers           enable trigger user;
alter table meal_voucher_usages enable trigger user;
alter table benefit_conversions enable trigger user;
select tgrelid::regclass, tgname, tgenabled from pg_trigger
 where not tgisinternal and tgrelid::regclass::text in
 ('transactions','transfers','meal_voucher_usages','benefit_conversions');
-- tgenabled deve essere 'O' (origin) per tutti

-- 4. Collaudo trigger: eseguire Ledger/sql/trigger_tests.sql nel SQL editor —
--    successo = eccezione finale LEDGER_TESTS_PASSED (fa rollback da sola).
```

Nota: i saldi possono già contenere drift storico pre-trigger (documentato nel
CLAUDE.md di Ledger) — dopo un ripristino la riconciliazione ⚖️ per conto resta
il giudice finale, come nell'uso normale.

## Manutenzione di questo documento

- Se cambi lo schema di una tabella backuppata, un backup VECCHIO su schema NUOVO va
  sempre riprovato in cavia. Semantica di `jsonb_populate_recordset`: chiavi del JSON
  che non esistono più come colonne → ignorate in silenzio; colonne nuove assenti dal
  JSON → valorizzate NULL **esplicito** (attenzione: NULL esplicito scavalca i DEFAULT
  e fa fallire i NOT NULL — in quel caso elencare le colonne nell'insert).
- Ogni tabella nuova va aggiunta a `Backup/api/backup.js` (lezione `dnd_saves`, #21:
  tabella nata a luglio, mai backuppata fino al fix).

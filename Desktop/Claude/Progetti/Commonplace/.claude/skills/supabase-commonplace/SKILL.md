---
name: supabase-commonplace
description: Lavorare con i database Supabase della suite. Usa per qualsiasi lavoro su dati, schema, tabelle, auth, RLS, migration SQL, o quando un'app non carica/salva dati. Attivazione esatta - stai per leggere o modificare lo schema, eseguire SQL, diagnosticare un problema di sync/login, o un documento cita una migration "da eseguire".
---

# Supabase nella suite Commonplace

## Mappa dei progetti

| Progetto | Ruolo | Tabelle (prefissi) |
|---|---|---|
| `pchldmiavycxzpkzochn` ("NoteS") | **Progetto principale della suite** | `bs_*` (BookShelf), `fn_books` (Footnote), `ls_*` (ListenS), `sl_*` (Syllabus), `dnd_saves` (DnDMaster), `cp_items`/`cp_log`/`cp_quotes` (layer unificato + Marginalia), tabelle NoteS |
| `llvqoiyvzloloobjiloe` | Platea + cp legacy + Dashboard v2 | ⚠️ VIVO e ATTIVO (verificato 2026-07-12: REST 200 con anon key) ma su un **ALTRO account/org Supabase** — l'MCP non lo vede (org "Anonima Olengatta" = solo pchld e bogav, 2 slot free pieni). Dashboard: chiedere a Stefano quale account è. Niente MCP: si lavora via REST con la anon key (in `Platea/.env`) o dal suo SQL editor. Piano di migrazione a pchld pronto: `Platea/piano-migrazione-pchld.md` (da eseguire PRIMA della build EAS) |
| `bogavweypmgyxwmdpsqm` | **Ledger** (verificato 2026-07-11 via MCP) | `accounts`, `transactions`, `transfers`, `budgets`, `categories`, `payment_methods`, `recurring_transactions`, `meal_voucher_usages`, `benefit_*`, `investment_updates` |

Auth: email+password unificata sulla suite (stesso account su `pchld…`). RLS attiva ovunque
con policy `user_id = auth.uid()`.

## Quando NON usare questa skill

- Per la logica dei saldi Ledger: quella è governata da **trigger Postgres** documentati nel
  `Ledger/CLAUDE.md` — leggilo, e NON aggiungere delta client-side (doppio conteggio).
- Per eseguire una migration che i documenti danno "da fare" senza prima verificare:
  la documentazione è spesso indietro (la migration ListenS di giugno risultava "da fare"
  ed era già eseguita).

## Procedura

1. **Verifica lo stato reale prima di credere ai documenti**: `list_tables` /
   `information_schema.columns` via MCP dicono la verità sullo schema.
2. Modifiche allo schema → `apply_migration` (MCP) o SQL editor del dashboard; i file SQL
   di riferimento vivono nelle cartelle delle app (`ls_migration_2026-06.sql`,
   `cp-layer-2026-06.sql`, `Marginalia/cp_quotes-migration.sql`, `Ledger/sql/*`).
3. Dopo ogni `ALTER TABLE` su `pchld…`: `NOTIFY pgrst, 'reload schema';` (la schema cache
   PostgREST è storicamente capricciosa — per questo Syllabus usa `raw_data jsonb` come
   fonte primaria).
4. Nuove tabelle: SEMPRE con RLS e policy `user_id = auth.uid()`; `user_id` impostato
   client-side ma imposto dalla RLS.
5. Problema di connettività/dati vuoti → prima ipotesi: **progetto in pausa** (free tier,
   7 giorni di inattività). ⚠️ Il vecchio segnale "il DNS non risolve" NON è più
   affidabile (verificato 2026-07-12: il DNS Cloudflare risolve comunque) — test giusto:
   `curl -s https://<project>.supabase.co/rest/v1/` → `401 "No API key"` = progetto VIVO;
   timeout/HTTP 000 o messaggio "paused" = dorme. Restore dal dashboard, poi verificare
   il keep-alive su cron-job.org.
6. Dati persi/corrotti → **`Backup/RIPRISTINO.md`**: procedura di ripristino dai backup
   giornalieri, testata il 2026-07-12 (cavia prima, mai direttamente sui dati veri).

## Comandi

```sql
-- schema reale di una tabella (via MCP execute_sql, project_id pchldmiavycxzpkzochn)
select column_name from information_schema.columns
 where table_name = 'ls_podcasts' order by ordinal_position;

-- dopo ogni ALTER
NOTIFY pgrst, 'reload schema';
```

```bash
# progetto in pausa? Il DNS non risolve:
nslookup pchldmiavycxzpkzochn.supabase.co
```

Test trigger Ledger: `Ledger/sql/trigger_tests.sql` nel SQL editor — successo =
eccezione finale `LEDGER_TESTS_PASSED` (fa rollback da solo, nessuna traccia).

## Barra di qualità

- Ogni affermazione sullo schema è verificata con una query, non dedotta dai documenti.
- Ogni migration eseguita è annotata in Commonplace.md con data e progetto.
- RLS mai disattivata, nemmeno "temporaneamente".

## Checklist di verifica

- [ ] Progetto giusto? (pchld vs llv vs Ledger — sbagliare progetto = dati fantasma)
- [ ] Schema verificato prima e dopo la modifica?
- [ ] RLS e policy presenti sulle tabelle nuove?
- [ ] `NOTIFY pgrst` eseguito dopo gli ALTER?
- [ ] Migration annotata nel diario?

## Errori comuni

- Diagnosticare "bug dell'app" quando il progetto è solo in pausa (è la causa madre
  storica dell'"impermanenza" di Platea).
- Rieseguire una migration già applicata perché un documento la dava "da fare".
- Usare la `service_role` key lato client o committarla (vedi `sicurezza-api-key`).
- Dimenticare che `cp_items` ha righe con `user_id NULL` ammesse (Platea senza login):
  non "ripulirle" come orfane.
- Toccare `accounts.balance` di Ledger dal client per operazioni coperte dai trigger.

## Cosa segnalare a Stefano

- Lo stato del progetto `llv…` se ci lavori (esiste ancora? su quale account?).
- Qualsiasi tabella trovata senza RLS.
- Migration eseguite (data, progetto, file SQL).
- Drift tra documentazione e schema reale che hai scoperto.
